// IndexedDB Local Audio Storage for Offline Trivia Tracks
const DB_NAME = 'TriviaAlmaAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'localAudioFiles';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return resolve(null);
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => {
        console.warn('IndexedDB opening error:', e);
        resolve(null);
      };
    });
  }
  return dbPromise;
}

/**
 * Save an audio File/Blob to IndexedDB.
 */
export async function saveAudioFile(id, file, name) {
  try {
    const db = await getDB();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        name: name || file.name,
        type: file.type || 'audio/mpeg',
        size: file.size,
        blob: file,
        createdAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error saving audio file to IndexedDB:', err);
    return null;
  }
}

/**
 * Get an audio record from IndexedDB by id.
 */
export async function getAudioFile(id) {
  try {
    const db = await getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Error reading audio file from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete an audio record by id.
 */
export async function deleteAudioFile(id) {
  try {
    const db = await getDB();
    if (!db) return;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Error deleting audio file:', err);
  }
}

/**
 * Clear all stored audio files.
 */
export async function clearAudioFiles() {
  try {
    const db = await getDB();
    if (!db) return;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Error clearing audio files:', err);
  }
}

/**
 * In-memory registry of active object URLs for fast synchronous access
 */
const activeObjectUrls = new Map();

export function createTrackObjectUrl(id, fileOrBlob) {
  if (activeObjectUrls.has(id)) {
    return activeObjectUrls.get(id);
  }
  try {
    const url = URL.createObjectURL(fileOrBlob);
    activeObjectUrls.set(id, url);
    return url;
  } catch {
    return null;
  }
}

export function revokeTrackObjectUrl(id) {
  if (activeObjectUrls.has(id)) {
    try {
      URL.revokeObjectURL(activeObjectUrls.get(id));
    } catch {
      /* ignore */
    }
    activeObjectUrls.delete(id);
  }
}

/**
 * Hydrate tracks array with fresh active Object URLs from IndexedDB if they are local files.
 */
export async function hydratePlaylistTracks(tracks) {
  if (!tracks || !Array.isArray(tracks)) return [];
  const hydrated = await Promise.all(
    tracks.map(async (item) => {
      if (!item) return null;
      if (typeof item === 'object') {
        const fileId = item.fileId || item.id;
        if (item.type === 'local' && fileId) {
          const activeUrl = activeObjectUrls.get(fileId);
          if (activeUrl) {
            return { ...item, url: activeUrl };
          }
          const record = await getAudioFile(fileId);
          if (record?.blob) {
            const freshUrl = createTrackObjectUrl(fileId, record.blob);
            return { ...item, url: freshUrl, name: record.name || item.name };
          }
        }
        return item;
      }
      return item;
    })
  );
  return hydrated.filter(Boolean);
}

