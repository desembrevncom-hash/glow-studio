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
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ images })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate image from server.');
  }

  if (!data.result) {
    throw new Error('No image returned from server.');
  }

  return data.result;
};
