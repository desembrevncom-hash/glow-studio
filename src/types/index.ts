export interface ProcessingResult {
  imageUrl: string;
  originalUrl: string;
  prompt: string;
}

export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface PhotoRecipe {
  images: { data: string; mimeType: string }[];
  presetId: string;
}

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
