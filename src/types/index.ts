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

export interface PhotoRecipe {
  images: { data: string; mimeType: string }[];
  presetId: string;
  aspectRatio?: string;
  outputQuality?: string;
  sessionId?: string;
  secondaryRole?: SecondaryReferenceRole;
  compositionMode?: CompositionMode;
  secondaryScale?: 'small' | 'medium' | 'large';
  secondaryPlacement?: 'left' | 'right' | 'behind' | 'background';
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
  mode?: 'default' | 'rerender' | 'variation';
  originalJobId?: string;
  presetId?: string;
  aspectRatio?: string;
  outputQuality?: string;
  model?: string;
  durationMs?: number;
  secondaryRole?: SecondaryReferenceRole;
  compositionMode?: CompositionMode;
  secondaryScale?: string;
  secondaryPlacement?: string;
}

export interface PhotoshootResponse {
  success?: boolean;
  jobId?: string;
  imageUrl: string;
  metadata?: PhotoshootMetadata;
}

export type PhotoshootJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PhotoshootJob {
  id: string;
  sessionId: string;
  status: PhotoshootJobStatus;
  presetId: string;
  aspectRatio: string;
  outputQuality: string;
  model: string;
  mainImageUrl: string;
  packagingImageUrl?: string;
  resultImageUrl?: string;
  promptText: string;
  negativePrompt?: string;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  originalJobId?: string;
  mode?: 'default' | 'rerender' | 'variation';
  secondaryRole?: SecondaryReferenceRole;
  compositionMode?: CompositionMode;
  secondaryScale?: string;
  secondaryPlacement?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedProductAsset {
  id: string;
  sessionId: string;
  mainImageDataUrl: string;
  mainMimeType?: string;
  packagingImageDataUrl?: string;
  packagingMimeType?: string;
  mainFileName?: string;
  packagingFileName?: string;
  createdAt: string;
  lastUsedAt: string;
  lastPresetId?: string;
  renderCount?: number;
}
