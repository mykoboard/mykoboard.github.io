import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { useSessionActions } from './useSessionActions';
import { withSetup } from '../tests/test-utils';
import { MockIdentityRepo } from '../application/ports/mocks/MockIdentityRepo';
import { MockSessionRepo } from '../application/ports/mocks/MockSessionRepo';
import { MockKnownIdentityRepo } from '../application/ports/mocks/MockKnownIdentityRepo';
import { MockPeerConnectionPort } from '../application/ports/mocks/MockPeerConnectionPort';
import { MockSignalingPort } from '../application/ports/mocks/MockSignalingPort';
import * as Keys from '../application/InjectionKeys';
import { createActor } from 'xstate';
import { boardMachine } from '../machines/boardMachine';
import { ref, shallowReactive } from 'vue';

describe('useSessionActions', () => {
    let mockIdentityRepo: MockIdentityRepo;
    let mockSessionRepo: MockSessionRepo;
    let mockKnownIdentityRepo: MockKnownIdentityRepo;
    let boardActor: any;
    let mockRouter: any;

    beforeEach(() => {
        mockIdentityRepo = new MockIdentityRepo();
        mockSessionRepo = new MockSessionRepo();
        mockKnownIdentityRepo = new MockKnownIdentityRepo();
        boardActor = createActor(boardMachine, { input: { playerName: 'Test' } }).start();
        mockRouter = { push: () => {} };
        spyOn(mockRouter, 'push');
    });

    const setup = (signalingOverride?: MockSignalingPort) => {
        const signalingClient = ref(signalingOverride || new MockSignalingPort());
        const pendingConnections = shallowReactive(new Map());
        const broadcastObj = { broadcast: () => {} };
        spyOn(broadcastObj, 'broadcast');
        const updateConnection = () => {};

        const [actions, app] = withSetup(() => useSessionActions({
            signalingClient,
            pendingConnections,
            broadcast: broadcastObj.broadcast,
            updateConnection,
            router: mockRouter,
            boardId: ref('board-1'),
            gameId: ref('tic-tac-toe'),
            isInitiator: ref(true),
            currentBoardActor: ref(boardActor),
            boardSnapshot: ref(boardActor.getSnapshot())
        }), {
            [Keys.IdentityRepoKey as any]: mockIdentityRepo,
            [Keys.SessionRepoKey as any]: mockSessionRepo,
            [Keys.KnownIdentityRepoKey as any]: mockKnownIdentityRepo,
            [Keys.PeerConnectionFactoryKey as any]: (id: string) => new MockPeerConnectionPort(id),
        });

        return { actions, app, signalingClient, broadcastObj };
    };

    it('should push to router when onHostAGame is called', async () => {
        const { actions } = setup();
        
        await actions.onHostAGame(4);
        
        expect(mockRouter.push).toHaveBeenCalled();
    });

    it('should call signaling guestJoin when onJoinAsGuest is called and signaling is connected', async () => {
        await mockIdentityRepo.setIdentity({ id: 'guest-1', name: 'Guest', publicKey: 'pk-guest' } as any);
        const mockSignaling = new MockSignalingPort();
        mockSignaling.isConnected = true;
        spyOn(mockSignaling, 'guestJoin');
        
        const { actions } = setup(mockSignaling);
        
        await actions.onJoinAsGuest();
        
        expect(mockSignaling.guestJoin).toHaveBeenCalled();
    });

    it('should NOT call signaling guestJoin when signaling is NOT connected', async () => {
        const mockSignaling = new MockSignalingPort();
        mockSignaling.isConnected = false;
        spyOn(mockSignaling, 'guestJoin');
        
        const { actions } = setup(mockSignaling);
        
        await actions.onJoinAsGuest();
        
        expect(mockSignaling.guestJoin).not.toHaveBeenCalled();
    });
});
