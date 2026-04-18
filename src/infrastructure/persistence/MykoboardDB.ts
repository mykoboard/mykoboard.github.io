/**
 * Single authoritative opener for the shared MykoboardDB IndexedDB database.
 *
 * All object store creation / migrations MUST live in `onupgradeneeded` here.
 * Individual repos call `getSharedDB()` instead of opening IndexedDB themselves,
 * which guarantees every store exists before any transaction is attempted.
 */

const DB_NAME = 'MykoboardDB';
export const DB_VERSION = 6; // bump whenever a new store or index is added

const STORES = {
    games: { keyPath: 'boardId' },
    hostedSessions: { keyPath: 'boardId' },
    knownIdentities: { keyPath: 'id' },
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getSharedDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            for (const [name, options] of Object.entries(STORES)) {
                if (!db.objectStoreNames.contains(name)) {
                    db.createObjectStore(name, options);
                }
            }
        };

        request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
        request.onerror = (event) => {
            dbPromise = null; // allow retry on next call
            reject((event.target as IDBOpenDBRequest).error);
        };
        request.onblocked = () => {
            console.warn('[MykoboardDB] upgrade blocked — close other tabs');
        };
    });

    return dbPromise;
}

/** Reset the cached DB connection — for use in tests only. */
export function resetSharedDB(): void {
    dbPromise = null;
}
