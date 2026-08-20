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

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/generate-photoshoot", async (req, res) => {
  try {
    const { images, customPrompt } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Vui lòng tải lên ít nhất 1 hình ảnh sản phẩm." });
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

    // Candidate model configurations for maximum reliability and quality
    const candidateConfigurations = [
      {
        model: "gemini-3.1-flash-image",
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
          },
        },
      },
      {
        model: "gemini-3.1-flash-image",
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "2K",
          },
        },
      },
      {
        model: "gemini-3.1-flash-lite-image",
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      },
      {
        model: "gemini-3.1-flash-lite-image",
        config: undefined,
      },
    ];

    let lastError: any = null;
    let resultImageUrl: string | null = null;

    for (const { model, config } of candidateConfigurations) {
      // Try up to 2 attempts per candidate configuration for transient 500s
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 1500));
          }

          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [...parts, { text: promptText }],
            },
            config,
          });

          if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.finishReason === "SAFETY") {
              return res.status(400).json({
                error: "AI từ chối xử lý hình ảnh này vì lý do an toàn nội dung (Safety). Vui lòng thử hình ảnh khác.",
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

          if (resultImageUrl) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Attempt ${attempt + 1} with ${model} failed:`, err?.message || err);
          const msg = String(err?.message || err);
          // If not a transient 500 error, don't repeat the exact same candidate
          if (!msg.includes("500") && !msg.includes("INTERNAL") && !msg.includes("Internal error")) {
            break;
          }
        }
      }

      if (resultImageUrl) {
        break;
      }
    }

    if (!resultImageUrl) {
      if (lastError) {
        const errMsg = lastError.message || String(lastError);
        if (errMsg.includes("limit: 0") || (errMsg.includes("free_tier") && errMsg.includes("429"))) {
          return res.status(429).json({
            error: "Mô hình tạo ảnh (Flash Image) yêu cầu API Key có kích hoạt thanh toán (Pay-As-You-Go) trên Google AI Studio. Gói miễn phí có hạn mức 0 cho tính năng tạo ảnh.",
            isBillingQuotaIssue: true,
          });
        }
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          return res.status(429).json({
            error: "Hệ thống AI đang quá tải hoặc tạm thời vượt hạn mức (Rate limit). Vui lòng thử lại sau vài giây.",
            isRateLimit: true,
          });
        }
        if (errMsg.includes("500") || errMsg.includes("INTERNAL") || errMsg.includes("Internal error")) {
          return res.status(500).json({
            error: "Dịch vụ AI gặp lỗi tạm thời khi xử lý ảnh độ phân giải cao. Vui lòng bấm 'Thử lại' để thực hiện lại lượt tạo.",
          });
        }
        return res.status(500).json({
          error: errMsg || "Không thể tạo ảnh từ AI. Vui lòng thử lại.",
        });
      }
      return res.status(500).json({
        error: "Không nhận được dữ liệu hình ảnh trả về từ AI.",
      });
    }

    return res.json({ imageUrl: resultImageUrl });
  } catch (error: any) {
    console.error("Photoshoot generation error:", error);
    return res.status(500).json({
      error: error?.message || "Đã xảy ra lỗi không xác định trong quá trình xử lý.",
    });
  }
});

async function startServer() {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Studio Glow server running on http://localhost:${PORT}`);
  });
}

startServer();
