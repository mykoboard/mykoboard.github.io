import { KnownIdentity, IKnownIdentityRepository } from '../../application/ports/IKnownIdentityRepository';
import { getSharedDB } from './MykoboardDB';

const KNOWN_IDENTITIES_STORE = 'knownIdentities';

export class IndexedDbKnownIdentityRepo implements IKnownIdentityRepository {
    private db: IDBDatabase | null = null;

    private async getDB(): Promise<IDBDatabase> {
        if (!this.db) this.db = await getSharedDB();
        return this.db;
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

