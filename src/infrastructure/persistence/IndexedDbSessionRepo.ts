import { GameSession, HostedSession } from '../../domain/game-session/GameSession';
import { ISessionRepository } from '../../application/ports/ISessionRepository';
import { ref } from 'vue';
import { getSharedDB } from './MykoboardDB';

const STORE_NAME = 'games';
const HOSTED_SESSIONS_STORE = 'hostedSessions';

export class IndexedDbSessionRepo implements ISessionRepository {
    private db: IDBDatabase | null = null;
    public readonly activeSessions = ref<GameSession[]>([]);

    private async getDB(): Promise<IDBDatabase> {
        if (!this.db) this.db = await getSharedDB();
        return this.db;
    }

    async saveGame(game: GameSession): Promise<void> {
        const db = await this.getDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(game);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        await this.getAllGames(); // Refresh reactive sessions
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
        const games = await new Promise<GameSession[]>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const res = request.result as GameSession[];
                resolve(res.sort((a, b) => b.lastPlayed - a.lastPlayed));
            };
            request.onerror = () => reject(request.error);
        });
        this.activeSessions.value = games;
        return games;
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

