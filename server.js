import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env if .env.local doesn't have it

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const genericCosmeticsPrompt = `Create a brand-new premium commercial cosmetics product photoshoot based only on the currently uploaded reference images.

Reference Image 1 is the Main Product. It may be any cosmetics item such as a serum bottle, cream jar, toner bottle, cleanser tube, ampoule, lipstick, cushion, compact, skincare container, or beauty product. Use it only to understand the exact product identity, shape, proportions, material, cap, label, logo, typography, colors, printed text, surface texture, and brand details.

Reference Image 2 is the Product Box or Packaging, if provided. It may be a paper box, outer package, pouch, gift set, sleeve, or any packaging related to the product. Use it only to understand the exact packaging design, logo, typography, color palette, printed information, layout, proportions, material, and brand identity.

Do not edit, retouch, crop, or reuse the uploaded photos directly. Generate a completely new studio-shot commercial image. Do not remember or reuse any previous product, brand, color, layout, prompt, or visual identity. Each generation must be based only on the current uploaded images and the current prompt.

Preserve the visible brand identity, logo, typography, printed text, product shape, packaging structure, colors, proportions, and materials with high fidelity. Do not invent a different brand, rewrite labels incorrectly, change the logo, or alter the product design.

Create a luxury cosmetics advertising scene with soft diffused lighting, clean premium composition, realistic shadows, subtle reflections, elegant background, high-end beauty campaign style, ultra sharp details, 2K quality.

If both product and packaging are provided, arrange them in a balanced commercial composition and choose the most visually suitable hero object. If only the main product is provided, make it the hero object.

Avoid distorted text, misspelled words, incorrect logo, wrong packaging, extra unrelated products, messy background, unrealistic reflections, duplicated brand elements, or altered product identity.`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/generate', async (req, res) => {
  const { images } = req.body;
  if (!images || !Array.isArray(images)) {
    return res.status(400).json({ error: 'Images array is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable on the server.' });
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const parts = images.map(img => ({
        inlineData: {
          data: img.data.split(',')[1],
          mimeType: img.mimeType,
        }
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [...parts, { text: genericCosmeticsPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "2K"
          }
        }
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("Không nhận được phản hồi từ AI. Vui lòng thử lại.");
      }

      const candidate = response.candidates[0];
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'OTHER') {
        throw new Error(`AI từ chối xử lý nội dung này (Lý do: ${candidate.finishReason}). Vui lòng thử ảnh khác.`);
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return res.json({ result: `data:image/png;base64,${part.inlineData.data}` });
        }
      }
      
      throw new Error("Không nhận được dữ liệu hình ảnh từ API");
    } catch (error) {
      attempts++;
      const errorMessage = error?.message || "";
      const errorStatus = error?.status;
      const errorString = JSON.stringify(error).toLowerCase();
      
      const isHighDemand = 
        errorStatus === 503 ||
        errorStatus === "503" ||
        errorStatus === "UNAVAILABLE" ||
        errorMessage.includes("503") || 
        errorMessage.toLowerCase().includes("high demand") || 
        errorMessage.toLowerCase().includes("overloaded") ||
        errorString.includes("503") ||
        errorString.includes("high demand") ||
        errorString.includes("unavailable");

      console.error(`Gemini AI Status (Attempt ${attempts}/${maxAttempts}):`, {
        status: errorStatus,
        isHighDemand,
        message: errorMessage
      });

      if (isHighDemand && attempts < maxAttempts) {
        const waitTime = Math.pow(3, attempts) * 1000 + (Math.random() * 2000);
        console.warn(`Hệ thống đang bận. Đang thử lại sau ${Math.round(waitTime/1000)}s...`);
        await delay(waitTime);
        continue;
      }

      if (errorMessage.includes("Requested entity was not found") || errorString.includes("not found")) {
        return res.status(400).json({ error: "LỖI API KEY: Không tìm thấy Project hoặc chưa bật Billing. Vui lòng kiểm tra lại API Key." });
      }

      if (isHighDemand) {
        return res.status(503).json({ error: "Hệ thống AI hiện đang quá tải do lượt truy cập cao. Vui lòng đợi khoảng 30 giây rồi thử lại." });
      }
      
      if (attempts >= maxAttempts) {
         return res.status(500).json({ error: errorMessage || "Gặp sự cố khi xử lý ảnh sau nhiều lần thử lại." });
      }
    }
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
