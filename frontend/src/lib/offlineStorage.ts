/**
 * IndexedDB offline storage for telemetry. Per Implementation Plan 14.5.
 * openDB: opens/creates td3-offline DB with telemetry store keyed by timestamp.
 * saveTelemetry: writes record and prunes to max 500 entries.
 * getRecentTelemetry: returns newest 500 records.
 */

const DB_NAME = 'td3-offline';
const DB_VERSION = 1;
const STORE_NAME = 'telemetry';
const MAX_ENTRIES = 500;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
      }
    };
  });
}

export async function saveTelemetry(entry: object): Promise<void> {
  const db = await openDB();
  const record = { ...entry, timestamp: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add(record);
    tx.oncomplete = () => {
      pruneStore(db).then(resolve).catch(reject);
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function pruneStore(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      const count = countRequest.result;
      if (count <= MAX_ENTRIES) {
        db.close();
        resolve();
        return;
      }
      const toDelete = count - MAX_ENTRIES;
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const all = getAllRequest.result as Array<{ timestamp: number }>;
        const sorted = [...all].sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < toDelete; i++) {
          store.delete(sorted[i].timestamp);
        }
        db.close();
        resolve();
      };
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getRecentTelemetry(): Promise<object[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as Array<{ timestamp: number }>;
      const sorted = [...all].sort((a, b) => b.timestamp - a.timestamp);
      const recent = sorted.slice(0, MAX_ENTRIES);
      db.close();
      resolve(recent);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}
