import { describe, expect, it } from 'bun:test';
import { createActor } from 'xstate';
import { boardMachine } from '@/machines/boardMachine';

describe('boardMachine', () => {
    it('should start in idle state', () => {
        const actor = createActor(boardMachine, {
            input: { playerName: 'TestPlayer' }
        });
        actor.start();
        expect(actor.getSnapshot().matches('idle')).toBe(true);
        expect(actor.getSnapshot().context.playerName).toBe('TestPlayer');
    });

    it('should transition to hosting when HOST event is received', () => {
        const actor = createActor(boardMachine, {
            input: { playerName: 'Host' }
        });
        actor.start();
        actor.send({ type: 'HOST', boardId: 'board-123', maxPlayers: 4 });
        
        const snapshot = actor.getSnapshot();
        expect(snapshot.matches('hosting')).toBe(true);
        expect(snapshot.context.boardId).toBe('board-123');
        expect(snapshot.context.maxPlayers).toBe(4);
        expect(snapshot.context.isInitiator).toBe(true);
    });

    it('should transition to joining when JOIN event is received', () => {
        const actor = createActor(boardMachine, {
            input: { playerName: 'Guest' }
        });
        actor.start();
        actor.send({ type: 'JOIN', boardId: 'board-456' });
        
        const snapshot = actor.getSnapshot();
        expect(snapshot.matches('joining')).toBe(true);
        expect(snapshot.context.boardId).toBe('board-456');
        expect(snapshot.context.isInitiator).toBe(false);
    });

    it('should handle guest approval flow as a host', () => {
        const actor = createActor(boardMachine, {
            input: { playerName: 'Host' }
        });
        actor.start();
        actor.send({ type: 'HOST', boardId: 'board-123' });
        
        // Simulate a join request
        actor.send({ 
            type: 'REQUEST_JOIN', 
            connectionId: 'peer-1', 
            peerName: 'Bob', 
            answer: { sdp: '...' } 
        });
        
        expect(actor.getSnapshot().matches('approving')).toBe(true);
        expect(actor.getSnapshot().context.pendingGuest?.name).toBe('Bob');
        
        // Accept guest
        actor.send({ type: 'ACCEPT_GUEST' });
        expect(actor.getSnapshot().matches('preparation')).toBe(true);
        expect(actor.getSnapshot().context.pendingGuest).toBe(null);
    });

    it('should allow starting the game from preparation state', () => {
        const actor = createActor(boardMachine, {
            input: { playerName: 'Host' }
        });
        actor.start();
        actor.send({ type: 'HOST', boardId: 'board-123' });
        
        // Force preparation state by updating participant (simulating connection)
        actor.send({ 
            type: 'UPDATE_PARTICIPANT', 
            participant: { id: 'peer-1', name: 'Bob', isHost: false, status: 'connected', publicKey: 'pk' } 
        });
        
        expect(actor.getSnapshot().matches('preparation')).toBe(true);
        
        // Start game
        actor.send({ type: 'START_GAME' });
        expect(actor.getSnapshot().matches('playing')).toBe(true);
        expect(actor.getSnapshot().context.isGameStarted).toBe(true);
    });

    it('should handle ledger synchronization', () => {
        const actor = createActor(boardMachine, {
            input: { playerName: 'Host' }
        });
        actor.start();
        
        const testLedger = [{ type: 'MOVE', payload: { x: 1 } }];
        actor.send({ type: 'SYNC_LEDGER', ledger: testLedger });
        
        expect(actor.getSnapshot().context.ledger).toEqual(testLedger);
    });
});

