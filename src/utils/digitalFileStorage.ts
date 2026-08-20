// src/utils/digitalFileStorage.ts
// Robust IndexedDB + In-Memory cache storage for large PDF and document files

const DB_NAME = 'UniversityLibraryFilesDB';
const STORE_NAME = 'digital_files';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// In-memory fast cache map
const memoryFileMap = new Map<string, string>();

export const digitalFileStorage = {
  async saveFile(id: string, dataUrl: string, fileName?: string, mimeType?: string): Promise<void> {
    if (!id || !dataUrl) return;
    memoryFileMap.set(id, dataUrl);
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ id, dataUrl, fileName, mimeType, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('IndexedDB save failed, using in-memory store:', e);
    }
  },

  async getFile(id: string): Promise<string | null> {
    if (memoryFileMap.has(id)) {
      return memoryFileMap.get(id) || null;
    }
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          const res = req.result?.dataUrl || null;
          if (res) memoryFileMap.set(id, res);
          resolve(res);
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },

  getSyncFile(id: string): string | null {
    return memoryFileMap.get(id) || null;
  },

  async deleteFile(id: string): Promise<void> {
    memoryFileMap.delete(id);
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
    } catch (e) {}
  }
};
