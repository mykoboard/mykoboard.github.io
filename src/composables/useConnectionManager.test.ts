import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { useConnectionManager } from './useConnectionManager';
import { withSetup } from '../tests/test-utils';
import { MockPeerConnectionPort } from '../application/ports/mocks/MockPeerConnectionPort';
import { PeerConnectionStatus } from '../application/ports/IPeerConnectionPort';
import * as Keys from '../application/InjectionKeys';
import { createActor } from 'xstate';
import { boardMachine } from '../machines/boardMachine';
import { ref } from 'vue';

describe('useConnectionManager', () => {
    let boardActor: any;

    beforeEach(() => {
        boardActor = createActor(boardMachine, { input: { playerName: 'Host' } }).start();
    });

    const setup = (configs: any = {}) => {
        const boardSnapshot = ref(boardActor.getSnapshot());
        const currentBoardActor = ref(boardActor);

        const [composable] = withSetup(() => useConnectionManager({
            router: {} as any,
            currentBoardActor,
            boardSnapshot,
            isInitiator: ref(configs.isInitiator ?? true),
            boardId: ref('board-1'),
            gameId: ref('tic-tac-toe')
        }), {
            [Keys.PeerConnectionFactoryKey as any]: (onSignalUpdate: any) => new MockPeerConnectionPort('test-peer', onSignalUpdate),
            [Keys.IdentityRepoKey as any]: { getIdentity: async () => ({ id: 'me', name: 'Me', publicKey: 'pk-me' }) },
        });

        return { composable, currentBoardActor, boardSnapshot };
    };

    it('should create a peer connection and add it to pendingConnections when updateConnection is called', () => {
        const { composable } = setup();
        const mockPeer = new MockPeerConnectionPort('peer-1');
        
        composable.updateConnection(mockPeer);
        
        expect(composable.pendingConnections.has('peer-1')).toBe(true);
    });

    it('should move connection to connectedPeers when status becomes connected', () => {
        const { composable } = setup();
        const mockPeer = new MockPeerConnectionPort('peer-1');
        
        composable.updateConnection(mockPeer);
        expect(composable.pendingConnections.has('peer-1')).toBe(true);

        // Simulate status change
        mockPeer.status = 'connected' as any;
        composable.updateConnection(mockPeer);

        // In this implementation, all active connections stay in pendingConnections (the registry)
        expect(composable.pendingConnections.has('peer-1')).toBe(true);
        expect(composable.connectedPeers.value.length).toBe(1);
        expect(composable.connectedPeers.value[0].id).toBe('peer-1');
    });

    it('should broadcast message to all connected peers', () => {
        const { composable } = setup();
        const peer1 = new MockPeerConnectionPort('peer-1');
        peer1.status = PeerConnectionStatus.connected;
        spyOn(peer1, 'send');

        const peer2 = new MockPeerConnectionPort('peer-2');
        peer2.status = PeerConnectionStatus.connected;
        spyOn(peer2, 'send');

        composable.updateConnection(peer1);
        composable.updateConnection(peer2);

        const testMsg = { type: 'test' };
        composable.broadcast(testMsg);

        expect(peer1.send).toHaveBeenCalled();
        expect(peer2.send).toHaveBeenCalled();
    });

    it('should handle REQUEST_P2P_OFFER by initiating a new connection', async () => {
        const { composable } = setup();
        const sourcePeer = new MockPeerConnectionPort('source-1');
        sourcePeer.status = PeerConnectionStatus.connected;
        spyOn(sourcePeer, 'send');
        
        composable.updateConnection(sourcePeer);

        await composable.handlePlayerNamespace({
            type: 'REQUEST_P2P_OFFER',
            payload: { targetPeerId: 'target-1', targetPlayerName: 'Target', targetPublicKey: 'pk-target' }
        }, sourcePeer);

        // Should have sent PEER_P2P_OFFER back via sourcePeer
        // We wait a bit since it's using setInterval internally
        await new Promise(r => setTimeout(r, 150));

        const sentMessages = sourcePeer.getSentMessages().map(m => JSON.parse(m as string));
        const p2pOffer = sentMessages.find(m => m.type === 'PEER_P2P_OFFER');
        expect(p2pOffer).toBeDefined();
        expect(p2pOffer?.payload?.targetPeerId).toBe('target-1');
    });
});
