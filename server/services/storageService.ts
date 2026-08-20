/**
 * Storage Service Abstraction for Studio Glow
 * 
 * Environment variables for Production:
 * - GCS_BUCKET_NAME: Google Cloud Storage bucket name
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account json (optional on Cloud Run with default SA)
 * - GEMINI_API_KEY: Gemini API Key
 * - GEMINI_MODEL: Optional Gemini Model override
 */

export interface ImageUploadMetadata {
  jobId?: string;
  sessionId?: string;
  type?: 'input' | 'packaging' | 'generated';
  mimeType?: string;
}

export interface IStorageService {
  uploadGeneratedImage(dataUrl: string, metadata?: ImageUploadMetadata): Promise<string>;
  uploadInputImage(dataUrl: string, metadata?: ImageUploadMetadata): Promise<string>;
  deleteImage(pathOrUrl: string): Promise<boolean>;
}

class StorageService implements IStorageService {
  private bucketName: string | undefined;
  private isConfigured: boolean;
  // In-memory cache for development mode
  private memoryStore: Map<string, { data: string; mimeType: string; createdAt: number }>;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME;
    this.isConfigured = Boolean(this.bucketName);
    this.memoryStore = new Map();
  }

  /**
   * Upload generated output image
   * In local/stateless mode without GCS, returns the data URL directly or in-memory key
   */
  async uploadGeneratedImage(dataUrl: string, metadata?: ImageUploadMetadata): Promise<string> {
    if (!this.isConfigured) {
      // Local / Development fallback: store data URL directly
      return dataUrl;
    }

    // Production GCS integration placeholder
    // When @google-cloud/storage is installed and GCS_BUCKET_NAME is set:
    // 1. Convert base64 dataUrl to Buffer
    // 2. Upload to `gs://${this.bucketName}/generated/${metadata?.sessionId}/${metadata?.jobId || Date.now()}.png`
    // 3. Return public/signed URL
    return dataUrl;
  }

  /**
   * Upload input product image
   */
  async uploadInputImage(dataUrl: string, metadata?: ImageUploadMetadata): Promise<string> {
    if (!this.isConfigured) {
      return dataUrl;
    }

    return dataUrl;
  }

  /**
   * Delete image by URL/path
   */
  async deleteImage(pathOrUrl: string): Promise<boolean> {
    if (this.memoryStore.has(pathOrUrl)) {
      this.memoryStore.delete(pathOrUrl);
      return true;
    }
    return true;
  }
}

export const storageService = new StorageService();
