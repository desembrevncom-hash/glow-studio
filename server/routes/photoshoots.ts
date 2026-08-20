import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { buildPrompt } from "../services/promptBuilder";
import { photoshootRepository, PhotoshootJob } from "../services/photoshootRepository";
import { storageService } from "../services/storageService";

const router = Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
let isGenerating = false;

// Safe error logging without leaking secrets
function logGeminiError(error: any) {
  const safeError = {
    name: error?.name,
    message: error?.message,
    status: error?.status,
    requestId: error?.response?.headers?.get?.('x-request-id') || 'unknown'
  };
  console.error("Gemini API Error:", JSON.stringify(safeError));
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || "",
  });
}

interface GenerateParams {
  images: { data: string; mimeType: string }[];
  presetId?: string;
  aspectRatio?: string;
  outputQuality?: string;
  sessionId?: string;
  secondaryRole?: any;
  compositionMode?: any;
  secondaryScale?: string;
  secondaryPlacement?: string;
  isVariation?: boolean;
  originalJobId?: string;
}

// Core execution engine for generation, re-render, and variation
async function processPhotoshootGeneration(params: GenerateParams) {
  const startTime = Date.now();
  const sessionId = params.sessionId || 'default_anonymous_session';
  const finalPresetId = params.presetId || 'premium_bright_studio';
  const inputAspectRatio = params.aspectRatio || '1:1';
  const inputQuality = params.outputQuality || '2k';
  const hasSecondaryReference = params.images.length > 1;
  const secondaryRole = params.secondaryRole || (hasSecondaryReference ? 'packaging' : undefined);
  const compositionMode = params.compositionMode || (hasSecondaryReference ? 'product_with_packaging' : 'single_product');

  // Validate images
  for (const img of params.images) {
    const mime = img.mimeType || "image/png";
    if (!ALLOWED_TYPES.includes(mime)) {
      throw { status: 400, error: `Định dạng ảnh không hợp lệ (${mime}). Hỗ trợ: PNG, JPG, JPEG, WebP.`, code: "INVALID_IMAGE" };
    }
    
    const base64Length = img.data.split(',').pop()?.length || 0;
    const sizeBytes = (base64Length * 3) / 4;
    if (sizeBytes > MAX_FILE_SIZE) {
      throw { status: 400, error: "Kích thước ảnh vượt quá 10MB.", code: "INVALID_IMAGE" };
    }
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw { status: 500, error: "Server chưa cấu hình GEMINI_API_KEY.", code: "MISSING_API_KEY" };
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-image";
  const promptText = buildPrompt({
    presetId: finalPresetId,
    hasSecondaryReference,
    secondaryRole,
    compositionMode,
    secondaryScale: params.secondaryScale,
    secondaryPlacement: params.secondaryPlacement,
    isVariation: params.isVariation
  });

  // Store input images
  const mainImageUrl = await storageService.uploadInputImage(params.images[0].data, {
    sessionId,
    type: 'input',
    mimeType: params.images[0].mimeType
  });

  let packagingImageUrl: string | undefined = undefined;
  if (hasSecondaryReference) {
    packagingImageUrl = await storageService.uploadInputImage(params.images[1].data, {
      sessionId,
      type: 'packaging',
      mimeType: params.images[1].mimeType
    });
  }

  const mode = params.isVariation ? 'variation' : (params.originalJobId ? 'rerender' : 'default');

  // Create initial job in repository
  const initialJob = await photoshootRepository.createJob({
    sessionId,
    status: 'PROCESSING',
    presetId: finalPresetId,
    aspectRatio: inputAspectRatio,
    outputQuality: inputQuality,
    model,
    mainImageUrl,
    packagingImageUrl,
    promptText,
    originalJobId: params.originalJobId,
    mode,
    secondaryRole,
    compositionMode,
    secondaryScale: params.secondaryScale,
    secondaryPlacement: params.secondaryPlacement
  });

  const ai = getGeminiClient();

  const parts = params.images.map((img) => {
    let rawBase64 = img.data;
    if (rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }
    return {
      inlineData: {
        data: rawBase64,
        mimeType: img.mimeType || "image/png",
      },
    };
  });

  // Map frontend aspect ratio to Gemini supported ratio
  let geminiAspectRatio = "1:1";
  if (inputAspectRatio === "1:1") geminiAspectRatio = "1:1";
  if (inputAspectRatio === "4:5") geminiAspectRatio = "3:4";
  if (inputAspectRatio === "9:16") geminiAspectRatio = "9:16";
  if (inputAspectRatio === "16:9") geminiAspectRatio = "16:9";

  const is2K = inputQuality === "2k";
  let resultImageUrl: string | null = null;
  let attempt = 0;
  const maxRetries = 2;

  while (attempt <= maxRetries) {
    try {
      if (attempt === 1) await new Promise(r => setTimeout(r, 2000));
      if (attempt === 2) await new Promise(r => setTimeout(r, 5000));

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT_ERROR")), 90000);
      });

      const imageConfig: any = { aspectRatio: geminiAspectRatio };
      if (!model.includes('lite') && is2K) {
        imageConfig.imageSize = "2K";
      }
      const config = { imageConfig };

      const responsePromise = ai.models.generateContent({
        model,
        contents: { parts: [...parts, { text: promptText }] },
        config,
      });

      const response = await Promise.race([responsePromise, timeoutPromise]) as any;

      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.finishReason === "SAFETY") {
          throw {
            status: 400,
            error: "AI từ chối xử lý hình ảnh này vì lý do an toàn nội dung (Safety). Vui lòng thử hình ảnh khác.",
            code: "INVALID_IMAGE"
          };
        }

        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
              const mime = part.inlineData.mimeType || "image/png";
              resultImageUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      }

      if (resultImageUrl) break;
      throw new Error("EMPTY_RESPONSE");
    } catch (err: any) {
      if (err.code === "INVALID_IMAGE" || err.status === 400) {
        await photoshootRepository.updateJob(initialJob.id, {
          status: 'FAILED',
          errorCode: err.code || 'INVALID_IMAGE',
          errorMessage: err.error || err.message
        });
        throw err;
      }

      const errMsg = err?.message || String(err);
      
      if (errMsg === "TIMEOUT_ERROR") {
        await photoshootRepository.updateJob(initialJob.id, {
          status: 'FAILED',
          errorCode: 'TIMEOUT',
          errorMessage: "Yêu cầu tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại với ảnh nhẹ hơn."
        });
        throw { status: 504, error: "Yêu cầu tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại với ảnh nhẹ hơn.", code: "TIMEOUT" };
      }

      logGeminiError(err);
      
      const status = err?.status || err?.code;
      const isSpendCapExceeded = errMsg.toLowerCase().includes("spending cap") || errMsg.toLowerCase().includes("spend cap");
      const isInvalidKey = status === 401 || status === 403 || errMsg.includes("API key not valid") || errMsg.includes("Permission denied") || errMsg.includes("API_KEY_INVALID");
      const isRateLimit = !isSpendCapExceeded && (status === 429 || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("limit: 0"));
      const isServerError = (typeof status === "number" && status >= 500) ||
        status === "UNAVAILABLE" || status === "503" ||
        errMsg.includes("500") || errMsg.includes("503") || errMsg.includes("INTERNAL") || errMsg.includes("UNAVAILABLE") || errMsg.includes("overloaded") || errMsg.includes("unavailable");

      if (isSpendCapExceeded) {
        await photoshootRepository.updateJob(initialJob.id, {
          status: 'FAILED',
          errorCode: 'SPEND_CAP_EXCEEDED',
          errorMessage: "Dự án đã đạt hạn mức chi tiêu hàng tháng."
        });
        throw {
          status: 429,
          error: "Dự án của bạn đã đạt hạn mức chi tiêu hàng tháng (Monthly Spend Cap). Vui lòng điều chỉnh hạn mức tại https://ai.studio/spend để tiếp tục.",
          code: "SPEND_CAP_EXCEEDED",
          spendUrl: "https://ai.studio/spend"
        };
      }

      if (isInvalidKey) {
        await photoshootRepository.updateJob(initialJob.id, {
          status: 'FAILED',
          errorCode: 'INVALID_API_KEY',
          errorMessage: "API key không hợp lệ hoặc chưa được cấp quyền."
        });
        throw { status: 401, error: "API key không hợp lệ hoặc chưa được cấp quyền.", code: "INVALID_API_KEY" };
      }

      if (isRateLimit || isServerError) {
        if (attempt < maxRetries) {
          attempt++;
          continue;
        }
        await photoshootRepository.updateJob(initialJob.id, {
          status: 'FAILED',
          errorCode: isRateLimit ? 'RATE_LIMIT' : 'UNKNOWN_ERROR',
          errorMessage: isRateLimit ? "Hệ thống AI đang bận." : "Hệ thống AI gặp lỗi hoặc quá tải."
        });
        if (isRateLimit) {
          throw { status: 429, error: "Hệ thống AI đang bận. Vui lòng đợi 30 giây rồi thử lại.", code: "RATE_LIMIT", retryAfterSeconds: 30 };
        }
        throw { status: 503, error: "Hệ thống AI gặp lỗi hoặc quá tải. Vui lòng thử lại.", code: "UNKNOWN_ERROR" };
      }

      await photoshootRepository.updateJob(initialJob.id, {
        status: 'FAILED',
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: errMsg
      });
      throw { status: 400, error: errMsg || "Yêu cầu không hợp lệ.", code: "UNKNOWN_ERROR" };
    }
  }

  if (!resultImageUrl) {
    await photoshootRepository.updateJob(initialJob.id, {
      status: 'FAILED',
      errorCode: 'GEMINI_EMPTY_RESULT',
      errorMessage: "Không nhận được dữ liệu hình ảnh trả về từ AI."
    });
    throw { status: 500, error: "Không nhận được dữ liệu hình ảnh trả về từ AI.", code: "GEMINI_EMPTY_RESULT" };
  }

  const durationMs = Date.now() - startTime;
  const storedResultUrl = await storageService.uploadGeneratedImage(resultImageUrl, {
    jobId: initialJob.id,
    sessionId,
    type: 'generated'
  });

  const completedJob = await photoshootRepository.updateJob(initialJob.id, {
    status: 'COMPLETED',
    resultImageUrl: storedResultUrl,
    durationMs
  });

  return {
    success: true,
    jobId: completedJob?.id || initialJob.id,
    imageUrl: storedResultUrl,
    metadata: {
      mode,
      originalJobId: params.originalJobId,
      presetId: finalPresetId,
      aspectRatio: inputAspectRatio,
      outputQuality: inputQuality,
      model,
      durationMs,
      secondaryRole,
      compositionMode,
      secondaryScale: params.secondaryScale,
      secondaryPlacement: params.secondaryPlacement
    }
  };
}

