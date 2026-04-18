import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { useBoardState } from '@/composables/useBoardState';
import { withSetup } from '../test-utils';
import * as Keys from '@/application/InjectionKeys';
import { ref } from 'vue';
import { Participant } from '@/domain/game-session/Participant';

// Mock SessionManager/DB
mock.module('@/lib/sessions', () => ({
    SessionManager: {
        saveSession: () => {},
        getSession: async () => null,
        cleanupOldHostedSessions: async () => {} 
    }
}));

// Mock vue-router
mock.module('vue-router', () => ({
  useRoute: () => ({ params: { gameId: 'apex-nebula', boardId: 'board-1' }, query: {} }),
  useRouter: () => ({ push: () => {} })
}));

// Mock @xstate/vue to avoid selector complexities in unit tests
mock.module('@xstate/vue', () => ({
    useSelector: (actor: any, selector: (s: any) => any) => {
        return ref(selector(actor.value.getSnapshot()));
    }
}));

describe('useBoardState', () => {
    let mockBoardActor: any;
    const mockIdentity = { name: 'Host Player', publicKey: 'pk-host' };
    
    beforeEach(() => {
        mockBoardActor = {
            getSnapshot: () => ({
                context: {
                    isInitiator: true,
                    isGameStarted: false,
                    participants: new Map<string, Participant>(),
                    externalParticipants: [],
                    playerName: 'Host Player',
                    playerStatuses: new Map(),
                    topologyMode: 'star'
                },
                matches: (state: string) => state === 'preparation'
            }),
            send: () => {},
            subscribe: () => ({ unsubscribe: () => {} }),
            status: 'active'
        };
    });

    const setup = () => {
        return withSetup(() => useBoardState(), {
            [Keys.IdentityRepoKey as any]: { identity: ref(mockIdentity), isLoading: ref(false) },
            [Keys.SessionRepoKey as any]: {
                activeSessions: ref([]),
                getGame: async () => null,
                saveGame: async () => {},
                cleanupOldHostedSessions: async () => {},
            },
            [Keys.BoardActorFactoryKey as any]: () => mockBoardActor
        });
    };

    it('should correctly map participants from machine context to playerInfos', () => {
        const participants = new Map<string, Participant>();
        const remotePk = 'pk-remote';
        participants.set(remotePk, {
            publicKey: remotePk,
            name: 'Remote Player',
            status: 'connected',
            isHost: false
        });
        
        mockBoardActor.getSnapshot = () => ({
            context: {
                isInitiator: true,
                isGameStarted: false,
                participants: participants,
                externalParticipants: [],
                playerName: 'Host Player',
                playerStatuses: new Map(),
                topologyMode: 'star'
            },
            matches: (state: string) => state === 'preparation'
        });

        const [composable] = setup();
        
        const infos = composable.playerInfos.value;
        // Local player + 1 remote participant
        expect(infos.length).toBe(2); 
        
        const remotePlayer = infos.find(p => p.publicKey === remotePk);
        expect(remotePlayer).toBeDefined();
        expect(remotePlayer?.name).toBe('Remote Player');
        expect(remotePlayer?.isConnected).toBe(true);
        expect(remotePlayer?.isLocal).toBe(false);
    });

    it('should show isConnected as false if participant status is not connected', () => {
        const participants = new Map<string, Participant>();
        const remotePk = 'pk-remote';
        participants.set(remotePk, {
            publicKey: remotePk,
            name: 'Remote Player',
            status: 'connecting',
            isHost: false
        });
        
        mockBoardActor.getSnapshot = () => ({
            context: {
                isInitiator: true,
                isGameStarted: false,
                participants: participants,
                externalParticipants: [],
                playerName: 'Host Player',
                playerStatuses: new Map(),
                topologyMode: 'star'
            },
            matches: (state: string) => state === 'preparation'
        });

        const [composable] = setup();
        
        const remotePlayer = composable.playerInfos.value.find(p => p.publicKey === remotePk);
        expect(remotePlayer?.isConnected).toBe(false);
    });

    it('should prioritize participants over connections (which was removed)', () => {
        // This test ensures that our update to use 'participants' Map works as expected
        const participants = new Map<string, Participant>();
        participants.set('pk-1', {
            publicKey: 'pk-1',
            name: 'Real Participant',
            status: 'connected',
            isHost: false
        });

        mockBoardActor.getSnapshot = () => ({
            context: {
                isInitiator: true,
                isGameStarted: false,
                participants: participants,
                // Even if some legacy 'connections' existed (which they shouldn't in the machine),
                // the composable should now be looking at participants.
                externalParticipants: [],
                playerName: 'Host',
                playerStatuses: new Map()
            },
            matches: () => true
        });

        const [composable] = setup();
        expect(composable.playerInfos.value.some(p => p.publicKey === 'pk-1')).toBe(true);
    });
});
