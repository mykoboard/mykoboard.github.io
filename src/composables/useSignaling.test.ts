import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { useSignaling } from './useSignaling';
import { withSetup } from '../tests/test-utils';
import { MockSignalingPort } from '../application/ports/mocks/MockSignalingPort';
import { MockIdentityRepo } from '../application/ports/mocks/MockIdentityRepo';
import { MockKnownIdentityRepo } from '../application/ports/mocks/MockKnownIdentityRepo';
import * as Keys from '../application/InjectionKeys';
import { createActor } from 'xstate';
import { boardMachine } from '../machines/boardMachine';
import { ref, computed } from 'vue';

describe('useSignaling', () => {
    let boardActor: any;
    let mockSignaling: MockSignalingPort;
    let mockIdentityRepo: MockIdentityRepo;
    let mockKnownIdentityRepo: MockKnownIdentityRepo;

    beforeEach(() => {
        boardActor = createActor(boardMachine, { input: { playerName: 'Host' } }).start();
        mockSignaling = new MockSignalingPort();
        mockIdentityRepo = new MockIdentityRepo();
        mockKnownIdentityRepo = new MockKnownIdentityRepo();
    });

    const setup = (configs: any = {}) => {
        const playerInfos = configs.playerInfos || computed(() => []);
        const pendingJoinRequests = configs.pendingJoinRequests || ref([]);
        
        const handlers = {
            autoApprovePeer: configs.autoApprovePeer || (async () => {}),
            handleGameNamespace: configs.handleGameNamespace || (() => {}),
            handlePlayerNamespace: configs.handlePlayerNamespace || (() => {})
        };
        
        if (!configs.autoApprovePeer) spyOn(handlers, 'autoApprovePeer');
        if (!configs.handleGameNamespace) spyOn(handlers, 'handleGameNamespace');
        if (!configs.handlePlayerNamespace) spyOn(handlers, 'handlePlayerNamespace');

        const [composable] = withSetup(() => useSignaling({
            playerInfos,
            pendingJoinRequests,
            autoApprovePeer: handlers.autoApprovePeer,
            handleGameNamespace: handlers.handleGameNamespace,
            handlePlayerNamespace: handlers.handlePlayerNamespace,
            route: { query: {} } as any,
            boardId: ref('board-1'),
            gameId: ref('tic-tac-toe'),
            boardSnapshot: ref(boardActor.getSnapshot()),
            isInitiator: ref(configs.isInitiator ?? true),
            isGameStarted: ref(false)
        }), {
            [Keys.SignalingPortKey as any]: mockSignaling,
            [Keys.IdentityRepoKey as any]: mockIdentityRepo,
            [Keys.KnownIdentityRepoKey as any]: mockKnownIdentityRepo,
            [Keys.PeerConnectionFactoryKey as any]: () => ({}) as any, // Mock factory
        });

        return { composable, pendingJoinRequests, handlers };
    };

    it('should initialize signaling client and connect when initializeServerSignaling is called', async () => {
        // Mock identity for connection
        await mockIdentityRepo.setIdentity({ id: 'host-1', name: 'Host', publicKey: 'pk-host', subscriptionToken: 'token-1' } as any);
        
        const { composable } = setup();
        
        await composable.initializeServerSignaling();
        
        expect(composable.signalingClient).toBe(mockSignaling);
        expect(mockSignaling.isConnected).toBe(true);
    });

    it('should handle guestJoin request by adding to pendingJoinRequests', async () => {
        const joinRequests = ref([]);
        const { composable } = setup({ pendingJoinRequests: joinRequests });
        await mockIdentityRepo.setIdentity({ id: 'host-1', name: 'Host', publicKey: 'pk-host', subscriptionToken: 'token-1' } as any);
        await composable.initializeServerSignaling();
        
        // Simulate signaling event
        await mockSignaling.simulateMessage({
            type: 'peerJoined',
            from: 'conn-1',
            peerName: 'Guest',
            publicKey: 'pk-guest'
        });

        expect(joinRequests.value.length).toBe(1);
        expect(joinRequests.value[0].peerName).toBe('Guest');
    });

    it('should auto-approve known identities', async () => {
        const handlers = {
            autoApprovePeer: async () => {}
        };
        spyOn(handlers, 'autoApprovePeer');
        
        const { composable } = setup({ autoApprovePeer: handlers.autoApprovePeer });
        
        await mockIdentityRepo.setIdentity({ id: 'host-1', name: 'Host', publicKey: 'pk-host', subscriptionToken: 'token-1' } as any);
        await mockKnownIdentityRepo.addKnownIdentity({ id: 'id-1', name: 'Friend', publicKey: 'pk-friend', addedAt: Date.now() });
        
        await composable.initializeServerSignaling();

        await mockSignaling.simulateMessage({
            type: 'peerJoined',
            from: 'conn-friend',
            peerName: 'Friend',
            publicKey: 'pk-friend'
        });

        expect(handlers.autoApprovePeer).toHaveBeenCalled();
    });
});
