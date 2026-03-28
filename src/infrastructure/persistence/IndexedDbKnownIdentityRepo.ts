import { KnownIdentity, IKnownIdentityRepository } from '../../application/ports/IKnownIdentityRepository';

const DB_NAME = 'MykoboardDB';
const KNOWN_IDENTITIES_STORE = 'knownIdentities';
const DB_VERSION = 5;

export class IndexedDbKnownIdentityRepo implements IKnownIdentityRepository {
    private db: IDBDatabase | null = null;

    private async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(KNOWN_IDENTITIES_STORE)) {
                    db.createObjectStore(KNOWN_IDENTITIES_STORE, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    }

    async addKnownIdentity(identity: KnownIdentity): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(KNOWN_IDENTITIES_STORE, 'readwrite');
            const store = transaction.objectStore(KNOWN_IDENTITIES_STORE);
            const request = store.put(identity);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAllKnownIdentities(): Promise<KnownIdentity[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(KNOWN_IDENTITIES_STORE, 'readonly');
            const store = transaction.objectStore(KNOWN_IDENTITIES_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result as KnownIdentity[]);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteKnownIdentity(id: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(KNOWN_IDENTITIES_STORE, 'readwrite');
            const store = transaction.objectStore(KNOWN_IDENTITIES_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export const knownIdentityDb = new IndexedDbKnownIdentityRepo();
