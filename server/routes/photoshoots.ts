import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { buildPrompt } from "../services/promptBuilder";

const router = Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
let isGenerating = false;

// Safe error logging
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

// Keeping /api/generate-photoshoot and /api/photoshoots aliases
const generateHandler = async (req: any, res: any) => {
  if (isGenerating) {
    return res.status(429).json({
      error: "Một yêu cầu tạo ảnh đang được xử lý. Vui lòng chờ hoàn tất.",
      code: "REQUEST_IN_PROGRESS"
    });
  }

  isGenerating = true;

  try {
    const { images, presetId } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Vui lòng tải lên ít nhất 1 hình ảnh sản phẩm.", code: "INVALID_IMAGE" });
    }

    // Validate images
    for (const img of images) {
      const mime = img.mimeType || "image/png";
      if (!ALLOWED_TYPES.includes(mime)) {
        return res.status(400).json({ error: `Định dạng ảnh không hợp lệ (${mime}). Hỗ trợ: PNG, JPG, JPEG, WebP.`, code: "INVALID_IMAGE" });
      }
      
      const base64Length = img.data.split(',').pop()?.length || 0;
      const sizeBytes = (base64Length * 3) / 4;
      if (sizeBytes > MAX_FILE_SIZE) {
        return res.status(400).json({ error: "Kích thước ảnh vượt quá 10MB.", code: "INVALID_IMAGE" });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server chưa cấu hình GEMINI_API_KEY.", code: "MISSING_API_KEY" });
    }
    
    const ai = getGeminiClient();
    
    // Get actual prompt based on PhotoRecipe
    const hasPackaging = images.length > 1;
    const finalPresetId = presetId || 'premium_black_glow';
    const promptText = buildPrompt(finalPresetId, hasPackaging);

    // Apply Gemini Model logic
    const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-image";

    const parts = images.map((img: { data: string; mimeType: string }) => {
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

    let resultImageUrl: string | null = null;
    let attempt = 0;
    const maxRetries = 2; // Total 3 attempts (1 initial + 2 retries)

    // Determine aspect ratio from preset
    const isPortrait = finalPresetId === 'social_ad_4_5';
    const aspectRatio = isPortrait ? "3:4" : "1:1";

    while (attempt <= maxRetries) {
      try {
        if (attempt === 1) await new Promise(r => setTimeout(r, 2000));
        if (attempt === 2) await new Promise(r => setTimeout(r, 5000));

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("TIMEOUT_ERROR")), 90000);
        });

        // Config fallback depending on the exact model
        const config = model.includes('lite') ? { imageConfig: { aspectRatio } } : { imageConfig: { aspectRatio, imageSize: "2K" } };

        const responsePromise = ai.models.generateContent({
          model,
          contents: { parts: [...parts, { text: promptText }] },
          config,
        });

        const response = await Promise.race([responsePromise, timeoutPromise]) as any;

        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate.finishReason === "SAFETY") {
            return res.status(400).json({
              error: "AI từ chối xử lý hình ảnh này vì lý do an toàn nội dung (Safety). Vui lòng thử hình ảnh khác.",
              code: "INVALID_IMAGE"
            });
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
        const errMsg = err?.message || String(err);
        
        if (errMsg === "TIMEOUT_ERROR") {
          return res.status(504).json({ error: "Yêu cầu tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại với ảnh nhẹ hơn.", code: "TIMEOUT" });
        }

        logGeminiError(err);
        
        const status = err?.status;
        const isInvalidKey = status === 401 || status === 403 || errMsg.includes("API key not valid") || errMsg.includes("Permission denied");
        const isRateLimit = status === 429 || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("limit: 0");
        const isServerError = status >= 500 || errMsg.includes("500") || errMsg.includes("503") || errMsg.includes("INTERNAL") || errMsg.includes("overloaded");

        if (isInvalidKey) {
          return res.status(401).json({ error: "API key không hợp lệ hoặc chưa được cấp quyền.", code: "INVALID_API_KEY" });
        }

        if (isRateLimit || isServerError) {
          if (attempt < maxRetries) {
            attempt++;
            continue;
          }
          if (isRateLimit) {
            return res.status(429).json({ error: "Hệ thống AI đang bận. Vui lòng đợi 30 giây rồi thử lại.", code: "RATE_LIMIT", retryAfterSeconds: 30 });
          }
          return res.status(503).json({ error: "Hệ thống AI gặp lỗi hoặc quá tải. Vui lòng thử lại.", code: "UNKNOWN_ERROR" });
        }

        // Other errors don't retry
        return res.status(400).json({ error: errMsg || "Yêu cầu không hợp lệ.", code: "UNKNOWN_ERROR" });
      }
    }
    
    if (!resultImageUrl) {
      return res.status(500).json({ error: "Không nhận được dữ liệu hình ảnh trả về từ AI.", code: "GEMINI_EMPTY_RESULT" });
    }

    return res.json({ imageUrl: resultImageUrl });
  } catch (error: any) {
    logGeminiError(error);
    return res.status(500).json({
      error: error?.message || "Đã xảy ra lỗi không xác định trong quá trình xử lý.",
      code: "UNKNOWN_ERROR"
    });
  } finally {
    isGenerating = false;
  }
};

router.post("/photoshoots", generateHandler);
router.post("/generate-photoshoot", generateHandler); // Backward compatibility
router.post("/generate", generateHandler); // Additional alias for older UI

export default router;