export interface PhotoPreset {
  id: string;
  label: string;
  style: string;
  background: string;
  lighting: string;
  cameraDirection: string;
  negativePrompt: string;
  aspectRatio: string;
}

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: 'premium_bright_studio',
    label: 'Premium Clean Studio',
    style: 'Premium clean studio product photography, minimalist high-end cosmetic product image, elegant e-commerce hero shot, clean commercial beauty photography',
    background: 'Plain white, off-white, or light warm gray seamless studio background. No lifestyle scene. No decorative props. Subtle floor contact shadow only.',
    lighting: 'Bright softbox lighting, evenly lit product, soft realistic shadow under the product, gentle highlight on bottle edges, no dramatic mood, no overexposure',
    cameraDirection: 'Straight-on eye-level hero product composition, centered, upright product, label facing camera, product fills 70-80% of frame',
    negativePrompt: 'flowers, leaves, plants, crystals, stones, water drops, towels, bathroom, marble props, spa scene, lifestyle background, clutter, extra objects, extra products, fake text, changed logo, wrong label, deformed bottle, distorted cap, messy reflection, dark background, dramatic shadows, overexposed, washed out',
    aspectRatio: '1:1'
  },
  {
    id: 'premium_black_glow',
    label: 'Premium Black Glow',
    style: 'High-end luxury commercial photography, sleek and modern',
    background: 'Deep black with subtle glowing gradient or dark reflection',
    lighting: 'Dramatic studio lighting, rim light to highlight product edges, moody and elegant',
    cameraDirection: 'Eye-level, slightly dramatic angle',
    negativePrompt: 'messy, cheap, bright colors, cluttered background, deformed product',
    aspectRatio: '1:1'
  },
  {
    id: 'luxury_skincare',
    label: 'Luxury Skincare',
    style: 'Clean, elegant beauty campaign style, ultra sharp details',
    background: 'Soft pastel or neutral white/beige tones with subtle reflections',
    lighting: 'Soft diffused lighting, clean premium composition, realistic shadows',
    cameraDirection: 'Straight on, centered',
    negativePrompt: 'harsh shadows, dark background, busy, text, people',
    aspectRatio: '1:1'
  },
  {
    id: 'clean_marketplace',
    label: 'Clean Marketplace (E-commerce)',
    style: 'Standard e-commerce catalog photography, ultra clear, minimalist',
    background: 'Pure white or light grey seamless backdrop',
    lighting: 'Even studio lighting, no harsh shadows, perfectly lit product',
    cameraDirection: 'Eye-level, perfectly centered for product catalog',
    negativePrompt: 'dramatic lighting, colored background, props, reflections',
    aspectRatio: '1:1'
  },
  {
    id: 'social_ad_4_5',
    label: 'Social Media Ad (4:5)',
    style: 'Trendy, aesthetic, lifestyle product photography for Instagram/TikTok',
    background: 'Aesthetic modern surface (e.g. marble, travertine, or textured fabric)',
    lighting: 'Natural sunlight look, warm, aesthetic shadows',
    cameraDirection: 'Slightly top-down or dynamic angle',
    negativePrompt: 'boring, flat lighting, clinical, text overlays',
    aspectRatio: '3:4'
  },
  {
    id: 'natural_bathroom',
    label: 'Natural Spa / Bathroom',
    style: 'Organic, calming spa aesthetic, real-world context',
    background: 'Clean luxury bathroom vanity or spa setting (marble, wood accents, soft towels, plants)',
    lighting: 'Soft natural window light, morning glow',
    cameraDirection: 'Natural lifestyle angle',
    negativePrompt: 'dark, messy bathroom, cluttered, artificial studio lighting',
    aspectRatio: '1:1'
  }
];
