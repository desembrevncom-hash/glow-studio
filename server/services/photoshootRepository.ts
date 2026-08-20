/**
 * Photoshoot Repository for Studio Glow
 * 
 * Abstraction layer for photoshoot jobs and render history.
 * Structured so Supabase/PostgreSQL/Firestore can be plugged in seamlessly.
 */

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
  createdAt: string;
  updatedAt: string;
}

export interface IPhotoshootRepository {
  createJob(job: Omit<PhotoshootJob, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<PhotoshootJob>;
  getJobById(id: string): Promise<PhotoshootJob | null>;
  getJobsBySessionId(sessionId: string, limit?: number): Promise<PhotoshootJob[]>;
  updateJob(id: string, updates: Partial<PhotoshootJob>): Promise<PhotoshootJob | null>;
  deleteJob(id: string, sessionId?: string): Promise<boolean>;
}

class InMemoryPhotoshootRepository implements IPhotoshootRepository {
  private jobs: Map<string, PhotoshootJob> = new Map();
  private maxJobsPerSession: number = 50;

  async createJob(jobData: Omit<PhotoshootJob, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<PhotoshootJob> {
    const id = jobData.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const job: PhotoshootJob = {
      ...jobData,
      id,
      createdAt: now,
      updatedAt: now
    };

    // Enforce max history limit per session
    const sessionJobs = await this.getJobsBySessionId(job.sessionId);
    if (sessionJobs.length >= this.maxJobsPerSession) {
      // Remove oldest
      const oldest = sessionJobs[sessionJobs.length - 1];
      this.jobs.delete(oldest.id);
    }

    this.jobs.set(id, job);
    return job;
  }

  async getJobById(id: string): Promise<PhotoshootJob | null> {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  async getJobsBySessionId(sessionId: string, limit: number = 50): Promise<PhotoshootJob[]> {
    const results: PhotoshootJob[] = [];
    for (const job of this.jobs.values()) {
      if (job.sessionId === sessionId) {
        results.push({ ...job });
      }
    }
    // Sort descending by createdAt (newest first)
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results.slice(0, limit);
  }

  async updateJob(id: string, updates: Partial<PhotoshootJob>): Promise<PhotoshootJob | null> {
    const existing = this.jobs.get(id);
    if (!existing) return null;

    const updated: PhotoshootJob = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.jobs.set(id, updated);
    return { ...updated };
  }

  async deleteJob(id: string, sessionId?: string): Promise<boolean> {
    const existing = this.jobs.get(id);
    if (!existing) return false;
    if (sessionId && existing.sessionId !== sessionId) return false;

    return this.jobs.delete(id);
  }
}

export const photoshootRepository: IPhotoshootRepository = new InMemoryPhotoshootRepository();
