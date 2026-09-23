import type { NewSalePayload, PendingSale } from './types';

/**
 * Cola de ventas pendientes en IndexedDB.
 *
 * Cuando el negocio no tiene internet, la venta se guarda aquí y se reintenta
 * automáticamente al recuperar la conexión. El POS nunca se bloquea por red.
 */
const DB_NAME = 'kubo-offline';
const DB_VERSION = 1;
const STORE = 'pending-sales';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No fue posible abrir IndexedDB'));
  });
}

function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const tx = database.transaction(STORE, mode);
        const request = operation(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Fallo en IndexedDB'));
        tx.oncomplete = () => database.close();
      })
  );
}

export async function enqueueSale(payload: NewSalePayload, label: string): Promise<PendingSale> {
  const pending: PendingSale = {
    id: crypto.randomUUID(),
    payload,
    createdAt: new Date().toISOString(),
    label
  };
  await transaction('readwrite', (store) => store.add(pending));
  return pending;
}

export async function listPendingSales(): Promise<PendingSale[]> {
  const items = await transaction<PendingSale[]>('readonly', (store) => store.getAll());
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removePendingSale(id: string): Promise<void> {
  await transaction('readwrite', (store) => store.delete(id));
}

export async function countPendingSales(): Promise<number> {
  const total = await transaction<number>('readonly', (store) => store.count());
  return total;
}
