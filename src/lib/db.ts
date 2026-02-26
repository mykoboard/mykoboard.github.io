import { LedgerEntry } from '@mykoboard/integration';

export interface GameParticipant {
    id: string;
    name: string;
    isYou: boolean;
    isHost: boolean;
    publicKey?: string;
}

export interface GameSession {
    gameId: string;
    boardId: string;
    playerName: string;
    lastPlayed: number;
    gameName: string;
    status: 'active' | 'finished';
    ledger: LedgerEntry[];
    participants?: GameParticipant[];
}


export interface KnownIdentity {
    id: string; // Node Identifier
    publicKey: string;
    name: string; // Display Name
    addedAt: number;
}

export interface HostedSession {
    boardId: string; // Primary key
    gameId: string;
    createdAt: number;
    maxPlayers: number;
}

const DB_NAME = 'MykoboardDB';
const STORE_NAME = 'games';
const KNOWN_IDENTITIES_STORE = 'knownIdentities';
const HOSTED_SESSIONS_STORE = 'hostedSessions';
const DB_VERSION = 5; // Increment for renaming friends to knownIdentities

export class MykoboardDB {
    private db: IDBDatabase | null = null;

    private async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'boardId' });
                }
                if (!db.objectStoreNames.contains(KNOWN_IDENTITIES_STORE)) {
                    db.createObjectStore(KNOWN_IDENTITIES_STORE, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(HOSTED_SESSIONS_STORE)) {
                    db.createObjectStore(HOSTED_SESSIONS_STORE, { keyPath: 'boardId' });
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

    async saveGame(game: GameSession): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(game);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getGame(boardId: string): Promise<GameSession | null> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(boardId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllGames(): Promise<GameSession[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const games = request.result as GameSession[];
                // Sort by lastPlayed descending
                resolve(games.sort((a, b) => b.lastPlayed - a.lastPlayed));
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteGame(boardId: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(boardId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllGames(): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
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

    // Hosted Sessions Management
    async markAsHosting(boardId: string, gameId: string, maxPlayers: number): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(HOSTED_SESSIONS_STORE, 'readwrite');
            const store = transaction.objectStore(HOSTED_SESSIONS_STORE);
            const session: HostedSession = {
                boardId,
                gameId,
                createdAt: Date.now(),
                maxPlayers
            };
            const request = store.put(session);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async isHosting(boardId: string): Promise<boolean> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(HOSTED_SESSIONS_STORE, 'readonly');
            const store = transaction.objectStore(HOSTED_SESSIONS_STORE);
            const request = store.get(boardId);

            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async cleanupOldHostedSessions(): Promise<void> {
        const db = await this.getDB();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(HOSTED_SESSIONS_STORE, 'readwrite');
            const store = transaction.objectStore(HOSTED_SESSIONS_STORE);
            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const session = cursor.value as HostedSession;
                    if (session.createdAt < oneDayAgo) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }
}

export const db = new MykoboardDB();
