import { shallowReactive, watch, inject, computed, reactive } from 'vue';
import { logger } from '../lib/logger';
import * as Keys from '../application/InjectionKeys';
import { IPeerConnectionPort, PeerConnectionStatus } from '../application/ports/IPeerConnectionPort';

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
    
    // Inject Hexagonal Ports
    const identityRepo = inject(Keys.IdentityRepoKey)!;
    const createPeerConnection = inject(Keys.PeerConnectionFactoryKey)!;

    const pendingConnections = shallowReactive<Map<string, IPeerConnectionPort>>(new Map());

    const lastStatusMap = new Map<string, string>();
    const lastSignalMap = new Map<string, string>();

    const view = computed(() => (boardId.value ? 'game' : 'lobby'));

    const connectedPeers = computed((): IPeerConnectionPort[] => {
        return Array.from(pendingConnections.values()).filter(
            c => c.status === PeerConnectionStatus.connected
        );
    });

    const pendingSignaling = computed((): IPeerConnectionPort[] => {
        return Array.from(pendingConnections.values()).filter(
            c => c.status !== PeerConnectionStatus.connected
        );
    });

    const broadcast = (msg: any) => {
        const data = JSON.stringify(msg);
        const mode = (boardSnapshot.value as any)?.context?.topologyMode || 'star';

        connectedPeers.value.forEach(c => {
            if (c.status === PeerConnectionStatus.connected) {
                if (mode === 'star' && !isInitiator.value) {
                    if (c.isHostConnection) c.send(data);
                } else {
                    c.send(data);
                }
            }
        });
    };

    const syncParticipants = async () => {
        const identity = await identityRepo.getIdentity();
        if (!isInitiator.value || !currentBoardActor.value || !identity) return;

        const participants = [
            { id: identity.id, name: identity.name, isHost: true, publicKey: identity.publicKey },
            ...Array.from(pendingConnections.values())
                .filter(c => c.status === PeerConnectionStatus.connected)
                .map(c => ({ 
                    id: c.id, 
                    name: c.remotePlayerName || 'Anonymous', 
                    isHost: false, 
                    publicKey: c.remotePublicKey 
                })),
        ];

        const mode = (boardSnapshot.value as any)?.context?.topologyMode || 'star';
        const topologyMap = (boardSnapshot.value as any)?.context?.topologyMap;
        const topologyObj = topologyMap ? Object.fromEntries(topologyMap.entries()) : {};

        currentBoardActor.value.send({ type: 'SYNC_PARTICIPANTS', participants, topologyMode: mode });

        const peerIds = connectedPeers.value
            .filter(c => c.status === PeerConnectionStatus.connected)
            .map(c => c.remotePlayerId || c.id);

        broadcast({
            namespace: 'player',
            type: 'SYNC_PARTICIPANTS',
            payload: { participants, topologyMode: mode, topologyMap: topologyObj, peerId: identity.id, connections: peerIds },
        });
    };

    const broadcastTopologyGossip = async (excludeConnectionId?: string) => {
        const identity = await identityRepo.getIdentity();
        if (!identity) return;
        const myPublicKey = identity.publicKey;
        const myConnections = connectedPeers.value.map(c => c.remotePublicKey).filter((pk): pk is string => !!pk);

        connectedPeers.value.forEach(c => {
            if (c.id === excludeConnectionId) return;
            c.send(JSON.stringify({
                namespace: 'player',
                type: 'TOPOLOGY_GOSSIP',
                payload: { peerId: myPublicKey, connections: myConnections },
            }));
        });
    };

    const handlePlayerNamespace = (msg: any, connection: IPeerConnectionPort) => {
        const actor = currentBoardActor.value;
        if (!actor) return;

        const { type, payload } = msg;

        if (type === 'SYNC_PARTICIPANTS') {
            const { participants, topologyMode, topologyMap, connections, peerId } = payload;
            if (participants) actor.send({ type: 'SYNC_PARTICIPANTS', participants, topologyMode, topologyMap } as any);
            if (connections && peerId) actor.send({ type: 'UPDATE_TOPOLOGY', peerId, connections });
        }

        if (type === 'PLAYER_IDENTITY') {
            connection.remotePlayerName = payload.name;
            connection.remotePublicKey = payload.publicKey;
            updateConnection(connection);
            if (isInitiator.value) syncParticipants();
            broadcastTopologyGossip();
        }

        if (type === 'TOPOLOGY_GOSSIP') {
            const { peerId, connections: peerConnections } = payload;
            actor.send({ type: 'UPDATE_TOPOLOGY', peerId, connections: peerConnections });
        }

        if (type === 'REQUEST_P2P_OFFER') {
            const { targetPeerId, targetPlayerName, targetPublicKey } = payload;
            (async () => {
                const ident = await identityRepo.getIdentity();
                if (!ident) return;
                const p2pConnection = createPeerConnection(() => { updateConnection(p2pConnection); });
                
                // Set metadata on adapter/inner connection
                p2pConnection.remotePlayerName = targetPlayerName;
                p2pConnection.remotePublicKey = targetPublicKey;
                p2pConnection.remotePlayerId = targetPeerId;
                
                await p2pConnection.prepareOffer(ident.name, ident.publicKey);

                updateConnection(p2pConnection);
                pendingConnections.set(targetPeerId, p2pConnection);

                const checkOffer = setInterval(() => {
                    if (p2pConnection.serializedSignal) {
                        clearInterval(checkOffer);
                        connection.send(JSON.stringify({
                            namespace: 'player',
                            type: 'PEER_P2P_OFFER',
                            payload: { targetPeerId, offer: p2pConnection.serializedSignal, peerName: ident.name, publicKey: ident.publicKey },
                        }));
                    }
                }, 100);
            })();
        }

        if (type === 'PEER_P2P_OFFER') {
            if (isInitiator.value) {
                const { targetPeerId, offer, peerName, publicKey } = payload;
                const targetConn = connectedPeers.value.find(c => c.id === targetPeerId);
                if (targetConn) {
                    targetConn.send(JSON.stringify({
                        namespace: 'player',
                        type: 'PEER_P2P_OFFER',
                        payload: { sourcePeerId: connection.id, offer, peerName, publicKey },
                    }));
                }
            } else {
                const { sourcePeerId, offer, peerName, publicKey } = payload;
                (async () => {
                    const ident = await identityRepo.getIdentity();
                    if (!ident) return;
                    const p2pConnection = createPeerConnection(() => { updateConnection(p2pConnection); });
                    
                    p2pConnection.remotePlayerName = peerName;
                    p2pConnection.remotePublicKey = publicKey;
                    p2pConnection.remotePlayerId = sourcePeerId;

                    await p2pConnection.acceptOffer(offer, ident.name, ident.publicKey);

                    updateConnection(p2pConnection);
                    pendingConnections.set(sourcePeerId, p2pConnection);

                    const checkAnswer = setInterval(() => {
                        if (p2pConnection.serializedSignal) {
                            clearInterval(checkAnswer);
                            connection.send(JSON.stringify({
                                namespace: 'player',
                                type: 'PEER_P2P_ANSWER',
                                payload: { targetPeerId: sourcePeerId, answer: p2pConnection.serializedSignal, peerName: ident.name, publicKey: ident.publicKey },
                            }));
                        }
                    }, 100);
                })();
            }
        }

        if (type === 'PEER_P2P_ANSWER') {
            if (isInitiator.value) {
                const { targetPeerId, answer, peerName, publicKey } = payload;
                const targetConn = connectedPeers.value.find(c => c.id === targetPeerId);
                if (targetConn) {
                    targetConn.send(JSON.stringify({
                        namespace: 'player',
                        type: 'PEER_P2P_ANSWER',
                        payload: { sourcePeerId: connection.id, answer, peerName, publicKey },
                    }));
                }
            } else {
                const { sourcePeerId, answer } = payload;
                const p2pConn = pendingConnections.get(sourcePeerId);
                if (p2pConn) {
                    (async () => {
                        await p2pConn.acceptAnswer(answer);
                        pendingConnections.delete(sourcePeerId);
                    })();
                }
            }
        }
    };

    const handleGameNamespace = (msg: any, connection: IPeerConnectionPort) => {
        const actor = currentBoardActor.value;
        if (!actor) return;

        const { type, payload } = msg;

        if (type === 'START_GAME') actor.send({ type: 'START_GAME' });
        if (type === 'GAME_STARTED') actor.send({ type: 'GAME_STARTED' });
        if (type === 'GAME_RESET') actor.send({ type: 'GAME_RESET' });
        if (type === 'NEW_BOARD') router.replace(`/games/${gameId.value}/${payload}`);
        if (type === 'SYNC_PLAYER_STATUS') actor.send({ type: 'SET_PLAYER_STATUS', playerId: connection.id, status: payload });
        if (type === 'SYNC_LEDGER') actor.send({ type: 'SYNC_LEDGER', ledger: payload });
    };

    const registerConnectionHandlers = (connection: IPeerConnectionPort) => {
        if (!(connection as any)._hasMessageListener) {
            connection.onMessage(async (data: string) => {
                try {
                    const msg = JSON.parse(data);
                    if (msg.namespace === 'player') { handlePlayerNamespace(msg, connection); return; }
                    if (msg.namespace === 'game') { handleGameNamespace(msg, connection); return; }
                } catch {}
            });
            (connection as any)._hasMessageListener = true;
        }
        
        // Data channel ready listeners should be handled by the adapter or peer connection logic
        // For this refactor, we keep it simple or expand the adapter to provide a 'onReady' callback.
    };

    const updateConnection = (connection: IPeerConnectionPort) => {
        const actor = currentBoardActor.value;
        if (!actor) return;

        // Manage local reactive state
        // CRITICAL: Ensure the connection is reactive so the UI can track property changes
        // like serializedSignal and status.
        if (!pendingConnections.has(connection.id)) {
            pendingConnections.set(connection.id, reactive(connection));
        } else {
            // Already there, but we call set again to trigger potential Map reactivity if needed
            pendingConnections.set(connection.id, pendingConnections.get(connection.id)!);
        }

        const existingStatus = lastStatusMap.get(connection.id);
        const existingSignal = connection.serializedSignal || '';
        const prevSignal = lastSignalMap.get(connection.id);
        const existingGathering = (connection as any)._lastGathering || '';

        if (existingStatus === connection.status && 
            prevSignal === existingSignal &&
            existingGathering === connection.iceGatheringState) return;

        const justConnected = connection.status === PeerConnectionStatus.connected && existingStatus !== PeerConnectionStatus.connected;

        lastStatusMap.set(connection.id, connection.status);
        lastSignalMap.set(connection.id, existingSignal);
        (connection as any)._lastGathering = connection.iceGatheringState;

        // Map Port to Domain Participant Type
        actor.send({ 
            type: 'UPDATE_PARTICIPANT', 
            participant: {
                id: connection.id,
                name: connection.remotePlayerName || 'Guest',
                status: connection.status as any,
                isHost: connection.isHostConnection,
                publicKey: connection.remotePublicKey
            }
        });
        
        registerConnectionHandlers(connection);

        if (justConnected) broadcastTopologyGossip();

        logger.sig('updateConnection', connection.id, connection.status);
    };

    const initiatedP2P = new Set<string>();

    watch(view, (newView) => {
        broadcast({ namespace: 'game', type: 'SYNC_PLAYER_STATUS', payload: newView });
    });

    watch(
        [connectedPeers, () => (boardSnapshot.value as any)?.context?.topologyMode],
        ([peers, mode]) => {
            (peers as IPeerConnectionPort[]).forEach((c: any) => {
                if (!(c as any)._hasInitialSync) {
                    c.send(JSON.stringify({ namespace: 'game', type: 'SYNC_PLAYER_STATUS', payload: view.value }));
                    if (isInitiator.value && boardId.value && boardId.value !== 'manual') {
                        c.send(JSON.stringify({ namespace: 'game', type: 'NEW_BOARD', payload: boardId.value }));
                    }
                    (c as any)._hasInitialSync = true;
                }
            });

            if (isInitiator.value && mode === 'mesh') {
                const connected = (peers as IPeerConnectionPort[]).filter(c => c.status === PeerConnectionStatus.connected);
                for (let i = 0; i < connected.length; i++) {
                    for (let j = i + 1; j < connected.length; j++) {
                        const g1 = connected[i];
                        const g2 = connected[j];
                        if (!g1.remotePublicKey || !g2.remotePublicKey) continue;
                        const pairId = [g1.remotePublicKey, g2.remotePublicKey].sort().join(':');
                        if (!initiatedP2P.has(pairId)) {
                            logger.sig(`[P2P] Host requesting connection between ${g1.remotePlayerName} and ${g2.remotePlayerName}`);
                            g1.send(JSON.stringify({
                                namespace: 'player',
                                type: 'REQUEST_P2P_OFFER',
                                payload: { targetPeerId: g2.id, targetPlayerName: g2.remotePlayerName, targetPublicKey: g2.remotePublicKey },
                            }));
                            initiatedP2P.add(pairId);
                        }
                    }
                }
            }
        },
        { deep: true }
    );

    return { pendingConnections, connectedPeers, pendingSignaling, broadcast, updateConnection, syncParticipants, broadcastTopologyGossip, handlePlayerNamespace, handleGameNamespace };
}