// 1. GET /api/photoshoots/history?sessionId=...
router.get("/photoshoots/history", async (req, res) => {
  try {
    const sessionId = (req.query.sessionId as string) || 'default_anonymous_session';
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const jobs = await photoshootRepository.getJobsBySessionId(sessionId, limit);
    return res.json({ success: true, jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Không thể tải lịch sử render." });
  }
});

// 2. GET /api/photoshoots/:id
router.get("/photoshoots/:id", async (req, res) => {
  try {
    const job = await photoshootRepository.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: "Không tìm thấy photoshoot job." });
    }
    return res.json({ success: true, job });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Lỗi khi truy vấn photoshoot job." });
  }
});

// 3. POST /api/photoshoots - Create New Photoshoot
const generateHandler = async (req: any, res: any) => {
  if (isGenerating) {
    return res.status(429).json({
      error: "Một yêu cầu tạo ảnh đang được xử lý. Vui lòng chờ hoàn tất.",
      code: "REQUEST_IN_PROGRESS"
    });
  }

  isGenerating = true;

  try {
    const {
      images,
      presetId,
      aspectRatio,
      outputQuality,
      sessionId,
      secondaryRole,
      compositionMode,
      secondaryScale,
      secondaryPlacement
    } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Vui lòng tải lên ít nhất 1 hình ảnh sản phẩm.", code: "INVALID_IMAGE" });
    }

    const result = await processPhotoshootGeneration({
      images,
      presetId,
      aspectRatio,
      outputQuality,
      sessionId,
      secondaryRole,
      compositionMode,
      secondaryScale,
      secondaryPlacement
    });

    return res.json(result);
  } catch (error: any) {
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.error || error?.message || "Đã xảy ra lỗi không xác định trong quá trình xử lý.",
      code: error?.code || "UNKNOWN_ERROR",
      retryAfterSeconds: error?.retryAfterSeconds,
      spendUrl: error?.spendUrl
    });
  } finally {
    isGenerating = false;
  }
};

