import { ISessionRepository } from '../ISessionRepository';
import { GameSession } from '../../../domain/game-session/GameSession';

export class MockSessionRepo implements ISessionRepository {
    private games: Map<string, GameSession> = new Map();
    private hostingMap: Set<string> = new Set();

    async saveGame(game: GameSession): Promise<void> {
        this.games.set(game.boardId, game);
    }

    async getGame(boardId: string): Promise<GameSession | null> {
        return this.games.get(boardId) || null;
    }

    async getAllGames(): Promise<GameSession[]> {
        return Array.from(this.games.values());
    }

    async deleteGame(boardId: string): Promise<void> {
        this.games.delete(boardId);
        this.hostingMap.delete(boardId);
    }

    async clearAllGames(): Promise<void> {
        this.games.clear();
        this.hostingMap.clear();
    }

    async markAsHosting(boardId: string, gameId: string, maxPlayers: number): Promise<void> {
        this.hostingMap.add(boardId);
    }

    async isHosting(boardId: string): Promise<boolean> {
        return this.hostingMap.has(boardId);
    }

    async cleanupOldHostedSessions(): Promise<void> {
        // No-op
    }

    // Test helper
    public setHosting(boardId: string): void {
        this.hostingMap.add(boardId);
    }
}
