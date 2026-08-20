import { PHOTO_PRESETS } from "../../shared/photoPresets";

export type SecondaryReferenceRole =
  | 'packaging'
  | 'smaller_size'
  | 'larger_size'
  | 'companion_product'
  | 'background_packaging';

export type CompositionMode =
  | 'single_product'
  | 'product_with_packaging'
  | 'two_sizes'
  | 'product_pair'
  | 'packaging_background';

export interface BuildPromptParams {
  presetId: string;
  hasSecondaryReference: boolean;
  secondaryRole?: SecondaryReferenceRole;
  compositionMode?: CompositionMode;
  secondaryScale?: string;
  secondaryPlacement?: string;
  isVariation?: boolean;
}

export const buildPrompt = (
  paramsOrPresetId: BuildPromptParams | string,
  legacyHasPackaging?: boolean,
  legacyIsVariation?: boolean
): string => {
  let params: BuildPromptParams;

  if (typeof paramsOrPresetId === 'string') {
    params = {
      presetId: paramsOrPresetId,
      hasSecondaryReference: Boolean(legacyHasPackaging),
      secondaryRole: 'packaging',
      compositionMode: legacyHasPackaging ? 'product_with_packaging' : 'single_product',
      isVariation: Boolean(legacyIsVariation)
    };
  } else {
    params = paramsOrPresetId;
  }

  const {
    presetId,
    hasSecondaryReference,
    secondaryRole = 'packaging',
    compositionMode = hasSecondaryReference ? 'product_with_packaging' : 'single_product',
    isVariation = false
  } = params;

  // Base rules applicable to all commercial product photography
  const baseInstructions = `Create a brand-new premium commercial cosmetics product photoshoot based strictly on the uploaded reference images.

Do not edit, retouch, crop, or reuse the uploaded photos directly. Generate a completely new studio-shot commercial image.

CRITICAL PRODUCT FIDELITY RULES:
- Preserve the visible brand identity, logo, typography, printed text, product shape, proportions, product color, and materials with extremely high fidelity.
- Do not invent a different brand name, rewrite labels incorrectly, change the logo, or alter the product's physical design.
- Do not deform the bottle, jar, tube, or container.
- Do not invent fake claims, fake text, or fake logos.`;

  // Determine composition mode text
  let compositionInstructions = '';

  if (!hasSecondaryReference || compositionMode === 'single_product') {
    compositionInstructions = `
COMPOSITION: SINGLE PRODUCT HERO SHOT
- Reference Image 1 is the main hero product.
- Only show the main product standing alone as the hero object.
- Do not add secondary products, extra bottles, or packaging boxes.`;
  } else if (compositionMode === 'two_sizes' || secondaryRole === 'smaller_size' || secondaryRole === 'larger_size') {
    compositionInstructions = `
COMPOSITION: TWO PRODUCT SIZES (MAIN + SECONDARY SIZE VARIANT)
- Reference Image 1 is the main hero product.
- Reference Image 2 is a second size variant of the same product line (e.g., travel size / compact size / full size).
- CRITICAL: Both items are cosmetic bottles/jars/products. Do NOT treat Reference Image 2 as a box or packaging.
- Show both product bottles standing side-by-side on the studio surface with their bases naturally aligned.
- The main product should be larger, centered and prominent.
- The secondary product should be scaled down naturally (around 50-65% relative height), positioned to the side.
- Both product labels must face forward toward the camera clearly.
- Do not merge the two bottles into one. Preserve each bottle's shape, cap, and label.`;
  } else if (compositionMode === 'product_pair' || secondaryRole === 'companion_product') {
    compositionInstructions = `
COMPOSITION: PRODUCT PAIR / COMBO SET
- Reference Image 1 and Reference Image 2 are companion products in the same skincare/beauty routine.
- Display both products side-by-side as a clean, balanced studio duo/combo set.
- Preserve each product's distinct identity, label layout, typography, cap shape, and formula color.
- Keep an elegant, balanced studio arrangement without visual clutter.`;
  } else if (compositionMode === 'packaging_background' || secondaryRole === 'background_packaging') {
    compositionInstructions = `
COMPOSITION: HERO PRODUCT WITH BACKGROUND PACKAGING
- Reference Image 1 is the hero product in sharp, crisp focus in the foreground.
- Reference Image 2 is the packaging box, softly placed in the background with gentle depth-of-field.
- The packaging provides brand context without overpowering the hero product.`;
  } else {
    // Default: product_with_packaging
    compositionInstructions = `
COMPOSITION: PRODUCT WITH PACKAGING BOX
- Reference Image 1 is the hero product.
- Reference Image 2 is the product packaging / box.
- Show the packaging clearly as a secondary supporting element placed behind or beside the main product.
- The main product occupies 70–80% of the visual attention and must stand in front.
- The packaging must NEVER cover or obscure the main product's label or brand name.
- Do not omit the packaging box unless it severely conflicts with the product.`;
  }

  // Find preset from shared config or fallback
  const preset = PHOTO_PRESETS.find((p) => p.id === presetId) || PHOTO_PRESETS[0];

  let presetInstructions = `
Style: ${preset.style}.
Background: ${preset.background}.
Lighting: ${preset.lighting}.
Camera Direction: ${preset.cameraDirection}.
Avoid: ${preset.negativePrompt}.`;

  if (presetId === 'premium_bright_studio') {
    presetInstructions += `

PREMIUM CLEAN STUDIO RULES:
- Plain white, off-white, or light warm gray seamless studio background.
- No flowers.
- No leaves.
- No stones or pebbles.
- No crystals.
- No water drops or splashes.
- No spa props or lifestyle scenes.
- No extra unrelated objects.
- Large soft studio softbox lighting with soft natural contact shadows and subtle glossy floor reflection.`;
  }

  let variationInstruction = '';
  if (isVariation) {
    variationInstruction = `

VARIATION DIRECTIVE:
- Create a new composition variation of the original product photoshoot while strictly preserving the composition mode (${compositionMode}) and role of reference image 2 (${secondaryRole}).
- Preserve the exact product identity, brand name, logo, label layout, bottle shape, cap shape, product color, and materials.
- Change only the composition subtly: camera crop, product placement angle, shadow direction, reflection intensity, and studio framing.
- Do not change the product label.
- Do not invent text.
- Do not add extra products.
- Do not distort packaging.
- If two sizes were requested, continue showing both sizes distinctly.
- If product with packaging was requested, continue showing both the product and packaging.`;

    if (presetId === 'premium_bright_studio') {
      variationInstruction += `
- For Premium Clean Studio: keep background plain white/off-white/light gray and do not add props.
- No flowers, leaves, crystals, water drops, or spa props.
- Product remains the hero object.`;
    }
  }

  return `${baseInstructions}\n${compositionInstructions}\n${presetInstructions}${variationInstruction}`;
};
