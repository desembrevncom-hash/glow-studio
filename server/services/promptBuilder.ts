export const buildPrompt = (presetId: string, hasPackaging: boolean): string => {
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
    packagingInstructions += `
Reference Image 2 is the Product Box or Packaging. 
- Packaging is secondary.
- Place the packaging softly in the background or beside the product.
- Do NOT let the packaging cover or obscure the main product's label.`;
  } else {
    packagingInstructions += `
Generate the scene using only the main product.`;
  }

  // Preset specific instructions
  let presetInstructions = '';
  switch (presetId) {
    case 'premium_black_glow':
      presetInstructions = `
Style: High-end luxury commercial photography, sleek and modern.
Background: Deep black with subtle glowing gradient or dark reflection.
Lighting: Dramatic studio lighting, rim light to highlight product edges, moody and elegant.
Camera Direction: Eye-level, slightly dramatic angle.`;
      break;
    case 'luxury_skincare':
      presetInstructions = `
Style: Clean, elegant beauty campaign style, ultra sharp details.
Background: Soft pastel or neutral white/beige tones with subtle reflections.
Lighting: Soft diffused lighting, clean premium composition, realistic shadows.
Camera Direction: Straight on, centered.`;
      break;
    case 'clean_marketplace':
      presetInstructions = `
Style: Standard e-commerce catalog photography, ultra clear, minimalist.
Background: Pure white or light grey seamless backdrop.
Lighting: Even studio lighting, no harsh shadows, perfectly lit product.
Camera Direction: Eye-level, perfectly centered for product catalog.`;
      break;
    case 'social_ad_4_5':
      presetInstructions = `
Style: Trendy, aesthetic, lifestyle product photography for Instagram/TikTok.
Background: Aesthetic modern surface (e.g. marble, travertine, or textured fabric).
Lighting: Natural sunlight look, warm, aesthetic shadows.
Camera Direction: Slightly top-down or dynamic angle.`;
      break;
    case 'natural_bathroom':
      presetInstructions = `
Style: Organic, calming spa aesthetic, real-world context. Not messy.
Background: Clean luxury bathroom vanity or spa setting (marble, wood accents, soft towels, plants).
Lighting: Soft natural window light, morning glow.
Camera Direction: Natural lifestyle angle.`;
      break;
    case 'premium_bright_studio':
      presetInstructions = `
Style: Premium clean studio product photography, minimalist high-end cosmetic product image, elegant e-commerce hero shot, clean commercial beauty photography.
Background: Plain white, off-white, or light warm gray seamless studio background. No lifestyle scene. No decorative props. Subtle floor contact shadow only.
Lighting: Bright softbox lighting, evenly lit product, soft realistic shadow under the product, gentle highlight on bottle edges, no dramatic mood, no overexposure.
Camera Direction: Straight-on eye-level hero product composition, centered, upright product, label facing camera, product fills 70-80% of frame.
Avoid: flowers, leaves, plants, crystals, stones, water drops, towels, bathroom, marble props, spa scene, lifestyle background, clutter, extra objects, extra products, fake text, changed logo, wrong label, deformed bottle, distorted cap, messy reflection, dark background, dramatic shadows, overexposed, washed out.

CRITICAL PRESET RULES:
- The product must stand alone as the hero object.
- Keep the product upright and centered.
- Keep the original bottle shape, cap, label layout, logo, and color.
- Do not invent new label text.
- Do not add extra products.
- Allow only subtle contact shadow and very light floor reflection.
${hasPackaging ? '- Packaging image (Reference Image 2) should either be omitted or placed very minimally behind the product, only if it does not create clutter. If packaging makes the scene busy, prioritize the main product only.' : ''}`;
      break;
    default:
      // Fallback
      presetInstructions = `
Style: Premium commercial cosmetics product photoshoot.
Background: Elegant background.
Lighting: Soft diffused lighting.`;
      break;
  }

  return `${baseInstructions}\n${packagingInstructions}\n${presetInstructions}`;
};
