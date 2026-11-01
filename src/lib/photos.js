const DB_NAME = 'hard75-photos';
const STORE = 'photos';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export const getPhoto = (day) => transact('readonly', (store) => store.get(day));
export const savePhoto = (day, file) => transact('readwrite', (store) => store.put(file, day));
export const deletePhoto = (day) => transact('readwrite', (store) => store.delete(day));
export const clearPhotos = async () => transact('readwrite', (store) => store.clear());

