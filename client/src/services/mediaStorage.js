/**
 * mediaStorage — Persist video File objects in IndexedDB.
 *
 * Keyed by roomId. When the host refreshes the page, we can restore
 * the exact File object they had selected, recreate a blob URL,
 * and reload the video without them having to re-pick it.
 *
 * We also save currentTime to sessionStorage so we can seek back
 * to the right position after refresh.
 */

const DB_NAME = 'play-together-media'
const STORE_NAME = 'files'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'roomId' })
      }
    }

    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Save a File object and playback position for a room.
 * @param {string} roomId
 * @param {File} file
 * @param {number} currentTime  — seconds, to restore seek position
 */
export async function saveMediaFile(roomId, file, currentTime = 0) {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put({
        roomId,
        file,
        name: file.name,
        mimeType: file.type,
        currentTime,
      })
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('[mediaStorage] save failed:', err)
  }
}

/**
 * Update only the saved currentTime for a room (called on time updates).
 * @param {string} roomId
 * @param {number} currentTime
 */
export async function updateSavedTime(roomId, currentTime) {
  try {
    const db = await openDB()
    const existing = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(roomId)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    if (!existing) return
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put({ ...existing, currentTime })
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Silently ignore — time updates are frequent, failures are OK
  }
}

/**
 * Load a saved File + currentTime for a room.
 * @param {string} roomId
 * @returns {{ file: File, name: string, mimeType: string, currentTime: number } | null}
 */
export async function loadMediaFile(roomId) {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(roomId)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[mediaStorage] load failed:', err)
    return null
  }
}

/**
 * Delete the saved file for a room (call when host deliberately leaves).
 * @param {string} roomId
 */
export async function clearMediaFile(roomId) {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(roomId)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('[mediaStorage] clear failed:', err)
  }
}
