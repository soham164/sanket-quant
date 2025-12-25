import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'sanket-offline';
const STORE_NAME = 'reports';
const DB_VERSION = 1;

// Open IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

export const useOfflineQueue = () => {
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queue from IndexedDB
  const loadQueue = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve) => {
        request.onsuccess = () => {
          setQueue(request.result || []);
          resolve(request.result || []);
        };
        request.onerror = () => resolve([]);
      });
    } catch (err) {
      console.error('Failed to load offline queue:', err);
      return [];
    }
  }, []);

  // Add report to queue
  const addToQueue = useCallback(async (report) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const queuedReport = {
        ...report,
        queuedAt: new Date().toISOString(),
        status: 'pending',
      };

      await new Promise((resolve, reject) => {
        const request = store.add(queuedReport);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      await loadQueue();
      return true;
    } catch (err) {
      console.error('Failed to add to queue:', err);
      return false;
    }
  }, [loadQueue]);

  // Remove report from queue
  const removeFromQueue = useCallback(async (id) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      await new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      await loadQueue();
    } catch (err) {
      console.error('Failed to remove from queue:', err);
    }
  }, [loadQueue]);

  // Sync queue with server
  const syncQueue = useCallback(async (submitFn) => {
    if (!isOnline || syncing || queue.length === 0) return;

    setSyncing(true);
    const results = [];

    for (const report of queue) {
      try {
        await submitFn(report);
        await removeFromQueue(report.id);
        results.push({ id: report.id, success: true });
      } catch (err) {
        results.push({ id: report.id, success: false, error: err.message });
      }
    }

    setSyncing(false);
    return results;
  }, [isOnline, syncing, queue, removeFromQueue]);

  // Load queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Register for background sync
  useEffect(() => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        if (queue.length > 0) {
          registration.sync.register('sync-reports').catch(console.error);
        }
      });
    }
  }, [queue.length]);

  return {
    queue,
    isOnline,
    syncing,
    queueLength: queue.length,
    addToQueue,
    removeFromQueue,
    syncQueue,
    loadQueue,
  };
};

export default useOfflineQueue;
