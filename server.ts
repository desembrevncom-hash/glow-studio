import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const genericCosmeticsPrompt = `Create a brand-new premium commercial cosmetics product photoshoot based only on the currently uploaded reference images.

Reference Image 1 is the Main Product. It may be any cosmetics item such as a serum bottle, cream jar, toner bottle, cleanser tube, ampoule, lipstick, cushion, compact, skincare container, or beauty product. Use it only to understand the exact product identity, shape, proportions, material, cap, label, logo, typography, colors, printed text, surface texture, and brand details.

Reference Image 2 is the Product Box or Packaging, if provided. It may be a paper box, outer package, pouch, gift set, sleeve, or any packaging related to the product. Use it only to understand the exact packaging design, logo, typography, color palette, printed information, layout, proportions, material, and brand identity.

Do not edit, retouch, crop, or reuse the uploaded photos directly. Generate a completely new studio-shot commercial image. Do not remember or reuse any previous product, brand, color, layout, prompt, or visual identity. Each generation must be based only on the current uploaded images and the current prompt.

Preserve the visible brand identity, logo, typography, printed text, product shape, packaging structure, colors, proportions, and materials with high fidelity. Do not invent a different brand, rewrite labels incorrectly, change the logo, or alter the product design.

Create a luxury cosmetics advertising scene with soft diffused lighting, clean premium composition, realistic shadows, subtle reflections, elegant background, high-end beauty campaign style, ultra sharp details, high quality.

If both product and packaging are provided, arrange them in a balanced commercial composition and choose the most visually suitable hero object. If only the main product is provided, make it the hero object.

Avoid distorted text, misspelled words, incorrect logo, wrong packaging, extra unrelated products, messy background, unrealistic reflections, duplicated brand elements, or altered product identity.`;

// Lazy Gemini client helper
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

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

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
    timestamp: new Date().toISOString()
  });
});

app.post("/api/generate-photoshoot", async (req, res) => {
  if (isGenerating) {
    return res.status(429).json({
      error: "Một yêu cầu tạo ảnh đang được xử lý. Vui lòng chờ hoàn tất.",
      code: "REQUEST_IN_PROGRESS"
    });
  }

  isGenerating = true;

  try {
    const { images, customPrompt } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Vui lòng tải lên ít nhất 1 hình ảnh sản phẩm.", code: "BAD_REQUEST" });
    }

    // Validate images
    for (const img of images) {
      const mime = img.mimeType || "image/png";
      if (!ALLOWED_TYPES.includes(mime)) {
        return res.status(400).json({ error: `Định dạng ảnh không hợp lệ (${mime}). Hỗ trợ: PNG, JPG, JPEG, WebP.`, code: "BAD_REQUEST" });
      }
      
      // Calculate approximate base64 size (4 bytes per 3 bytes of data)
      const base64Length = img.data.split(',').pop()?.length || 0;
      const sizeBytes = (base64Length * 3) / 4;
      if (sizeBytes > MAX_FILE_SIZE) {
        return res.status(400).json({ error: "Kích thước ảnh vượt quá 10MB.", code: "BAD_REQUEST" });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server chưa cấu hình GEMINI_API_KEY.", code: "MISSING_API_KEY" });
    }
    
    const ai = getGeminiClient();
    const promptText = customPrompt || genericCosmeticsPrompt;

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

    const candidateConfigurations = [
      {
        model: "gemini-3.1-flash-image",
        config: {
          imageConfig: { aspectRatio: "1:1", imageSize: "2K" },
        },
      }
    ];

    let resultImageUrl: string | null = null;
    let attempt = 0;
    const maxRetries = 2; // Total 3 attempts (1 initial + 2 retries)

    for (const { model, config } of candidateConfigurations) {
      while (attempt <= maxRetries) {
        try {
          if (attempt === 1) await new Promise(r => setTimeout(r, 2000));
          if (attempt === 2) await new Promise(r => setTimeout(r, 5000));

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("TIMEOUT_ERROR")), 90000);
          });

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
                code: "BAD_REQUEST"
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
          const isRateLimit = status === 429 || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
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
            return res.status(503).json({ error: "Hệ thống AI gặp lỗi hoặc quá tải. Vui lòng thử lại.", code: "SERVER_ERROR" });
          }

          // Other errors (e.g., 400 Bad Request) don't retry
          return res.status(400).json({ error: errMsg || "Yêu cầu không hợp lệ.", code: "BAD_REQUEST" });
        }
      }
      if (resultImageUrl) break;
    }

    if (!resultImageUrl) {
      return res.status(500).json({ error: "Không nhận được dữ liệu hình ảnh trả về từ AI.", code: "SERVER_ERROR" });
    }

    return res.json({ imageUrl: resultImageUrl });
  } catch (error: any) {
    logGeminiError(error);
    return res.status(500).json({
      error: error?.message || "Đã xảy ra lỗi không xác định trong quá trình xử lý.",
      code: "SERVER_ERROR"
    });
  } finally {
    isGenerating = false;
  }
});

async function startServer() {
  const portStr = process.env.PORT || "8080";
  const port = parseInt(portStr, 10);
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Studio Glow server running on http://0.0.0.0:${port}`);
  });
}

startServer();
