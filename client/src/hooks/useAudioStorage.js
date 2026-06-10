const DB_NAME = 'reportease_audio';
const STORE   = 'recordings';
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'sessionId' });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveCheckpoint(sessionId, blob, mimeType) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ sessionId, blob, mimeType, savedAt: Date.now() });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch { /* non-critical */ }
}

export async function loadCheckpoint(sessionId) {
  try {
    const db     = await openDB();
    const tx     = db.transaction(STORE, 'readonly');
    const result = await new Promise((res, rej) => {
      const req = tx.objectStore(STORE).get(sessionId);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror   = () => rej(req.error);
    });
    db.close();
    return result;
  } catch { return null; }
}

export async function clearCheckpoint(sessionId) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(sessionId);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch { /* non-critical */ }
}
