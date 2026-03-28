import { describe, expect, it, beforeEach } from 'bun:test';
import { IndexedDbSessionRepo } from './IndexedDbSessionRepo';
import { setupInfraMocks } from '../../tests/infrastructure-mocks';
import { GameSession } from '../../domain/game-session/GameSession';

describe('IndexedDbSessionRepo', () => {
    let repo: IndexedDbSessionRepo;

    beforeEach(async () => {
        setupInfraMocks();
        repo = new IndexedDbSessionRepo();
        // Clear the mock DB before each test
        const db = (global as any).indexedDB.open('MykoboardDB', 5).result;
        await new Promise(r => setTimeout(r, 10)); // wait for open
        db.transaction('games', 'readwrite').objectStore('games').clear();
    });

    it('should save and retrieve a game session', async () => {
        const game: GameSession = {
            boardId: 'board-1',
            gameId: 'tic-tac-toe',
            gameName: 'Tic Tac Toe',
            playerName: 'Host',
            status: 'active',
            ledger: [],
            lastPlayed: Date.now()
        };

        await repo.saveGame(game);
        const retrieved = await repo.getGame('board-1');

        expect(retrieved).toEqual(game);
    });

    it('should retrieve all games', async () => {
        const g1: GameSession = { boardId: 'b1', gameId: 'g1', gameName: 'G1', playerName: 'P1', status: 'active', ledger: [], lastPlayed: 100 };
        const g2: GameSession = { boardId: 'b2', gameId: 'g2', gameName: 'G2', playerName: 'P2', status: 'active', ledger: [], lastPlayed: 200 };

        await repo.saveGame(g1);
        await repo.saveGame(g2);

        const all = await repo.getAllGames();
        expect(all.length).toBe(2);
        // getAllGames sorts by lastPlayed descending
        expect(all[0].boardId).toBe('b2');
        expect(all[1].boardId).toBe('b1');
    });

    it('should delete a game', async () => {
        const game: GameSession = { boardId: 'b1', gameId: 'g1', gameName: 'G1', playerName: 'P1', status: 'active', ledger: [], lastPlayed: 100 };
        await repo.saveGame(game);
        
        await repo.deleteGame('b1');
        const retrieved = await repo.getGame('b1');
        expect(retrieved).toBeNull();
    });
});
