// Native Filesystem storage for task media (images + voice recordings)
// Uses Capacitor Filesystem for unlimited device storage on mobile
// Falls back to IndexedDB for web browser

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export type TaskMediaKind = 'image' | 'audio';

const MEDIA_FOLDER = 'task-media';
const isNative = Capacitor.isNativePlatform();

// Memory cache for resolved URLs
const cache = new Map<string, string>();

// ============ Reference Helpers ============

export const makeTaskMediaRef = (kind: TaskMediaKind, id: string) => `fs:${kind}:${id}`;

export const parseTaskMediaRef = (
  ref: string
): { kind: TaskMediaKind; id: string } | null => {
  // Support both new fs: and legacy idb: refs
  if (!ref.startsWith('fs:') && !ref.startsWith('idb:')) return null;
  const parts = ref.split(':');
  if (parts.length < 3) return null;
  const kind = parts[1] as TaskMediaKind;
  if (kind !== 'image' && kind !== 'audio') return null;
  const id = parts.slice(2).join(':');
  if (!id) return null;
  return { kind, id };
};

export const isTaskMediaRef = (ref?: string | null) => {
  if (!ref) return false;
  return !!parseTaskMediaRef(ref);
};

// ============ File Path Helpers ============

const getFilePath = (kind: TaskMediaKind, id: string): string => {
  const ext = kind === 'image' ? 'png' : 'webm';
  return `${MEDIA_FOLDER}/${kind}/${id}.${ext}`;
};

const getBase64FromDataUrl = (dataUrl: string): string => {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.substring(idx + 1) : dataUrl;
};

const getMimeFromDataUrl = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:([^;,]+)/);
  return match ? match[1] : 'application/octet-stream';
};

// ============ Native Filesystem Functions ============

const ensureDirectory = async (kind: TaskMediaKind): Promise<void> => {
  try {
    await Filesystem.mkdir({
      path: `${MEDIA_FOLDER}/${kind}`,
      directory: Directory.Data,
      recursive: true,
    });
  } catch (e: any) {
    // Directory might already exist
    if (!e.message?.includes('exists')) {
      console.warn('mkdir warning:', e);
    }
  }
};

const saveToFilesystem = async (kind: TaskMediaKind, id: string, dataUrl: string): Promise<void> => {
  await ensureDirectory(kind);
  const path = getFilePath(kind, id);
  const base64 = getBase64FromDataUrl(dataUrl);
  
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Data,
  });
};

const getFromFilesystem = async (kind: TaskMediaKind, id: string): Promise<string | null> => {
  try {
    const path = getFilePath(kind, id);
    const result = await Filesystem.readFile({
      path,
      directory: Directory.Data,
    });
    
    // Reconstruct data URL
    const mimeType = kind === 'image' ? 'image/png' : 'audio/webm';
    const base64 = typeof result.data === 'string' ? result.data : '';
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    console.warn('File not found:', e);
    return null;
  }
};

const deleteFromFilesystem = async (kind: TaskMediaKind, id: string): Promise<void> => {
  try {
    const path = getFilePath(kind, id);
    await Filesystem.deleteFile({
      path,
      directory: Directory.Data,
    });
  } catch (e) {
    console.warn('Delete file warning:', e);
  }
};

// ============ IndexedDB Fallback for Web ============

const DB_NAME = 'nota-task-media-db';
const DB_VERSION = 1;
const STORES: Record<TaskMediaKind, string> = {
  image: 'task-images',
  audio: 'task-audio',
};

interface MediaRecord {
  id: string;
  dataUrl: string;
  createdAt: string;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      (Object.keys(STORES) as TaskMediaKind[]).forEach((kind) => {
        const storeName = STORES[kind];
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
};

const saveToIndexedDB = async (kind: TaskMediaKind, id: string, dataUrl: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES[kind], 'readwrite');
    const store = transaction.objectStore(STORES[kind]);

    const record: MediaRecord = {
      id,
      dataUrl,
      createdAt: new Date().toISOString(),
    };

    const request = store.put(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
  });
};

const getFromIndexedDB = async (kind: TaskMediaKind, id: string): Promise<string | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES[kind], 'readonly');
    const store = transaction.objectStore(STORES[kind]);

    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const record = request.result as MediaRecord | undefined;
      resolve(record?.dataUrl || null);
    };
    transaction.oncomplete = () => db.close();
  });
};

const deleteFromIndexedDB = async (kind: TaskMediaKind, id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES[kind], 'readwrite');
    const store = transaction.objectStore(STORES[kind]);

    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
  });
};

// ============ Public API (Auto-selects native vs web) ============

export const saveTaskMedia = async (kind: TaskMediaKind, id: string, dataUrl: string): Promise<void> => {
  if (isNative) {
    await saveToFilesystem(kind, id, dataUrl);
  } else {
    await saveToIndexedDB(kind, id, dataUrl);
  }
  cache.set(makeTaskMediaRef(kind, id), dataUrl);
};

export const getTaskMedia = async (kind: TaskMediaKind, id: string): Promise<string | null> => {
  const ref = makeTaskMediaRef(kind, id);
  const cached = cache.get(ref);
  if (cached) return cached;

  let dataUrl: string | null = null;
  
  if (isNative) {
    dataUrl = await getFromFilesystem(kind, id);
  } else {
    dataUrl = await getFromIndexedDB(kind, id);
  }

  if (dataUrl) {
    cache.set(ref, dataUrl);
  }
  return dataUrl;
};

export const deleteTaskMedia = async (kind: TaskMediaKind, id: string): Promise<void> => {
  if (isNative) {
    await deleteFromFilesystem(kind, id);
  } else {
    await deleteFromIndexedDB(kind, id);
  }
  cache.delete(makeTaskMediaRef(kind, id));
};

export const resolveTaskMediaUrl = async (refOrUrl: string): Promise<string> => {
  const parsed = parseTaskMediaRef(refOrUrl);
  if (!parsed) return refOrUrl;

  const dataUrl = await getTaskMedia(parsed.kind, parsed.id);
  return dataUrl || '';
};

// ============ Storage Info ============

export const getStorageInfo = async (): Promise<{ used: number; available: number } | null> => {
  if (!isNative) {
    // Web: estimate from navigator.storage
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      };
    }
    return null;
  }
  
  // Native: no easy way to get total, but files are stored in app's data directory
  // which has essentially unlimited capacity (device storage)
  return null;
};
