/**
 * Product Workspace Service
 * 
 * Manages client-side persistence of uploaded product assets using IndexedDB.
 * This allows users to reuse uploaded products without re-uploading, and prevents
 * hitting localStorage size limits with base64 images.
 */

import { UploadedProductAsset } from '../types';
import { getSessionId } from '../utils/session';

const DB_NAME = 'studio_glow_product_workspace_db';
const DB_VERSION = 1;
const STORE_NAME = 'uploaded_products';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('lastUsedAt', 'lastUsedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// In-memory fallback if IndexedDB fails (e.g. strict private browsing mode)
let memoryStore: UploadedProductAsset[] = [];

export const saveUploadedProduct = async (
  data: {
    mainImageDataUrl: string;
    mainMimeType?: string;
    packagingImageDataUrl?: string;
    packagingMimeType?: string;
    mainFileName?: string;
    packagingFileName?: string;
    lastPresetId?: string;
    id?: string;
  }
): Promise<UploadedProductAsset> => {
  const sessionId = getSessionId();
  const now = new Date().toISOString();

  // Try to find if an identical main product already exists in this session
  const existingList = await getUploadedProducts(sessionId);
  const existing = existingList.find(
    (item) => item.mainImageDataUrl === data.mainImageDataUrl
  );

  const asset: UploadedProductAsset = {
    id: existing?.id || data.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    sessionId,
    mainImageDataUrl: data.mainImageDataUrl,
    mainMimeType: data.mainMimeType || 'image/png',
    packagingImageDataUrl: data.packagingImageDataUrl || existing?.packagingImageDataUrl,
    packagingMimeType: data.packagingMimeType || existing?.packagingMimeType,
    mainFileName: data.mainFileName || existing?.mainFileName || 'Product Image',
    packagingFileName: data.packagingFileName || existing?.packagingFileName,
    createdAt: existing?.createdAt || now,
    lastUsedAt: now,
    lastPresetId: data.lastPresetId || existing?.lastPresetId,
    renderCount: existing?.renderCount || 0,
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(asset);
      req.onsuccess = () => resolve(asset);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Falling back to memory store for product upload history:', err);
    const idx = memoryStore.findIndex((i) => i.id === asset.id);
    if (idx >= 0) {
      memoryStore[idx] = asset;
    } else {
      memoryStore.unshift(asset);
    }
    return asset;
  }
};

export const getUploadedProducts = async (
  sessionId?: string
): Promise<UploadedProductAsset[]> => {
  const sid = sessionId || getSessionId();

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result as UploadedProductAsset[]) || [];
        const filtered = results
          .filter((item) => item.sessionId === sid)
          .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
        resolve(filtered);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return memoryStore.filter((item) => item.sessionId === sid);
  }
};

export const deleteUploadedProduct = async (id: string): Promise<boolean> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    memoryStore = memoryStore.filter((item) => item.id !== id);
    return true;
  }
};

export const clearUploadedProducts = async (sessionId?: string): Promise<boolean> => {
  const sid = sessionId || getSessionId();
  try {
    const items = await getUploadedProducts(sid);
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const item of items) {
      store.delete(item.id);
    }
    return true;
  } catch (err) {
    memoryStore = memoryStore.filter((item) => item.sessionId !== sid);
    return true;
  }
};

export const incrementProductRenderCount = async (productAssetId: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(productAssetId);

    getReq.onsuccess = () => {
      const asset = getReq.result as UploadedProductAsset | undefined;
      if (asset) {
        asset.renderCount = (asset.renderCount || 0) + 1;
        asset.lastUsedAt = new Date().toISOString();
        store.put(asset);
      }
    };
  } catch (err) {
    const asset = memoryStore.find((i) => i.id === productAssetId);
    if (asset) {
      asset.renderCount = (asset.renderCount || 0) + 1;
      asset.lastUsedAt = new Date().toISOString();
    }
  }
};
