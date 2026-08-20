import { PhotoPreset } from '../types';

export const PHOTO_PRESETS: PhotoPreset[] = [
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
    aspectRatio: '3:4' // Approximating 4:5 for standard Gemini supported ratios
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