router.post("/photoshoots", generateHandler);
router.post("/generate-photoshoot", generateHandler); // Backward compatibility
router.post("/generate", generateHandler);

// 4. POST /api/photoshoots/:id/rerender - Re-render existing photoshoot
router.post("/photoshoots/:id/rerender", async (req: any, res: any) => {
  if (isGenerating) {
    return res.status(429).json({
      error: "Một yêu cầu tạo ảnh đang được xử lý. Vui lòng chờ hoàn tất.",
      code: "REQUEST_IN_PROGRESS"
    });
  }

  isGenerating = true;

  try {
    const originalJob = await photoshootRepository.getJobById(req.params.id);
    if (!originalJob) {
      return res.status(404).json({ error: "Không tìm thấy photoshoot gốc để render lại.", code: "NOT_FOUND" });
    }

    const requestSessionId = req.body?.sessionId || req.query?.sessionId || req.headers['x-session-id'];
    if (!requestSessionId) {
      return res.status(400).json({
        success: false,
        code: "MISSING_SESSION_ID",
        error: "Thiếu sessionId."
      });
    }

    if (
      originalJob.sessionId &&
      originalJob.sessionId !== requestSessionId &&
      originalJob.sessionId !== 'default_anonymous_session'
    ) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        error: "Bạn không có quyền render lại ảnh này."
      });
    }

    const images: { data: string; mimeType: string }[] = [
      { data: originalJob.mainImageUrl, mimeType: "image/png" }
    ];

    if (originalJob.packagingImageUrl) {
      images.push({ data: originalJob.packagingImageUrl, mimeType: "image/png" });
    }

    const result = await processPhotoshootGeneration({
      images,
      presetId: originalJob.presetId,
      aspectRatio: originalJob.aspectRatio,
      outputQuality: originalJob.outputQuality,
      sessionId: requestSessionId || originalJob.sessionId,
      isVariation: false,
      originalJobId: originalJob.id,
      secondaryRole: originalJob.secondaryRole,
      compositionMode: originalJob.compositionMode,
      secondaryScale: originalJob.secondaryScale,
      secondaryPlacement: originalJob.secondaryPlacement
    });

    return res.json(result);
  } catch (error: any) {
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.error || error?.message || "Lỗi khi render lại ảnh.",
      code: error?.code || "UNKNOWN_ERROR"
    });
  } finally {
    isGenerating = false;
  }
});

