import { ref, computed, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from "uuid";
import { useSelector } from "@xstate/vue";
import { Connection, ConnectionStatus } from "../lib/webrtc";
import { logger } from "../lib/logger";
import { getGameById } from "../lib/GameRegistry";
import { Ledger, createLobbyMessage, isLobbyMessage, PlayerInfo, createLobbyMessage as createMsg } from "@mykoboard/integration";
import { SecureWallet } from "../lib/wallet";
import { SessionManager } from "../lib/sessions";
import {
    identity,
    isLoading,
    signalingClient,
    activeSessions,
    lobbyActor,
    getBoardActor,
    useLobby
} from "./useLobby";

export function useGameSession() {
    const route = useRoute();
    const router = useRouter();
    const { setupSignaling, requestOffers, signalingMode, lobbySend, lobbySnapshot } = useLobby();

    const gameId = computed(() => route.params.gameId as string);
    const boardId = computed(() => route.params.boardId as string);
    const game = computed(() => getGameById(gameId.value || ""));

    // Dynamic Board Actor usage
    const isInsideBoard = computed(() => !!boardId.value);

    // We need a stable reference to the current board actor if it exists
    const currentBoardActor = computed(() => {
        if (!boardId.value || boardId.value === 'manual') return null;
        return getBoardActor(boardId.value, identity.value?.name || "Anonymous", false);
    });

    const boardSnapshot = useSelector(currentBoardActor, (s) => s as any);

    // Derived properties from Board Snapshot
    const isInitiator = computed(() => boardSnapshot.value?.context?.isInitiator || false);
    const isGameStarted = computed(() => boardSnapshot.value?.context?.isGameStarted || false);
    const connections = computed(() => boardSnapshot.value?.context?.connections || new Map());
    const connectionList = computed(() => Array.from(connections.value.values()));
    const connectedPeers = computed((): Connection[] => connectionList.value.filter((c: any) => c.status === ConnectionStatus.connected) as Connection[]);
    const pendingSignaling = computed(() => connectionList.value.filter((c: any) => c.status !== ConnectionStatus.connected && c.status !== ConnectionStatus.closed));
    const isConnected = computed(() => !!boardSnapshot.value && (boardSnapshot.value as any).status !== 'idle');
    const view = computed(() => isInsideBoard.value ? 'game' : 'lobby');

    const playerInfos = computed((): PlayerInfo[] => {
        if (!boardSnapshot.value) return [];
        const ctx = (boardSnapshot.value as any).context;

        const currentSession = activeSessions.value.find(s => s.boardId === boardId.value);
        const storedParticipants = currentSession?.participants || [];
        const externalParticipants = (ctx.externalParticipants as any[]) || [];

        const localParticipant = storedParticipants.find(p => p.isYou);
        const localPlayer: PlayerInfo = {
            id: identity.value?.id || 'local',
            name: ctx.playerName,
            status: isGameStarted.value ? 'game' : 'lobby',
            isConnected: true,
            isLocal: true,
            isHost: localParticipant ? localParticipant.isHost : isInitiator.value
        };

        const infos: PlayerInfo[] = [];
        const processedIds = new Set<string>();

        // 1. Host Handling
        if (isInitiator.value) {
            infos.push(localPlayer);
            processedIds.add(localPlayer.id);
        } else if (externalParticipants.length > 0) {
            const hostData = externalParticipants.find(p => p.isHost);
            if (hostData) {
                const hostConnection = (connectedPeers.value as any).find((c: any) => c.status === ConnectionStatus.connected);
                infos.push({
                    id: hostData.id,
                    name: hostData.name,
                    status: (hostConnection ? ctx.playerStatuses.get(hostConnection.id) : null) || (isGameStarted.value ? 'game' : 'lobby'),
                    isConnected: !!hostConnection,
                    isLocal: false,
                    isHost: true
                });
                processedIds.add(hostData.id);
            }
        }

        // 2. Other participants
        if (isInitiator.value) {
            (connectionList.value as any).forEach((c: any) => {
                if (!processedIds.has(c.id)) {
                    const storedPeer = storedParticipants.find(p => p.id === c.id);
                    infos.push({
                        id: c.id,
                        name: c.remotePlayerName || storedPeer?.name || "Anonymous",
                        status: ctx.playerStatuses.get(c.id) || 'lobby',
                        isConnected: c.status === ConnectionStatus.connected,
                        isLocal: false,
                        isHost: false
                    });
                    processedIds.add(c.id);
                }
            });
        } else if (externalParticipants.length > 0) {
            externalParticipants.forEach(p => {
                if (p.isHost || p.id === 'local') return;
                if (p.name === localPlayer.name && !processedIds.has(p.id)) {
                    infos.push({ ...localPlayer, id: p.id });
                    processedIds.add(p.id);
                } else {
                    infos.push({
                        id: p.id,
                        name: p.name,
                        status: isGameStarted.value ? 'game' : 'lobby',
                        isConnected: true,
                        isLocal: false,
                        isHost: false
                    });
                    processedIds.add(p.id);
                }
            });
        }

        // 3. Historical
        storedParticipants.forEach(p => {
            if (!p.isYou && !processedIds.has(p.id)) {
                infos.push({
                    id: p.id,
                    name: p.name,
                    status: (currentSession?.status === 'finished' || isGameStarted.value) ? 'game' : 'lobby',
                    isConnected: false,
                    isLocal: false,
                    isHost: p.isHost
                });
            }
        });

        return infos;
    });

    watchEffect(() => {
        const s = boardSnapshot.value as any;
        if (s?.status === 'active' && boardId.value && boardId.value !== 'manual') {
            SessionManager.saveSession({
                gameId: gameId.value,
                boardId: boardId.value,
                playerName: s.context.playerName,
                gameName: game.value?.name || "Unknown Game",
                lastPlayed: Date.now(),
                status: s.matches('finished') ? 'finished' : 'active',
                ledger: s.context.ledger,
                participants: playerInfos.value.map(p => ({
                    id: p.id,
                    name: p.name,
                    isYou: p.isLocal,
                    isHost: p.isHost
                }))
            });
        }
    });

    const lastStatusMap = new Map<string, string>();
    const lastSignalMap = new Map<string, string>();

    const updateConnection = (connection: Connection) => {
        const actor = currentBoardActor.value;
        if (!actor) return;

        const existingStatus = lastStatusMap.get(connection.id);
        const existingSignal = connection.signal?.toString() || "";
        const prevSignal = lastSignalMap.get(connection.id);

        if (existingStatus === connection.status && prevSignal === existingSignal) return;

        lastStatusMap.set(connection.id, connection.status);
        lastSignalMap.set(connection.id, existingSignal);

        actor.send({ type: 'UPDATE_CONNECTION', connection });

        // Setup message listener if not present
        if (!(connection as any)._hasListener) {
            connection.addMessageListener((data: string) => {
                try {
                    const msg = JSON.parse(data);
                    if (!isLobbyMessage(msg)) return;
                    if (msg.type === 'START_GAME') actor.send({ type: 'START_GAME' });
                    if (msg.type === 'GAME_STARTED') actor.send({ type: 'GAME_STARTED' });
                    if (msg.type === 'GAME_RESET') actor.send({ type: 'GAME_RESET' });
                    if (msg.type === 'NEW_BOARD') router.replace(`/games/${gameId.value}/${msg.payload}`);
                    if (msg.type === 'SYNC_PLAYER_STATUS') actor.send({ type: 'SET_PLAYER_STATUS', playerId: connection.id, status: msg.payload });
                    if (msg.type === 'SYNC_PARTICIPANTS') actor.send({ type: 'SYNC_PARTICIPANTS', participants: msg.payload });
                    if (msg.type === 'SYNC_LEDGER') {
                        const entries = msg.payload as any[];
                        for (const entry of entries) {
                            if (entry.signature && entry.signerPublicKey) {
                                SecureWallet.verify(entry.action, entry.signature, entry.signerPublicKey).then(isValid => {
                                    if (!isValid) logger.error("Invalid signature in ledger entry", entry);
                                });
                            }
                        }
                        actor.send({ type: 'SYNC_LEDGER', ledger: msg.payload });
                    }
                } catch { }
            });
            (connection as any)._hasListener = true;
        }
    };

    const onHostAGame = (playerCount: number = 2) => {
        if (!isInsideBoard.value) {
            const newBoardId = uuidv4();
            router.push(`/games/${gameId.value}/${newBoardId}?maxPlayers=${playerCount}`);
        } else if (currentBoardActor.value) {
            const connection = new Connection(updateConnection);
            connection.onClose = () => currentBoardActor.value?.send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
            connection.openDataChannel();
            connection.prepareOfferSignal(boardSnapshot.value?.context?.playerName || identity.value?.name || "Anonymous");
        }
    };

    const startGame = () => {
        if (signalingMode.value === 'server' && signalingClient.value && isInitiator.value) {
            signalingClient.value.deleteOffer();
        }
        currentBoardActor.value?.send({ type: 'START_GAME' });
    };

    const connectWithOffer = () => {
        if (!currentBoardActor.value) return;
        currentBoardActor.value.send({ type: 'JOIN', boardId: boardId.value });
        const connection = new Connection(updateConnection);
        connection.onClose = () => currentBoardActor.value?.send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
        connection.status = ConnectionStatus.readyToAccept;
        connection.setDataChannelCallback();
        updateConnection(connection);
    };

    const updateOffer = async (connection: Connection, offer: string) => {
        if (!(connection instanceof Connection) || !offer) return;
        try {
            await connection.acceptOffer(offer, identity.value?.name || "Anonymous");
        } catch (e) {
            logger.error("Failed to accept offer", e);
        }
    };

    const updateAnswer = (connection: Connection, answer: string) => {
        if (!(connection instanceof Connection) || !answer) return;
        try {
            connection.acceptAnswer(answer);
            updateConnection(connection);
        } catch (e) {
            logger.error("Failed to accept answer", e);
        }
    };

    const onFinishGame = () => {
        currentBoardActor.value?.send({ type: 'FINISH_GAME' });
        if (boardId.value) {
            SessionManager.updateStatus(boardId.value, 'finished');
        }
    };

    const onAddLedger = async (action: { type: string, payload: any }) => {
        if (!isInitiator.value || !currentBoardActor.value) return;
        const wallet = SecureWallet.getInstance();
        const ident = await wallet.getIdentity();
        if (!ident) return;

        const signature = await wallet.sign(action);
        const ledger = Ledger.fromEntries((boardSnapshot.value as any)?.context?.ledger || []);
        const entry = await ledger.addEntry({ ...action });
        entry.signature = signature;
        entry.signerPublicKey = ident.publicKey;

        const updatedLedger = ledger.getEntries();
        currentBoardActor.value.send({ type: 'SYNC_LEDGER', ledger: updatedLedger });
        (connectedPeers.value as any).forEach((c: any) => {
            c.send(JSON.stringify(createLobbyMessage('SYNC_LEDGER', updatedLedger)));
        });
    };

    const handlePlayAgain = () => {
        const newBoardId = uuidv4();
        (connectedPeers.value as any).forEach((c: any) => {
            if (c.status === ConnectionStatus.connected) {
                c.send(JSON.stringify(createLobbyMessage('NEW_BOARD', newBoardId)));
            }
        });
        signalingClient.value?.deleteOffer();
        currentBoardActor.value?.send({ type: 'CLOSE_SESSION' });

        // Remove old board actor
        // We can't easily reach boardActors from here unless we export it or it's in useLobby
        // SessionManager should still work.
        router.push(`/games/${gameId.value}/${newBoardId}`);
    };

    const onAcceptGuest = () => {
        const guest = (boardSnapshot.value as any)?.context?.pendingGuest as any;
        currentBoardActor.value?.send({ type: 'ACCEPT_GUEST' });
        if (guest) updateConnection(guest.connection);
    };

    const onRejectGuest = () => currentBoardActor.value?.send({ type: 'REJECT_GUEST' });

    const onCancelSignaling = (connection: Connection) => {
        connection.close();
        currentBoardActor.value?.send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
    };

    const onBackToGames = () => {
        signalingClient.value?.deleteOffer();
        currentBoardActor.value?.send({ type: 'CLOSE_SESSION' });
        router.push(`/games/${gameId.value}`);
    };

    const onBackToDiscovery = () => {
        router.push(`/games/${gameId.value}`);
    };

    // --- WATCHERS & SIDE EFFECTS ---

    // 1. Signaling Broadcast (Host Only)
    let broadcastTimeout: NodeJS.Timeout | null = null;
    const lastSentSlots = ref("");

    watch([isInitiator, signalingMode, signalingClient, boardId, connectedPeers, pendingSignaling], () => {
        if (!isInitiator.value || signalingMode.value !== 'server' || !signalingClient.value || !boardId.value) {
            return;
        }

        if (broadcastTimeout) clearTimeout(broadcastTimeout);
        broadcastTimeout = setTimeout(() => {
            const currentSlots = [
                ...(connectedPeers.value as any).map((c: any) => ({ connectionId: c.id, offer: c.signal, status: 'taken' as const, peerName: c.remotePlayerName })),
                ...(pendingSignaling.value as any).filter((c: any) => c.signal).map((c: any) => ({ connectionId: c.id, offer: c.signal, status: 'open' as const }))
            ];

            if (currentSlots.length > 0) {
                const slotsString = JSON.stringify(currentSlots);
                const cacheKey = `${boardId.value}:${slotsString}`;
                if (cacheKey !== lastSentSlots.value) {
                    const success = signalingClient.value?.sendOffer(currentSlots, gameId.value!, boardId.value, identity.value?.name || "Anonymous");
                    if (success) lastSentSlots.value = cacheKey;
                }
            }
        }, 500);
    });

    // 2. Participant Sync (Host Only)
    watch([isInitiator, playerInfos], () => {
        if (!isInitiator.value) return;

        const participants = playerInfos.value.map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost
        }));

        (connectedPeers.value as any).forEach((c: any) => {
            if (c.status === ConnectionStatus.connected) {
                try {
                    c.send(JSON.stringify(createLobbyMessage('SYNC_PARTICIPANTS', participants)));
                } catch (e) {
                    logger.error("Failed to sync participants to peer", c.id, e);
                }
            }
        });
    }, { deep: true, immediate: true });

    // 3. Signaling Lifecycle for Board
    watch([signalingMode, boardId, isInsideBoard], async () => {
        const shouldConnect = signalingMode.value === 'server' && (isInsideBoard.value || !boardId.value);
        logger.sig("[WATCH] Signaling Lifecycle update. shouldConnect:", shouldConnect, "mode:", signalingMode.value, "boardId:", boardId.value);
        if (shouldConnect) {
            await setupSignaling(gameId.value, boardId.value);
        }
    }, { immediate: true });

    // 4. Session Restoration
    watch(boardId, async (newId) => {
        if (newId && newId !== 'manual' && isInsideBoard.value) {
            const session = await SessionManager.getSession(newId);
            const actor = getBoardActor(newId, identity.value?.name || "Anonymous", false);
            const ctx = (actor.getSnapshot() as any).context;

            if (session && session.ledger.length > 0 && ctx.ledger.length === 0) {
                actor.send({ type: 'LOAD_LEDGER', ledger: session.ledger });
                actor.send({ type: 'GAME_STARTED' });
                if (session.status === 'finished') setTimeout(() => actor.send({ type: 'FINISH_GAME' }), 10);
            }
        }
    }, { immediate: true });

    // 5. Offer Refresh
    watch([view, signalingMode, signalingClient], () => {
        if (view.value === 'lobby' && signalingMode.value === 'server' && signalingClient.value) {
            requestOffers();
        }
    });

    // 6. Initial Sync
    watch(connectedPeers, (peers) => {
        (peers as any).forEach((c: any) => {
            if (!(c as any)._hasInitialSync) {
                c.send(JSON.stringify(createLobbyMessage('SYNC_PLAYER_STATUS', view.value)));
                if (isInitiator.value && boardId.value && boardId.value !== 'manual') {
                    c.send(JSON.stringify(createLobbyMessage('NEW_BOARD', boardId.value)));
                }
                (c as any)._hasInitialSync = true;
            }
        });
    });

    return {
        identity,
        isLoading,
        lobbySnapshot,
        snapshot: boardSnapshot,
        send: (ev: any) => currentBoardActor.value?.send(ev),
        lobbySend,
        signalingMode,
        setSignalingMode: (mode: any) => lobbySend({ type: 'SELECT_MODE', mode }), // bridge for compatibility if needed
        signalingClient,
        availableOffers: computed(() => (useLobby().availableOffers.value)), // proxy to useLobby
        activeSessions,
        playerInfos,
        connectedPeers,
        pendingSignaling,
        isInitiator,
        isGameStarted,
        onHostAGame,
        startGame,
        connectWithOffer,
        updateOffer,
        updateAnswer,
        onFinishGame,
        onAddLedger,
        handlePlayAgain,
        onAcceptGuest,
        onRejectGuest,
        onCancelSignaling,
        onBackToGames,
        onBackToDiscovery,
    };
}
