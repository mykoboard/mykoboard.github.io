import { LedgerEntry } from '@mykoboard/integration';

export interface GameParticipant {
    id: string;
    name: string;
    isYou: boolean;
    isHost: boolean;
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

export interface Friend {
    id: string; // Node Identifier
    publicKey: string;
    name: string; // Display Name
    addedAt: number;
}

const DB_NAME = 'MykoboardDB';
const STORE_NAME = 'games';
const FRIENDS_STORE = 'friends';
const DB_VERSION = 3;

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
                if (!db.objectStoreNames.contains(FRIENDS_STORE)) {
                    db.createObjectStore(FRIENDS_STORE, { keyPath: 'id' });
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

    async addFriend(friend: Friend): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(FRIENDS_STORE, 'readwrite');
            const store = transaction.objectStore(FRIENDS_STORE);
            const request = store.put(friend);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFriends(): Promise<Friend[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(FRIENDS_STORE, 'readonly');
            const store = transaction.objectStore(FRIENDS_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result as Friend[]);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFriend(id: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(FRIENDS_STORE, 'readwrite');
            const store = transaction.objectStore(FRIENDS_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export const db = new MykoboardDB();
