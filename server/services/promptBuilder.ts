import { PHOTO_PRESETS } from "../../shared/photoPresets";

export const buildPrompt = (presetId: string, hasPackaging: boolean, isVariation?: boolean): string => {
  // Common instructions for ALL presets
  const baseInstructions = `Create a brand-new premium commercial cosmetics product photoshoot based strictly on the uploaded reference images.
  
Do not edit, retouch, crop, or reuse the uploaded photos directly. Generate a completely new studio-shot commercial image.

CRITICAL RULES:
- Preserve the visible brand identity, logo, typography, printed text, product shape, proportions, product color, and materials with extremely high fidelity.
- Do not invent a different brand name, rewrite labels incorrectly, change the logo, or alter the product's physical design.
- Do not deform the bottle, jar, tube, or container.
- Do not invent fake claims, fake text, or fake logos.
`;

  let packagingInstructions = `Reference Image 1 is the Main Product. It must always be the hero object.`;
  
  if (hasPackaging) {
    if (presetId === 'premium_bright_studio') {
      packagingInstructions += `
Reference Image 2 is the Product Box or Packaging. 
- Packaging should either be omitted or placed very minimally behind the product, only if it does not create clutter.
- If packaging makes the scene busy, prioritize the main product only.
- Do NOT let packaging cover or obscure the main product label.`;
    } else {
      packagingInstructions += `
Reference Image 2 is the Product Box or Packaging. 
- Packaging is secondary.
- Place the packaging softly in the background or beside the product.
- Do NOT let the packaging cover or obscure the main product's label.`;
    }
  } else {
    packagingInstructions += `
Generate the scene using only the main product.`;
  }

  // Find preset from shared config or fallback
  const preset = PHOTO_PRESETS.find(p => p.id === presetId) || PHOTO_PRESETS[0];

  let presetInstructions = `
Style: ${preset.style}.
Background: ${preset.background}.
Lighting: ${preset.lighting}.
Camera Direction: ${preset.cameraDirection}.
Avoid: ${preset.negativePrompt}.`;

  if (presetId === 'premium_bright_studio') {
    presetInstructions += `

CRITICAL PRESET RULES:
- The product must stand alone as the hero object.
- Keep the product upright and centered.
- Keep the original bottle shape, cap, label layout, logo, and color.
- Do not invent new label text.
- Do not add extra products.
- Allow only subtle contact shadow and very light floor reflection.`;
  }

  const variationInstruction = isVariation
    ? `\n\nVARIATION DIRECTIVE:\n- Create a new composition variation while preserving product identity, label, logo, shape, and color.`
    : '';

  return `${baseInstructions}\n${packagingInstructions}\n${presetInstructions}${variationInstruction}`;
};


