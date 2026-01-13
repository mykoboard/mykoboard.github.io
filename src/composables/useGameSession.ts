import { ref, computed, watch, watchEffect, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from "uuid";
import { useMachine } from "@xstate/vue";
import { lobbyMachine } from "../machines/lobbyMachine";
import { Connection, ConnectionStatus } from "../lib/webrtc";
import { logger } from "../lib/logger";
import { getGameById } from "../lib/GameRegistry";
import { toast } from "vue-sonner";
import { Ledger, createLobbyMessage, isLobbyMessage, PlayerInfo } from "@mykoboard/integration";
import { SecureWallet, PlayerIdentity } from "../lib/wallet";
import { SignalingService } from "../lib/signaling";
import { SessionManager } from "../lib/sessions";
import { GameSession } from "../lib/db";

// Global-ish state for the session to mimic the Provider behavior
const identity = ref<PlayerIdentity | null>(null);
const isLoading = ref(true);
const signalingMode = ref<'manual' | 'server' | null>(null);
const isServerConnecting = ref(false);
const signalingClient = ref<SignalingService | null>(null);
const availableOffers = ref<any[]>([]);
const activeSessions = ref<GameSession[]>([]);

export function useGameSession() {
    const route = useRoute();
    const router = useRouter();

    const gameId = computed(() => route.params.gameId as string);
    const boardId = computed(() => route.params.boardId as string);
    const game = computed(() => getGameById(gameId.value || ""));

    const { snapshot, send } = useMachine(lobbyMachine, {
        input: {
            playerName: identity.value?.name || "Anonymous"
        },
        inspect: (inspectionEvent) => {
            if (inspectionEvent.type === '@xstate.event') {
                logger.lobby('EVENT', inspectionEvent.event.type, inspectionEvent.event);
            }
            if (inspectionEvent.type === '@xstate.snapshot' && inspectionEvent.snapshot.status === 'active') {
                const snapshotValue = (inspectionEvent.snapshot as any).value;
                logger.lobby('STATE', JSON.stringify(snapshotValue));
            }
        }
    });

    // Derived properties
    const isInitiator = computed(() => snapshot.value.context.isInitiator);
    const isGameStarted = computed(() => snapshot.value.context.isGameStarted);
    const connections = computed(() => snapshot.value.context.connections);
    const connectionList = computed(() => Array.from(connections.value.values()));
    const connectedPeers = computed(() => connectionList.value.filter(c => c.status === ConnectionStatus.connected));
    const pendingSignaling = computed(() => connectionList.value.filter(c => c.status !== ConnectionStatus.connected && c.status !== ConnectionStatus.closed));
    const isConnected = computed(() => snapshot.value.matches('room'));
    const view = computed(() => (snapshot.value.matches('selection') || snapshot.value.matches('discovery')) ? 'lobby' : 'game');

    // Load identity once
    const initIdentity = async () => {
        if (identity.value) return;
        const wallet = SecureWallet.getInstance();
        identity.value = await wallet.getIdentity();
        isLoading.value = false;
    };
    initIdentity();

    const lastStatusMap = new Map<string, string>();
    const lastSignalMap = new Map<string, string>();

    const updateConnection = (connection: Connection) => {
        const existingStatus = lastStatusMap.get(connection.id);
        const existingSignal = connection.signal?.toString() || "";
        const prevSignal = lastSignalMap.get(connection.id);

        if (existingStatus === connection.status && prevSignal === existingSignal) return;

        lastStatusMap.set(connection.id, connection.status);
        lastSignalMap.set(connection.id, existingSignal);

        send({ type: 'UPDATE_CONNECTION', connection });

        // Setup message listener if not present
        if (!(connection as any)._hasListener) {
            connection.addMessageListener((data: string) => {
                try {
                    const msg = JSON.parse(data);
                    if (!isLobbyMessage(msg)) return;
                    if (msg.type === 'START_GAME') send({ type: 'START_GAME' });
                    if (msg.type === 'GAME_STARTED') send({ type: 'GAME_STARTED' });
                    if (msg.type === 'GAME_RESET') send({ type: 'GAME_RESET' });
                    if (msg.type === 'NEW_BOARD') router.replace(`/games/${gameId.value}/${msg.payload}`);
                    if (msg.type === 'SYNC_PLAYER_STATUS') send({ type: 'SET_PLAYER_STATUS', playerId: connection.id, status: msg.payload });
                    if (msg.type === 'SYNC_PARTICIPANTS') send({ type: 'SYNC_PARTICIPANTS', participants: msg.payload });
                    if (msg.type === 'SYNC_LEDGER') {
                        const entries = msg.payload as any[];
                        for (const entry of entries) {
                            if (entry.signature && entry.signerPublicKey) {
                                SecureWallet.verify(entry.action, entry.signature, entry.signerPublicKey).then(isValid => {
                                    if (!isValid) logger.error("Invalid signature in ledger entry", entry);
                                });
                            }
                        }
                        send({ type: 'SYNC_LEDGER', ledger: msg.payload });
                    }
                } catch { }
            });
            (connection as any)._hasListener = true;
        }
    };

    onUnmounted(() => {
        if (isInitiator.value && signalingClient.value) {
            signalingClient.value.deleteOffer();
        }
    });

    window.addEventListener('beforeunload', () => {
        if (isInitiator.value && signalingClient.value && boardId.value) {
            signalingClient.value.deleteOffer();
        }
    });

    const onHostAGame = (playerCount: number = 2) => {
        const isNewSession = snapshot.value.matches('selection') || snapshot.value.matches('discovery');
        if (isNewSession) {
            const newBoardId = uuidv4();
            router.replace(`/games/${gameId.value}/${newBoardId}`);
            send({ type: 'HOST', maxPlayers: playerCount, boardId: newBoardId });
        }

        const createConnection = () => {
            const connection = new Connection(updateConnection);
            connection.onClose = () => send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
            connection.openDataChannel();
            connection.prepareOfferSignal(snapshot.value.context.playerName);
        };

        if (isNewSession) {
            for (let i = 0; i < playerCount - 1; i++) createConnection();
        } else {
            createConnection();
        }
    };

    const startGame = () => {
        if (signalingMode.value === 'server' && signalingClient.value && isInitiator.value) {
            signalingClient.value.deleteOffer();
        }
        send({ type: 'START_GAME' });
    };

    const playerInfos = computed((): PlayerInfo[] => {
        const currentSession = activeSessions.value.find(s => s.boardId === boardId.value);
        const storedParticipants = currentSession?.participants || [];
        const externalParticipants = (snapshot.value.context.externalParticipants as any[]) || [];

        const localParticipant = storedParticipants.find(p => p.isYou);
        const localPlayer: PlayerInfo = {
            id: identity.value?.id || 'local',
            name: snapshot.value.context.playerName,
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
                const hostConnection = connectionList.value.find(c => c.status === ConnectionStatus.connected);
                infos.push({
                    id: hostData.id,
                    name: hostData.name,
                    status: (hostConnection ? snapshot.value.context.playerStatuses.get(hostConnection.id) : null) || (isGameStarted.value ? 'game' : 'lobby'),
                    isConnected: !!hostConnection,
                    isLocal: false,
                    isHost: true
                });
                processedIds.add(hostData.id);
            }
        }

        // 2. Other participants
        if (isInitiator.value) {
            connectionList.value.forEach(c => {
                if (!processedIds.has(c.id)) {
                    const storedPeer = storedParticipants.find(p => p.id === c.id);
                    infos.push({
                        id: c.id,
                        name: c.remotePlayerName || storedPeer?.name || "Anonymous",
                        status: snapshot.value.context.playerStatuses.get(c.id) || 'lobby',
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

    const connectWithOffer = () => {
        send({ type: 'JOIN' });
        const connection = new Connection(updateConnection);
        connection.onClose = () => send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
        connection.status = ConnectionStatus.readyToAccept;
        connection.setDataChannelCallback();
        updateConnection(connection);
    };

    const updateOffer = async (connection: Connection, offer: string) => {
        if (!(connection instanceof Connection) || !offer) return;
        try {
            await connection.acceptOffer(offer, snapshot.value.context.playerName);
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
        send({ type: 'FINISH_GAME' });
        if (boardId.value) {
            SessionManager.updateStatus(boardId.value, 'finished');
        }
    };

    const onAddLedger = async (action: { type: string, payload: any }) => {
        if (!isInitiator.value) return;
        const wallet = SecureWallet.getInstance();
        const ident = await wallet.getIdentity();
        if (!ident) return;

        const signature = await wallet.sign(action);
        const ledger = Ledger.fromEntries(snapshot.value.context.ledger);
        const entry = await ledger.addEntry({ ...action });
        entry.signature = signature;
        entry.signerPublicKey = ident.publicKey;

        const updatedLedger = ledger.getEntries();
        send({ type: 'SYNC_LEDGER', ledger: updatedLedger });
        connectedPeers.value.forEach(c => {
            c.send(JSON.stringify(createLobbyMessage('SYNC_LEDGER', updatedLedger)));
        });
    };

    const onJoinFromList = async (session: any, slot: any) => {
        send({ type: 'JOIN' });
        const conn = new Connection(updateConnection);
        conn.setDataChannelCallback();
        await conn.acceptOffer(slot.offer, snapshot.value.context.playerName);

        const checkSignal = setInterval(() => {
            if (conn.signal) {
                const targetBoardId = session.sessionBoardId || session.boardId || boardId.value;
                if (targetBoardId) signalingClient.value?.updateBoardId(targetBoardId);
                signalingClient.value?.sendAnswer(session.connectionId, slot.connectionId, conn.signal, targetBoardId);
                clearInterval(checkSignal);
                if (!boardId.value && targetBoardId) router.replace(`/games/${gameId.value}/${targetBoardId}`);
            }
        }, 500);
    };

    const handlePlayAgain = () => {
        const newBoardId = uuidv4();
        connectedPeers.value.forEach(c => {
            if (c.status === ConnectionStatus.connected) {
                c.send(JSON.stringify(createLobbyMessage('NEW_BOARD', newBoardId)));
            }
        });
        signalingClient.value?.deleteOffer();
        send({ type: 'CLOSE_SESSION' });
        send({ type: 'HOST' });
        router.push(`/games/${gameId.value}/${newBoardId}`);
    };

    const onDeleteSession = async (id: string) => {
        await SessionManager.removeSession(id);
        activeSessions.value = await SessionManager.getSessions();
    };

    const onAcceptGuest = () => {
        const guest = snapshot.value.context.pendingGuest;
        send({ type: 'ACCEPT_GUEST' });
        if (guest) updateConnection(guest.connection);
    };

    const onRejectGuest = () => send({ type: 'REJECT_GUEST' });

    const onCancelSignaling = (connection: Connection) => {
        connection.close();
        send({ type: 'CANCEL_SIGNALING', connectionId: connection.id });
    };

    const onBackToGames = () => {
        signalingClient.value?.deleteOffer();
        send({ type: 'CLOSE_SESSION' });
        router.push(`/games/${gameId.value}`);
    };

    const onBackToDiscovery = () => {
        send({ type: 'BACK_TO_LOBBY' });
        if (signalingMode.value === 'server') signalingClient.value?.requestOffers();
        router.push(`/games/${gameId.value}`);
    };

    // --- WATCHERS & SIDE EFFECTS ---

    // 1. Signaling Broadcast (Host Only)
    let broadcastTimeout: NodeJS.Timeout | null = null;
    const lastSentSlots = ref("");

    watch([isInitiator, signalingMode, signalingClient, boardId, connectedPeers, pendingSignaling], () => {
        if (!isInitiator.value || signalingMode.value !== 'server' || !signalingClient.value || !boardId.value) return;

        if (broadcastTimeout) clearTimeout(broadcastTimeout);
        broadcastTimeout = setTimeout(() => {
            const currentSlots = [
                ...connectedPeers.value.map(c => ({ connectionId: c.id, offer: c.signal, status: 'taken' as const, peerName: c.remotePlayerName })),
                ...pendingSignaling.value.filter(c => c.signal).map(c => ({ connectionId: c.id, offer: c.signal, status: 'open' as const }))
            ];

            if (currentSlots.length > 0) {
                const slotsString = JSON.stringify(currentSlots);
                const cacheKey = `${boardId.value}:${slotsString}`;
                if (cacheKey !== lastSentSlots.value) {
                    const success = signalingClient.value?.sendOffer(currentSlots, gameId.value!, boardId.value, snapshot.value.context.playerName);
                    if (success) lastSentSlots.value = cacheKey;
                }
            }
        }, 500);
    });

    // 2. Session Persistence
    watchEffect(() => {
        if (isConnected.value && gameId.value && boardId.value && boardId.value !== 'manual') {
            SessionManager.saveSession({
                gameId: gameId.value,
                boardId: boardId.value,
                playerName: snapshot.value.context.playerName,
                gameName: game.value?.name || "Unknown Game",
                lastPlayed: Date.now(),
                status: snapshot.value.matches('room.finished') ? 'finished' : 'active',
                ledger: snapshot.value.context.ledger,
                participants: playerInfos.value.map(p => ({
                    id: p.id,
                    name: p.name,
                    isYou: p.isLocal,
                    isHost: p.isHost
                }))
            });
        }
    });

    // 3. Signaling Lifecycle
    const connectionBoardId = ref<string | undefined>();
    watch([signalingMode, snapshot, boardId], async () => {
        const isActiveLobby = snapshot.value.matches('hosting') || snapshot.value.matches('discovery') || snapshot.value.matches('joining') || snapshot.value.matches('approving');
        const isHostInRoom = snapshot.value.matches('room') && isInitiator.value;
        const shouldConnect = signalingMode.value === 'server' && (isActiveLobby || isHostInRoom);
        const currentBoardId = boardId.value || gameId.value || "";

        if (shouldConnect) {
            if (connectionBoardId.value !== currentBoardId && signalingClient.value?.isConnected) {
                signalingClient.value.updateBoardId(currentBoardId);
                connectionBoardId.value = currentBoardId;
            }

            if ((!signalingClient.value || !signalingClient.value.isConnected) && !isServerConnecting.value) {
                isServerConnecting.value = true;
                try {
                    const wallet = SecureWallet.getInstance();
                    const ident = await wallet.getIdentity();
                    if (ident) {
                        const client = new SignalingService(gameId.value || "default", currentBoardId, ident.name, (msg) => {
                            if (msg.type === 'offerList') availableOffers.value = msg.offers || [];
                            if (msg.type === 'error') {
                                logger.error("Signaling error:", msg.message);
                                toast.error(msg.message || "Signaling error occurred", {
                                    description: msg.code === 'DUPLICATE_IDENTITY' ? "You are already in this game session." : undefined
                                });
                            }
                            if (msg.type === 'answer') {
                                const pendingConn = msg.to
                                    ? connectionList.value.find(c => c.id === msg.to)
                                    : connectionList.value.find(c => c.status === ConnectionStatus.started);

                                if (pendingConn) {
                                    if (signalingMode.value === 'server') {
                                        send({
                                            type: 'REQUEST_JOIN',
                                            connectionId: msg.from,
                                            peerName: msg.peerName || "Anonymous Guest",
                                            answer: msg.answer,
                                            connection: pendingConn
                                        });
                                    } else {
                                        pendingConn.acceptAnswer(msg.answer);
                                        updateConnection(pendingConn);
                                    }
                                }
                            }
                        });
                        const challenge = `SIGN_IN:${ident.subscriptionToken}`;
                        const signature = await wallet.sign(challenge);
                        await client.connect(ident.subscriptionToken, ident.publicKey, signature);
                        signalingClient.value = client;
                        connectionBoardId.value = currentBoardId;
                    }
                } catch (e) {
                    logger.error("Signaling connection failed", e);
                } finally {
                    isServerConnecting.value = false;
                }
            }
        } else if (signalingClient.value) {
            signalingClient.value.disconnect(isInitiator.value);
            signalingClient.value = null;
        }
    });

    // 4. Session Restoration
    watch(boardId, async (newId) => {
        if (newId && newId !== 'manual' && (snapshot.value.matches('selection') || snapshot.value.matches('discovery'))) {
            const session = await SessionManager.getSession(newId);
            if (session && session.ledger.length > 0 && snapshot.value.context.ledger.length === 0) {
                send({ type: 'LOAD_LEDGER', ledger: session.ledger });
                send({ type: 'RESUME' });
                if (session.status === 'finished') setTimeout(() => send({ type: 'FINISH_GAME' }), 10);
            }
        }
    }, { immediate: true });

    // 5. Refresh offers when entering lobby
    watch([snapshot, signalingMode, signalingClient], () => {
        if (signalingMode.value === 'server' && signalingClient.value && (snapshot.value.matches('discovery') || snapshot.value.matches('selection'))) {
            signalingClient.value.requestOffers();
        }
    });

    // 6. Initial Sync for newcomers
    watch(connectedPeers, (peers) => {
        peers.forEach(c => {
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
        snapshot,
        send,
        signalingMode,
        isServerConnecting,
        signalingClient,
        availableOffers,
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
        onJoinFromList,
        handlePlayAgain,
        onDeleteSession,
        onAcceptGuest,
        onRejectGuest,
        onCancelSignaling,
        onBackToGames,
        onBackToDiscovery,
    };
}
