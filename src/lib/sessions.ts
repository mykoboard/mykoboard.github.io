import { db, GameSession } from './db';

export const SessionManager = {
    async getSessions(): Promise<GameSession[]> {
        try {
            return await db.getAllGames();
        } catch (e) {
            console.error("Failed to load sessions", e);
            return [];
        }
    },

    async getSession(boardId: string): Promise<GameSession | null> {
        try {
            return await db.getGame(boardId);
        } catch (e) {
            console.error("Failed to load session", e);
            return null;
        }
    },

    async saveSession(session: Omit<GameSession, 'ledger' | 'participants'> & { ledger?: any[], participants?: any[] }) {
        try {
            const existing = await db.getGame(session.boardId);
            const status = session.status || existing?.status || 'active';
            const ledger = session.ledger || existing?.ledger || [];

            // Merge participants based on ID
            const incomingParticipants = session.participants || [];
            const existingParticipants = existing?.participants || [];

            const participantMap = new Map();
            // Fill with existing
            existingParticipants.forEach(p => participantMap.set(p.id, p));
            // Overwrite/Add with incoming
            incomingParticipants.forEach(p => participantMap.set(p.id, p));

            const participants = Array.from(participantMap.values());

            const fullSession: GameSession = {
                ...session,
                status,
                ledger,
                participants,
                lastPlayed: Date.now()
            };

            await db.saveGame(fullSession);
        } catch (e) {
            console.error("Failed to save session", e);
        }
    },

    async updateStatus(boardId: string, status: 'active' | 'finished') {
        try {
            const session = await db.getGame(boardId);
            if (session) {
                session.status = status;
                await db.saveGame(session);
            }
        } catch (e) {
            console.error("Failed to update status", e);
        }
    },

    async updateLedger(boardId: string, ledger: any[]) {
        try {
            const session = await db.getGame(boardId);
            if (session) {
                session.ledger = ledger;
                session.lastPlayed = Date.now();
                await db.saveGame(session);
            }
        } catch (e) {
            console.error("Failed to update ledger", e);
        }
    },

    async removeSession(boardId: string) {
        try {
            await db.deleteGame(boardId);
        } catch (e) {
            console.error("Failed to remove session", e);
        }
    }
};