// 5. POST /api/photoshoots/:id/variation - Generate variation of existing photoshoot
router.post("/photoshoots/:id/variation", async (req: any, res: any) => {
  if (isGenerating) {
    return res.status(429).json({
      error: "Một yêu cầu tạo ảnh đang được xử lý. Vui lòng chờ hoàn tất.",
      code: "REQUEST_IN_PROGRESS"
    });
  }

  isGenerating = true;

  try {
    const originalJob = await photoshootRepository.getJobById(req.params.id);
    if (!originalJob) {
      return res.status(404).json({ error: "Không tìm thấy photoshoot gốc để tạo biến thể.", code: "NOT_FOUND" });
    }

    const requestSessionId = req.body?.sessionId || req.query?.sessionId || req.headers['x-session-id'];
    if (!requestSessionId) {
      return res.status(400).json({
        success: false,
        code: "MISSING_SESSION_ID",
        error: "Thiếu sessionId."
      });
    }

    if (
      originalJob.sessionId &&
      originalJob.sessionId !== requestSessionId &&
      originalJob.sessionId !== 'default_anonymous_session'
    ) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        error: "Bạn không có quyền tạo biến thể từ ảnh này."
      });
    }

    const images: { data: string; mimeType: string }[] = [
      { data: originalJob.mainImageUrl, mimeType: "image/png" }
    ];

    if (originalJob.packagingImageUrl) {
      images.push({ data: originalJob.packagingImageUrl, mimeType: "image/png" });
    }

    const result = await processPhotoshootGeneration({
      images,
      presetId: originalJob.presetId,
      aspectRatio: originalJob.aspectRatio,
      outputQuality: originalJob.outputQuality,
      sessionId: requestSessionId || originalJob.sessionId,
      isVariation: true,
      originalJobId: originalJob.id,
      secondaryRole: originalJob.secondaryRole,
      compositionMode: originalJob.compositionMode,
      secondaryScale: originalJob.secondaryScale,
      secondaryPlacement: originalJob.secondaryPlacement
    });

    return res.json(result);
  } catch (error: any) {
    const status = error?.status || 500;
    return res.status(status).json({
      error: error?.error || error?.message || "Lỗi khi tạo biến thể ảnh.",
      code: error?.code || "UNKNOWN_ERROR"
    });
  } finally {
    isGenerating = false;
  }
});

// 6. DELETE /api/photoshoots/:id
router.delete("/photoshoots/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = (req.query.sessionId as string) || req.body?.sessionId;
    const job = await photoshootRepository.getJobById(id);

    if (!job) {
      return res.status(404).json({ success: false, error: "Không tìm thấy photoshoot để xoá." });
    }

    if (job.resultImageUrl) {
      await storageService.deleteImage(job.resultImageUrl);
    }

    const deleted = await photoshootRepository.deleteJob(id, sessionId);
    return res.json({ success: deleted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Lỗi khi xoá photoshoot." });
  }
});

export default router;