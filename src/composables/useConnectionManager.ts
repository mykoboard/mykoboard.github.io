import { shallowReactive, watch, inject, computed, ref } from 'vue';
import * as Keys from '../application/InjectionKeys';
import type { Peer } from '@mykoboard/networking';

interface ConnectionManagerDependencies {
    router: any;
    currentBoardActor: import('vue').Ref<any>;
    boardSnapshot: import('vue').Ref<any>;
    isInitiator: import('vue').Ref<boolean>;
    boardId: import('vue').Ref<string>;
    gameId: import('vue').Ref<string>;
}

export function useConnectionManager({
    router,
    currentBoardActor,
    boardSnapshot,
    isInitiator,
    boardId,
    gameId
}: ConnectionManagerDependencies) {

    const identityRepo = inject(Keys.IdentityRepoKey)!;
    const createNetworkManager = inject(Keys.NetworkManagerFactoryKey)!;
    const networkManager = createNetworkManager(isInitiator.value);

    const connectedPeers = ref<Peer[]>([]);

    // Fallback for UI if it depends on these pending states:
    const pendingConnections = shallowReactive(new Map<string, any>());
    const pendingSignaling = ref<Peer[]>([]);

    const view = computed(() => (boardId.value ? 'game' : 'lobby'));

    const updatePeersList = () => {
        connectedPeers.value = networkManager.getConnectedPeers();
    };

    networkManager.onPeerJoined((peer) => {
        updatePeersList();
        const actor = currentBoardActor.value;
        if (actor && peer.publicKey) {
            actor.send({
                type: 'UPDATE_PARTICIPANT',
                participant: {
                    publicKey: peer.publicKey,
                    name: peer.displayName || 'Guest',
                    status: peer.status,
                    isHost: peer.isHostConnection
                }
            });
            syncParticipants();
        }
    });

    networkManager.onPeerLeft((peer) => {
        updatePeersList();
        const actor = currentBoardActor.value;
        if (actor && peer.publicKey) {
            actor.send({
                type: 'UPDATE_PARTICIPANT',
                participant: {
                    publicKey: peer.publicKey,
                    name: peer.displayName || 'Guest',
                    status: peer.status,
                    isHost: peer.isHostConnection
                }
            });
            syncParticipants();
        }
    });

    networkManager.onMessage((peerId, data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.namespace === 'player') handlePlayerNamespace(msg, peerId);
            if (msg.namespace === 'game') handleGameNamespace(msg, peerId);
        } catch { }
    });

    const broadcast = (msg: any) => {
        networkManager.broadcast(msg);
    };

    const syncParticipants = async () => {
        const identity = await identityRepo.getIdentity();
        if (!isInitiator.value || !currentBoardActor.value || !identity) return;

        const participants = [
            { publicKey: identity.publicKey, name: identity.name, isHost: true },
            ...connectedPeers.value
                .filter(c => c.status === 'connected' && c.publicKey)
                .map(c => ({
                    publicKey: c.publicKey!,
                    name: c.displayName || 'Anonymous',
                    isHost: false,
                })),
        ];

        const mode = (boardSnapshot.value as any)?.context?.topologyMode || 'star';
        const topologyMap = (boardSnapshot.value as any)?.context?.topologyMap;
        const topologyObj = topologyMap ? Object.fromEntries(topologyMap.entries()) : {};

        currentBoardActor.value.send({ type: 'SYNC_PARTICIPANTS', participants, topologyMode: mode });

        const peerIds = connectedPeers.value
            .filter(c => c.status === 'connected')
            .map(c => c.publicKey).filter((pk): pk is string => !!pk);

        broadcast({
            namespace: 'player',
            type: 'SYNC_PARTICIPANTS',
            payload: { participants, topologyMode: mode, topologyMap: topologyObj, publicKey: identity.publicKey, connections: peerIds },
        });
    };

    const handlePlayerNamespace = (msg: any, peerId: string) => {
        const actor = currentBoardActor.value;
        if (!actor) return;
        const { type, payload } = msg;

        if (type === 'SYNC_PARTICIPANTS') {
            const { participants, topologyMode, topologyMap, connections, publicKey: senderPublicKey } = payload;
            if (participants) actor.send({ type: 'SYNC_PARTICIPANTS', participants, topologyMode, topologyMap } as any);
            if (connections && senderPublicKey) actor.send({ type: 'UPDATE_TOPOLOGY', publicKey: senderPublicKey, connections });
        }

        if (type === 'PLAYER_IDENTITY') {
            if (isInitiator.value) syncParticipants();
        }
    };

    const handleGameNamespace = (msg: any, peerId: string) => {
        const actor = currentBoardActor.value;
        if (!actor) return;
        const { type, payload } = msg;

        if (type === 'START_GAME') actor.send({ type: 'START_GAME' });
        if (type === 'GAME_STARTED') actor.send({ type: 'GAME_STARTED' });
        if (type === 'GAME_RESET') actor.send({ type: 'GAME_RESET' });
        if (type === 'NEW_BOARD') router.replace(`/games/${gameId.value}/${payload}`);
        if (type === 'SYNC_PLAYER_STATUS') {
            actor.send({ type: 'SET_PLAYER_STATUS', publicKey: peerId, status: payload });
        }
        if (type === 'SYNC_LEDGER') actor.send({ type: 'SYNC_LEDGER', ledger: payload });
    };

    watch(view, (newView) => {
        broadcast({ namespace: 'game', type: 'SYNC_PLAYER_STATUS', payload: newView });
    });

    watch(
        [connectedPeers, () => (boardSnapshot.value as any)?.context?.topologyMode],
        ([peers, mode]) => {
            networkManager.setTopologyMode(mode as any || 'star');
        },
        { deep: true }
    );

    // Dummy returns for now to satisfy existing UI usages until they are fully migrated
    const broadcastTopologyGossip = () => { };
    const updateConnection = () => { };

    return {
        pendingConnections,
        connectedPeers,
        pendingSignaling,
        broadcast,
        updateConnection,
        syncParticipants,
        broadcastTopologyGossip,
        handlePlayerNamespace,
        handleGameNamespace
    };
}
