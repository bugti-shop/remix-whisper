// IndexedDB storage for task media (images + voice recordings)
// Uses IndexedDB with persistent storage for unlimited capacity on native devices

export type TaskMediaKind = 'image' | 'audio';

// Memory cache for resolved URLs
const cache = new Map<string, string>();

// ============ Persistent Storage (Unlimited Quota) ============

// Request persistent storage for unlimited quota (removes browser restrictions)
const requestPersistentStorage = async (): Promise<boolean> => {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return isPersisted;
    }
  } catch (e) {
    console.warn('Persistent storage request failed:', e);
  }
  return false;
};

// Initialize persistent storage on module load for unlimited capacity
requestPersistentStorage().then(granted => {
  if (granted) {
    console.log('Persistent storage granted - unlimited capacity available');
  }
});

// ============ Reference Helpers ============

export const makeTaskMediaRef = (kind: TaskMediaKind, id: string) => `idb:${kind}:${id}`;

export const parseTaskMediaRef = (
  ref: string
): { kind: TaskMediaKind; id: string } | null => {
  // Support both idb: and legacy fs: refs
  if (!ref.startsWith('idb:') && !ref.startsWith('fs:')) return null;
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

// ============ Public API (Uses IndexedDB for all platforms) ============

export const saveTaskMedia = async (kind: TaskMediaKind, id: string, dataUrl: string): Promise<void> => {
  await saveToIndexedDB(kind, id, dataUrl);
  cache.set(makeTaskMediaRef(kind, id), dataUrl);
};

export const getTaskMedia = async (kind: TaskMediaKind, id: string): Promise<string | null> => {
  const ref = makeTaskMediaRef(kind, id);
  const cached = cache.get(ref);
  if (cached) return cached;

  const dataUrl = await getFromIndexedDB(kind, id);

  if (dataUrl) {
    cache.set(ref, dataUrl);
  }
  return dataUrl;
};

export const deleteTaskMedia = async (kind: TaskMediaKind, id: string): Promise<void> => {
  await deleteFromIndexedDB(kind, id);
  cache.delete(makeTaskMediaRef(kind, id));
};

export const resolveTaskMediaUrl = async (refOrUrl: string): Promise<string> => {
  const parsed = parseTaskMediaRef(refOrUrl);
  if (!parsed) return refOrUrl;

  const dataUrl = await getTaskMedia(parsed.kind, parsed.id);
  return dataUrl || '';
};

// ============ Storage Info ============

export const getStorageInfo = async (): Promise<{ used: number; available: number; persistent: boolean } | null> => {
  if (navigator.storage) {
    const [estimate, persistent] = await Promise.all([
      navigator.storage.estimate?.() || Promise.resolve({ usage: 0, quota: 0 }),
      navigator.storage.persisted?.() || Promise.resolve(false)
    ]);
    return {
      used: estimate.usage || 0,
      // When persistent, storage is unlimited (device capacity)
      available: persistent ? Infinity : (estimate.quota || 0),
      persistent
    };
  }
  return null;
};

// Force request persistent storage (call during app init if needed)
export const ensureUnlimitedStorage = requestPersistentStorage;
