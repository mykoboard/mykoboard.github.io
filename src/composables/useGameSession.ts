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
import { SignalingService } from "../lib/signaling";
import { toast } from "vue-sonner";
import { db } from "../lib/db";
import {
    identity,
    isLoading,
    activeSessions,
    lobbyActor,
    getBoardActor
} from "./sharedState";

export function useGameSession() {
    const route = useRoute();
    const router = useRouter();

    // Local signaling state (moved from useLobby)
    const signalingClient = ref<SignalingService | null>(null);
    const isServerConnecting = ref(false);
    const connectionBoardId = ref<string>("");
    const hasRegistered = ref(false); // Track if we've already registered

    // Pending join requests (for host approval)
    interface PendingJoinRequest {
        connectionId: string;
        peerName: string;
        publicKey: string;
        encryptionPublicKey?: string;
        timestamp: number;
    }
    const pendingJoinRequests = ref<PendingJoinRequest[]>([]);

    // Track pending connections waiting for answers
    const pendingConnections = ref<Map<string, Connection>>(new Map());

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

    // Signaling Setup (moved from useLobby)
    const setupSignaling = async (gameId: string, boardId?: string) => {
        const currentBoardId = boardId || gameId;
        logger.sig("setupSignaling called with gameId:", gameId, "boardId:", boardId, "resolved currentBoardId:", currentBoardId);
        if (!currentBoardId) return;

        if (connectionBoardId.value !== currentBoardId && signalingClient.value?.isConnected) {
            logger.sig("Switching signaling board assignment from", connectionBoardId.value, "to", currentBoardId);
            signalingClient.value.updateBoardId(currentBoardId);
            connectionBoardId.value = currentBoardId;
        }

        if ((!signalingClient.value || !signalingClient.value.isConnected) && !isServerConnecting.value) {
            isServerConnecting.value = true;
            try {
                const wallet = SecureWallet.getInstance();
                const ident = await wallet.getIdentity();
                if (ident) {
                    const client = new SignalingService(gameId || "default", currentBoardId, ident.name, (msg) => {
                        // Handle error messages
                        if (msg.type === 'error') {
                            logger.error("Signaling error:", msg.message || msg.code);
                            toast.error(msg.message || "Signaling error occurred");

                            if (msg.code === 'DUPLICATE_IDENTITY') {
                                router.replace(`/games/${gameId}`);
                            }
                        }

                        // Handle peerJoined: Guest has joined and wants to connect
                        if (msg.type === 'peerJoined') {
                            logger.sig("Peer joined:", msg.peerName, "publicKey:", msg.publicKey);

                            // Add to pending join requests for host approval
                            pendingJoinRequests.value.push({
                                connectionId: msg.from!,
                                peerName: msg.peerName || "Guest",
                                publicKey: msg.publicKey!,
                                encryptionPublicKey: msg.encryptionPublicKey,
                                timestamp: Date.now()
                            });
                        }

                        // Handle offer: Host has sent WebRTC offer
                        if (msg.type === 'offer') {
                            logger.sig("Received offer from host:", msg.from);
                            const targetId = msg.boardId || connectionBoardId.value;
                            if (!targetId) {
                                logger.error("No valid target board UUID for offer message");
                                return;
                            }

                            // Create connection and accept offer
                            const actor = getBoardActor(targetId, ident.name, false);
                            const connection = new Connection((c) => {
                                actor.send({ type: 'UPDATE_CONNECTION', connection: c });
                            });

                            // Add message listener to route messages to board actor
                            connection.addMessageListener((data: string) => {
                                try {
                                    const message = JSON.parse(data);
                                    if (!isLobbyMessage(message)) return;
                                    if (message.type === 'START_GAME') actor.send({ type: 'START_GAME' });
                                    if (message.type === 'GAME_STARTED') actor.send({ type: 'GAME_STARTED' });
                                    if (message.type === 'GAME_RESET') actor.send({ type: 'GAME_RESET' });
                                    if (message.type === 'NEW_BOARD') router.replace(`/games/${gameId.value}/${message.payload}`);
                                    if (message.type === 'SYNC_PLAYER_STATUS') actor.send({ type: 'SET_PLAYER_STATUS', playerId: connection.id, status: message.payload });
                                    if (message.type === 'SYNC_PARTICIPANTS') actor.send({ type: 'SYNC_PARTICIPANTS', participants: message.payload });
                                    if (message.type === 'SYNC_LEDGER') {
                                        const entries = message.payload as any[];
                                        for (const entry of entries) {
                                            if (entry.signature && entry.signerPublicKey) {
                                                SecureWallet.verify(entry.action, entry.signature, entry.signerPublicKey).then(isValid => {
                                                    if (!isValid) logger.error("Invalid signature in ledger entry", entry);
                                                });
                                            }
                                        }
                                        actor.send({ type: 'SYNC_LEDGER', ledger: entries });
                                    }
                                } catch (e) {
                                    logger.error("Failed to parse message:", e);
                                }
                            });

                            connection.onClose = () => {
                                actor.send({
                                    type: 'PEER_DISCONNECTED',
                                    connectionId: connection.id
                                });
                            };

                            connection.setDataChannelCallback();

                            // Accept the offer and generate answer
                            connection.acceptOffer(msg.offer, ident.name).then(() => {
                                // Wait for answer to be ready and send it
                                const checkAnswer = setInterval(() => {
                                    if (connection.signal && signalingClient.value) {
                                        clearInterval(checkAnswer);

                                        logger.sig("Sending answer to host:", msg.from);
                                        signalingClient.value.guestAnswer(
                                            msg.from!,
                                            ident.publicKey,
                                            connection.signal,
                                            undefined // iv
                                        );
                                    }
                                }, 100);
                            }).catch(e => {
                                logger.error("Failed to accept offer and generate answer:", e);
                            });
                        }

                        // Handle answer: Guest has sent WebRTC answer
                        if (msg.type === 'answer') {
                            logger.sig("Received answer from guest:", msg.from, "publicKey:", msg.publicKey);

                            // Find the pending connection
                            const connection = pendingConnections.value.get(msg.from!);
                            if (connection && msg.answer) {
                                logger.sig("Applying answer to connection:", msg.from);
                                try {
                                    connection.acceptAnswer(msg.answer);
                                    logger.sig("WebRTC connection established with:", msg.from);
                                    pendingConnections.value.delete(msg.from!);
                                } catch (e) {
                                    logger.error("Failed to accept answer:", e);
                                }
                            } else {
                                logger.error("No pending connection found for:", msg.from);
                            }
                        }
                    });
                    const challenge = `SIGN_IN:${ident.subscriptionToken}`;
                    const signature = await wallet.sign(challenge);
                    await client.connect(ident.subscriptionToken, ident.publicKey, signature);
                    signalingClient.value = client;
                    connectionBoardId.value = currentBoardId;
                }
            } catch (err) {
                logger.error("Failed to connect to signaling server:", err);
            } finally {
                isServerConnecting.value = false;
            }
        }
    };

    // New Flow: Host registers session without creating WebRTC offers
    const onHostAGame = async (playerCount: number = 2) => {
        if (!isInsideBoard.value) {
            const newBoardId = uuidv4();
            router.push(`/games/${gameId.value}/${newBoardId}?maxPlayers=${playerCount}`);
        } else if (currentBoardActor.value && boardId.value) {
            // This is called manually, not used for auto-registration
            logger.sig("Manual onHostAGame called (not used in new flow)");
        }
    };

    // New Flow: Guest joins existing session
    const onJoinAsGuest = async () => {
        if (!boardId.value || !signalingClient.value?.isConnected) {
            logger.error("Cannot join as guest: missing boardId or signaling not connected");
            return;
        }

        const wallet = SecureWallet.getInstance();
        const ident = await wallet.getIdentity();
        if (ident) {
            logger.sig("Sending guestJoin for boardId:", boardId.value);
            signalingClient.value.guestJoin(
                boardId.value,
                ident.name,
                ident.publicKey,
                ident.publicKey // Using publicKey as encryption key for now
            );
        }
    };

    // Check if a publicKey is in the friends list
    const isFriend = async (publicKey: string): Promise<boolean> => {
        const friends = await db.getAllFriends();
        return friends.some(f => f.publicKey === publicKey);
    };

    // Host approves a pending join request
    const onApprovePeer = async (request: PendingJoinRequest) => {
        logger.sig("Approving peer:", request.peerName, "publicKey:", request.publicKey);

        // Remove from pending list
        pendingJoinRequests.value = pendingJoinRequests.value.filter(
            r => r.connectionId !== request.connectionId
        );

        // Create WebRTC connection and offer
        const connection = new Connection((c) => {
            currentBoardActor.value?.send({ type: 'UPDATE_CONNECTION', connection: c });
        });

        connection.onClose = () => {
            currentBoardActor.value?.send({
                type: 'PEER_DISCONNECTED',
                connectionId: connection.id
            });
            pendingConnections.value.delete(request.connectionId);
        };

        connection.openDataChannel();
        await connection.prepareOfferSignal(
            boardSnapshot.value?.context?.playerName || identity.value?.name || "Anonymous"
        );

        // Store connection for when answer arrives
        pendingConnections.value.set(request.connectionId, connection);

        // Wait for the offer to be ready
        const checkOffer = setInterval(() => {
            if (connection.signal && signalingClient.value) {
                clearInterval(checkOffer);

                // Send hostOffer to the guest
                const wallet = SecureWallet.getInstance();
                wallet.getIdentity().then(ident => {
                    if (ident && signalingClient.value) {
                        signalingClient.value.hostOffer(
                            request.connectionId,
                            request.publicKey,
                            connection.signal,
                            ident.publicKey, // encryptionPublicKey
                            undefined // iv
                        );
                    }
                });
            }
        }, 100);
    };

    // Host rejects a pending join request
    const onRejectPeer = (request: PendingJoinRequest) => {
        logger.sig("Rejecting peer:", request.peerName);
        pendingJoinRequests.value = pendingJoinRequests.value.filter(
            r => r.connectionId !== request.connectionId
        );
    };

    const startGame = () => {
        if (signalingClient.value && isInitiator.value) {
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

    // 1. Participant Sync (Host Only)
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

    // Signaling Lifecycle for Board
    watch([boardId, isInsideBoard], async () => {
        const shouldConnect = isInsideBoard.value && boardId.value;
        logger.sig("[WATCH] Signaling Lifecycle update. shouldConnect:", shouldConnect, "boardId:", boardId.value);
        if (shouldConnect) {
            await setupSignaling(gameId.value, boardId.value);
        }
    }, { immediate: true });

    // Auto-register when signaling connects
    // Use board machine state to determine host vs guest
    watch([signalingClient, boardSnapshot, boardId], async () => {
        if (!signalingClient.value?.isConnected || !boardId.value || hasRegistered.value) return;

        const wallet = SecureWallet.getInstance();
        const ident = await wallet.getIdentity();
        if (!ident) return;

        const state = boardSnapshot.value;
        if (!state) return;

        // Check the actual state machine state to determine role
        const isHosting = state.matches('hosting') || state.matches('preparation');
        const isJoining = state.matches('joining');

        if (isHosting && state.context.isInitiator) {
            logger.sig("Auto-registering as HOST for boardId:", boardId.value, "state:", state.value);
            signalingClient.value.hostRegister(
                boardId.value,
                gameId.value,
                ident.name,
                ident.publicKey
            );
            hasRegistered.value = true;
        } else if (isJoining || !state.context.isInitiator) {
            logger.sig("Auto-joining as GUEST for boardId:", boardId.value, "state:", state.value);
            signalingClient.value.guestJoin(
                boardId.value,
                ident.name,
                ident.publicKey,
                ident.publicKey // Using publicKey as encryption key for now
            );
            hasRegistered.value = true;
        }
    });

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
        snapshot: boardSnapshot,
        send: (ev: any) => currentBoardActor.value?.send(ev),
        signalingClient,
        isServerConnecting,
        pendingJoinRequests,
        activeSessions,
        playerInfos,
        connectedPeers,
        pendingSignaling,
        isInitiator,
        isGameStarted,
        onHostAGame,
        onJoinAsGuest,
        isFriend,
        onApprovePeer,
        onRejectPeer,
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
        onBackToGames: () => router.push(`/games/${gameId.value}`),
        onBackToDiscovery: () => router.push(`/games/${gameId.value}`),
    };
}
