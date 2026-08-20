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
  aspectRatio?: string;
  outputQuality?: string;
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

export interface PhotoshootMetadata {
  presetId?: string;
  aspectRatio?: string;
  outputQuality?: string;
  model?: string;
  durationMs?: number;
}

export interface PhotoshootResponse {
  imageUrl: string;
  metadata?: PhotoshootMetadata;
}

