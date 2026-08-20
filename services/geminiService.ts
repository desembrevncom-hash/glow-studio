import { GoogleGenAI } from "@google/genai";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const genericCosmeticsPrompt = `Create a brand-new premium commercial cosmetics product photoshoot based only on the currently uploaded reference images.

Reference Image 1 is the Main Product. It may be any cosmetics item such as a serum bottle, cream jar, toner bottle, cleanser tube, ampoule, lipstick, cushion, compact, skincare container, or beauty product. Use it only to understand the exact product identity, shape, proportions, material, cap, label, logo, typography, colors, printed text, surface texture, and brand details.

Reference Image 2 is the Product Box or Packaging, if provided. It may be a paper box, outer package, pouch, gift set, sleeve, or any packaging related to the product. Use it only to understand the exact packaging design, logo, typography, color palette, printed information, layout, proportions, material, and brand identity.

Do not edit, retouch, crop, or reuse the uploaded photos directly. Generate a completely new studio-shot commercial image. Do not remember or reuse any previous product, brand, color, layout, prompt, or visual identity. Each generation must be based only on the current uploaded images and the current prompt.

Preserve the visible brand identity, logo, typography, printed text, product shape, packaging structure, colors, proportions, and materials with high fidelity. Do not invent a different brand, rewrite labels incorrectly, change the logo, or alter the product design.

Create a luxury cosmetics advertising scene with soft diffused lighting, clean premium composition, realistic shadows, subtle reflections, elegant background, high-end beauty campaign style, ultra sharp details, 2K quality.

If both product and packaging are provided, arrange them in a balanced commercial composition and choose the most visually suitable hero object. If only the main product is provided, make it the hero object.

Avoid distorted text, misspelled words, incorrect logo, wrong packaging, extra unrelated products, messy background, unrealistic reflections, duplicated brand elements, or altered product identity.`;

// Export alias for backward compatibility if any older references remain
export const processStudioImage = async (images: { data: string, mimeType: string }[]): Promise<string> => {
  return generateProductPhotoshoot(images);
};

export const generateProductPhotoshoot = async (images: { data: string, mimeType: string }[]): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu Gemini API key. Vui lòng chọn hoặc cấu hình API key trước khi tạo ảnh.");
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

      // Create a 60-second timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request quá thời gian 60 giây. Vui lòng thử lại.")), 60000);
      });

      const responsePromise = ai.models.generateContent({
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

      // Race between the API call and the timeout
      const response = await Promise.race([responsePromise, timeoutPromise]);

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("Không nhận được phản hồi từ AI. Vui lòng thử lại.");
      }

      const candidate = response.candidates[0];
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'OTHER') {
        throw new Error(`AI từ chối xử lý nội dung này (Lý do: ${candidate.finishReason}). Vui lòng thử ảnh khác.`);
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      throw new Error("Không nhận được dữ liệu hình ảnh từ API");
    } catch (error: any) {
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
        
      const isQuotaExceeded = 
        errorStatus === 429 ||
        errorStatus === "429" ||
        errorString.includes("429") ||
        errorString.includes("quota exceeded") ||
        errorString.includes("resource_exhausted");

      console.error(`Gemini AI Status (Attempt ${attempts}/${maxAttempts}):`, {
        status: errorStatus,
        isHighDemand,
        isQuotaExceeded,
        message: errorMessage
      });

      if (isHighDemand && attempts < maxAttempts) {
        const waitTime = Math.pow(3, attempts) * 1000 + (Math.random() * 2000);
        console.warn(`Hệ thống đang bận. Đang thử lại sau ${Math.round(waitTime/1000)}s...`);
        await delay(waitTime);
        continue;
      }

      if (errorMessage.includes("Requested entity was not found") || errorString.includes("not found")) {
        throw new Error("LỖI API KEY: Không tìm thấy Project hoặc chưa bật Billing. Vui lòng kiểm tra lại API Key.");
      }
      
      if (isQuotaExceeded) {
        throw new Error("LỖI HẠN MỨC (QUOTA): API Key của bạn đã hết lượt sử dụng miễn phí hoặc chưa được cấu hình thanh toán.");
      }

      if (isHighDemand) {
        throw new Error("Hệ thống AI hiện đang quá tải do lượt truy cập cao. Vui lòng đợi khoảng 30 giây rồi nhấn thử lại.");
      }

      // If it's a timeout error or other fatal error, and we maxed out attempts
      if (attempts >= maxAttempts || errorMessage.includes("60 giây")) {
         throw error;
      }
    }
  }

  throw new Error("Gặp sự cố khi xử lý ảnh sau nhiều lần thử lại.");
};
