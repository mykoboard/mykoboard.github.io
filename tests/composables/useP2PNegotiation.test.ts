import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { useP2PNegotiation } from '@/composables/useP2PNegotiation';
import { withSetup } from '../test-utils';
import { MockPeerConnectionPort } from '@/application/ports/mocks/MockPeerConnectionPort';
import * as Keys from '@/application/InjectionKeys';
import { createActor } from 'xstate';
import { boardMachine } from '@/machines/boardMachine';
import { ref, computed, shallowReactive } from 'vue';

describe('useP2PNegotiation', () => {
    let boardActor: any;

    beforeEach(() => {
        boardActor = createActor(boardMachine, { input: { playerName: 'Host' } }).start();
    });

    const setup = (configs: any = {}) => {
        const boardSnapshot = ref(boardActor.getSnapshot());
        const mockPeer = new MockPeerConnectionPort('peer-1');
        const pendingConnections = shallowReactive(new Map());
        const hostSignalingMode = ref(null);
        
        const handlers = {
            updateConnection: (p: any) => {}
        };
        spyOn(handlers, 'updateConnection');

        const [composable] = withSetup(() => useP2PNegotiation({
            playerInfos: computed(() => []),
            pendingConnections,
            hostSignalingMode,
            updateConnection: handlers.updateConnection,
            currentBoardActor: ref(boardActor)
        }), {
            [Keys.PeerConnectionFactoryKey as any]: () => mockPeer,
            [Keys.IdentityRepoKey as any]: { getIdentity: async () => ({ id: 'me', name: 'Me', publicKey: 'pk-me' }) },
        });

        return { composable, mockPeer, handlers, pendingConnections, hostSignalingMode };
    };

    it('should initialize manual signaling and add a manual connection', async () => {
        const { composable, handlers, hostSignalingMode, pendingConnections } = setup();
        
        await composable.initializeManualSignaling();
        
        expect(hostSignalingMode.value).toBe('manual');
        expect(pendingConnections.size).toBe(1);
        expect(handlers.updateConnection).toHaveBeenCalled();
    });

    it('should create a guest manual connection', async () => {
        const { composable, handlers, hostSignalingMode, pendingConnections } = setup();
        
        await composable.onCreateGuestManualConnection();
        
        expect(hostSignalingMode.value).toBe('manual');
        expect(pendingConnections.size).toBe(1);
    });

    it('should extract public key when updateAnswer is called', async () => {
        const { composable, mockPeer, handlers } = setup();
        
        // Mock Signal.decompress
        const lib = require('@/lib/webrtc');
        const decompressSpy = spyOn(lib.Signal, 'decompress').mockImplementation(async () => ({
            publicKey: 'pk-remote',
            session: { type: 'answer', sdp: 'sdp' }
        }));

        await composable.updateAnswer(mockPeer, 'mock-answer');
        
        expect(mockPeer.remotePublicKey).toBe('pk-remote');
        expect(handlers.updateConnection).toHaveBeenCalledWith(mockPeer);
        
        decompressSpy.mockRestore();
    });
});
