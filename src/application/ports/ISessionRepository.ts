import { Ref } from 'vue';
import { GameSession } from '../../domain/game-session/GameSession';

export interface ISessionRepository {
    readonly activeSessions: Ref<GameSession[]>;
    saveGame(game: GameSession): Promise<void>;
    getGame(boardId: string): Promise<GameSession | null>;
    getAllGames(): Promise<GameSession[]>;
    deleteGame(boardId: string): Promise<void>;
    clearAllGames(): Promise<void>;
    markAsHosting(boardId: string, gameId: string, maxPlayers: number): Promise<void>;
    isHosting(boardId: string): Promise<boolean>;
    cleanupOldHostedSessions(): Promise<void>;
}
