import { computed, watchEffect, watch, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSelector } from '@xstate/vue';
import { ConnectionStatus } from '../lib/webrtc';
import { getGameById } from '../lib/GameRegistry';
import { SessionManager } from '../lib/sessions';
import * as Keys from '../application/InjectionKeys';
import type { PlayerInfo } from '@mykoboard/integration';

export function useBoardState() {
    const route = useRoute();
    const router = useRouter();

    const identity = inject(Keys.IdentityRepoKey)!.identity;
    const isLoading = inject(Keys.IdentityRepoKey)!.isLoading;
    const activeSessions = inject(Keys.SessionRepoKey)!.activeSessions;
    const getBoardActor = inject(Keys.BoardActorFactoryKey)!;

    const gameId = computed(() => route.params.gameId as string);
    const boardId = computed(() => route.params.boardId as string);
    const game = computed(() => getGameById(gameId.value || ''));
    const isInsideBoard = computed(() => !!boardId.value);

    const currentBoardActor = computed(() => {
        if (!boardId.value) return null;
        return getBoardActor(boardId.value, identity.value?.name || 'Anonymous', false);
    });

    const boardSnapshot = useSelector(currentBoardActor, (s) => s as any);

    const isInitiator = computed(() => boardSnapshot.value?.context?.isInitiator || false);
    const isGameStarted = computed(() => boardSnapshot.value?.context?.isGameStarted || false);
    const topologyMode = computed(() => (boardSnapshot.value as any)?.context?.topologyMode || 'star');
    const view = computed(() => (isInsideBoard.value ? 'game' : 'lobby'));

    const connections = computed(() => boardSnapshot.value?.context?.connections || new Map());
    const connectionList = computed(() => Array.from(connections.value.values()));

    const playerInfos = computed((): PlayerInfo[] => {
        if (!boardSnapshot.value) return [];
        const ctx = (boardSnapshot.value as any).context;

        const currentSession = activeSessions.value.find(s => s.boardId === boardId.value);
        const storedParticipants = currentSession?.participants || [];
        const externalParticipants = (ctx.externalParticipants as any[]) || [];

        const localParticipant = storedParticipants.find(
            p => p.publicKey === identity.value?.publicKey || p.isYou
        );

        const localPlayer: PlayerInfo = {
            publicKey: identity.value?.publicKey || 'local',
            name:
                identity.value?.name ||
                (ctx.playerName !== 'Anonymous' ? ctx.playerName : null) ||
                'Anonymous',
            status: isGameStarted.value ? 'game' : 'lobby',
            isConnected: true,
            isLocal: true,
            isHost: localParticipant ? localParticipant.isHost : isInitiator.value,
            publicKey: identity.value?.publicKey,
        };

        const infos: PlayerInfo[] = [];
        const processedPublicKeys = new Set<string>();

        // 1. Local player is always first
        infos.push(localPlayer);
        if (localPlayer.publicKey) processedPublicKeys.add(localPlayer.publicKey);

        // 2. Synced external participants from host
        externalParticipants.forEach(p => {
            if (!p.publicKey || processedPublicKeys.has(p.publicKey)) return;
            infos.push({
                id: p.id,
                name: p.name,
                status: isGameStarted.value ? 'game' : 'lobby',
                isConnected: true,
                isLocal: false,
                isHost: p.isHost,
                publicKey: p.publicKey,
            });
            processedPublicKeys.add(p.publicKey);
        });

        // 3. Direct connections not yet synced to externalParticipants (host view)
        if (isInitiator.value) {
            const actorConnections = (boardSnapshot.value as any)?.context?.connections || new Map();
            actorConnections.forEach((c: any) => {
                const publicKey = c.remotePublicKey;
                if (publicKey && !processedPublicKeys.has(publicKey)) {
                    infos.push({
                        publicKey,
                        name: c.remotePlayerName || 'Anonymous',
                        status: ctx.playerStatuses.get(publicKey) || 'lobby',
                        isConnected: c.status === ConnectionStatus.connected,
                        isLocal: false,
                        isHost: false,
                    });
                    processedPublicKeys.add(publicKey);
                }
            });
        }

        // 4. Historical participants from saved session
        storedParticipants.forEach(p => {
            if (!p.isYou && p.publicKey && !processedPublicKeys.has(p.publicKey)) {
                infos.push({
                    publicKey: p.publicKey,
                    name: p.name,
                    status:
                        currentSession?.status === 'finished' || isGameStarted.value
                            ? 'game'
                            : 'lobby',
                    isConnected: false,
                    isLocal: false,
                    isHost: p.isHost,
                });
                processedPublicKeys.add(p.publicKey);
            }
        });

        return infos;
    });

    // Persist session state whenever the board actor transitions to an active state
    watchEffect(() => {
        const s = boardSnapshot.value as any;
        if (
            s?.status === 'approving' ||
            s?.status === 'hosting' ||
            s?.status === 'preparation' ||
            s?.status === 'playing' ||
            s?.status === 'finished'
        ) {
            if (boardId.value && route.query.mode !== 'manual') {
                SessionManager.saveSession({
                    gameId: gameId.value,
                    boardId: boardId.value,
                    playerName: s.context.playerName,
                    gameName: game.value?.name || 'Unknown Game',
                    lastPlayed: Date.now(),
                    status: s.matches('finished') ? 'finished' : 'active',
                    ledger: s.context.ledger,
                    participants: playerInfos.value.map(p => ({
                        name: p.name,
                        isYou: p.isLocal,
                        isHost: p.isHost,
                        publicKey: p.publicKey,
                    })),
                });
            }
        }
    });

    // Restore ledger from IndexedDB when navigating into an existing board
    watch(
        boardId,
        async (newId) => {
            if (newId && route.query.mode !== 'manual' && isInsideBoard.value) {
                const session = await SessionManager.getSession(newId);
                const actor = getBoardActor(newId, identity.value?.name || 'Anonymous', false);
                const ctx = (actor.getSnapshot() as any).context;

                if (session && session.ledger.length > 0 && ctx.ledger.length === 0) {
                    actor.send({ type: 'LOAD_LEDGER', ledger: session.ledger });
                    actor.send({ type: 'GAME_STARTED' });
                    if (session.status === 'finished') {
                        setTimeout(() => actor.send({ type: 'FINISH_GAME' }), 10);
                    }
                }
            }
        },
        { immediate: true }
    );

    const setTopologyMode = (mode: 'star' | 'mesh') =>
        currentBoardActor.value?.send({ type: 'SET_TOPOLOGY_MODE', mode });

    return {
        route,
        router,
        gameId,
        boardId,
        game,
        isInsideBoard,
        currentBoardActor,
        boardSnapshot,
        isInitiator,
        isGameStarted,
        topologyMode,
        view,
        connectionList,
        playerInfos,
        identity,
        isLoading,
        activeSessions,
        setTopologyMode,
    };
}
