import { ref, computed, watch, watchEffect, onMounted, onUnmounted, shallowReactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from "uuid";
import { useSelector } from "@xstate/vue";
import { Connection, ConnectionStatus, Signal } from "../lib/webrtc";
import { logger } from "../lib/logger";
import { getGameById } from "../lib/GameRegistry";
import { Ledger, PlayerInfo } from "@mykoboard/integration";
import { SecureWallet, type PlayerIdentity } from "../lib/wallet";
import { SessionManager } from "../lib/sessions";
import { SignalingService } from "../lib/signaling";
import { toast } from "vue-sonner";
import { db, type KnownIdentity } from "../lib/db";
import {
    identity,
    isLoading,
    activeSessions,
    getBoardActor
} from "./sharedState";

export function useGameSession() {
    const route = useRoute();
    const router = useRouter();

    const waitForIdentity = async () => {
        if (identity.value) return identity.value;
        return new Promise<PlayerIdentity>((resolve) => {
            const stop = watch(identity, (val) => {
                if (val) {
                    stop();
                    resolve(val);
                }
            }, { immediate: true });
        });
    };

    // Local signaling state (moved from useLobby)
    const signalingClient = ref<SignalingService | null>(null);
    const isServerConnecting = ref(false);
    const connectionBoardId = ref<string>("");
    const hasRegistered = ref(false); // Track if we've already registered
    const hostSignalingMode = ref<'server' | 'manual' | null>(null);
    const manualGuestConnectionId = ref<string | null>(null);

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
        if (!boardId.value) return null;
        return getBoardActor(boardId.value, identity.value?.name || "Anonymous", false);
    });

    const boardSnapshot = useSelector(currentBoardActor, (s) => s as any);

    // Derived properties from Board Snapshot
    const isInitiator = computed(() => boardSnapshot.value?.context?.isInitiator || false);
    const isGameStarted = computed(() => boardSnapshot.value?.context?.isGameStarted || false);
    const connections = computed(() => boardSnapshot.value?.context?.connections || new Map());
    const connectionList = computed(() => Array.from(connections.value.values()));
    const connectedPeers = computed((): Connection[] => {
        const fromActor = connectionList.value.filter((c: any) => c.status === ConnectionStatus.connected) as Connection[];
        const fromPending = Array.from(pendingConnections.value.values()).filter(c => c.status === ConnectionStatus.connected);
        const merged = new Map<string, Connection>();
        fromActor.forEach((c: any) => merged.set(c.id, c));
        fromPending.forEach((c: any) => merged.set(c.id, c));
        return Array.from(merged.values());
    });
    
    // Merge actor connections and local pending connections to avoid race conditions in UI rendering
    const pendingSignaling = computed(() => {
        const fromActor = connectionList.value.filter((c: any) => c.status !== ConnectionStatus.connected && c.status !== ConnectionStatus.closed);
        const fromPending = Array.from(pendingConnections.value.values()).filter(c => c.status !== ConnectionStatus.connected && c.status !== ConnectionStatus.closed);
        
        const merged = new Map<string, any>();
        fromActor.forEach((c: any) => merged.set(c.id, c));
        fromPending.forEach((c: any) => merged.set(c.id, c));
        
        return Array.from(merged.values()) as Connection[];
    });

    const view = computed(() => isInsideBoard.value ? 'game' : 'lobby');

    const playerInfos = computed((): PlayerInfo[] => {
        if (!boardSnapshot.value) return [];
        const ctx = (boardSnapshot.value as any).context;

        const currentSession = activeSessions.value.find(s => s.boardId === boardId.value);
        const storedParticipants = currentSession?.participants || [];
        const externalParticipants = (ctx.externalParticipants as any[]) || [];

        const localParticipant = storedParticipants.find(p => p.id === identity.value?.id || p.publicKey === identity.value?.publicKey || p.isYou);
        const localPlayer: PlayerInfo = {
            id: identity.value?.id || 'local',
            name: identity.value?.name || (ctx.playerName !== "Anonymous" ? ctx.playerName : null) || 'Anonymous',
            status: isGameStarted.value ? 'game' : 'lobby',
            isConnected: true,
            isLocal: true,
            isHost: localParticipant ? localParticipant.isHost : isInitiator.value,
            publicKey: identity.value?.publicKey
        };

        const infos: PlayerInfo[] = [];
        const processedPublicKeys = new Set<string>();

        // 1. Always include local player
        infos.push(localPlayer);
        if (localPlayer.publicKey) processedPublicKeys.add(localPlayer.publicKey);

        // 2. Add other participants from the synced list (externalParticipants)
        externalParticipants.forEach(p => {
            if (!p.publicKey || processedPublicKeys.has(p.publicKey)) return;
            infos.push({
                id: p.id,
                name: p.name,
                status: isGameStarted.value ? 'game' : 'lobby',
                isConnected: true, 
                isLocal: false,
                isHost: p.isHost,
                publicKey: p.publicKey
            });
            processedPublicKeys.add(p.publicKey);
        });

        // 3. Add direct connections that haven't synced to externalParticipants yet
        if (isInitiator.value) {
            // Use live connections to bypass computed reactivity lag
            const actorConnections = (boardSnapshot.value as any)?.context?.connections || new Map();
            const allConnections = new Map(actorConnections);
            pendingConnections.value.forEach((c: any) => allConnections.set(c.id, c));

            allConnections.forEach((c: any) => {
                const publicKey = c.remotePublicKey;
                if (publicKey && !processedPublicKeys.has(publicKey)) {
                    infos.push({
                        id: c.id,
                        name: c.remotePlayerName || "Anonymous",
                        status: ctx.playerStatuses.get(c.id) || 'lobby',
                        isConnected: c.status === ConnectionStatus.connected,
                        isLocal: false,
                        isHost: false,
                        publicKey: publicKey
                    });
                    processedPublicKeys.add(publicKey);
                }
            });
        }

        // 4. Historical
        storedParticipants.forEach(p => {
            if (!p.isYou && p.publicKey && !processedPublicKeys.has(p.publicKey)) {
                infos.push({
                    id: p.id,
                    name: p.name,
                    status: (currentSession?.status === 'finished' || isGameStarted.value) ? 'game' : 'lobby',
                    isConnected: false,
                    isLocal: false,
                    isHost: p.isHost,
                    publicKey: p.publicKey
                });
                processedPublicKeys.add(p.publicKey);
            }
        });

        return infos;
    });

    watchEffect(() => {
        const s = boardSnapshot.value as any;
        if (s?.status === 'approving' || s?.status === 'hosting' || s?.status === 'preparation' || s?.status === 'playing' || s?.status === 'finished') {
            if (boardId.value && route.query.mode !== 'manual') {
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
                        isHost: p.isHost,
                        publicKey: p.publicKey
                    }))
                });
            }
        }
    });

    const lastStatusMap = new Map<string, string>();
    const lastSignalMap = new Map<string, string>();

    const broadcast = (msg: any) => {
        const data = JSON.stringify(msg);
        const mode = (boardSnapshot.value as any)?.context?.topologyMode || 'star';

        connectedPeers.value.forEach(c => {
            if (c.status === ConnectionStatus.connected) {
                // In star mode: 
                // - If I am Host (isInitiator), send to all guests.
                // - If I am Guest, send ONLY to the Host connection.
                if (mode === 'star' && !isInitiator.value) {
                    if (c.isHostConnection) { // We need this flag or check remotePublicKey
                        c.send(data);
                    }
                } else {
                    // Mesh mode OR I am Host in Star mode: send to all neighbors
                    c.send(data);
                }
            }
        });
    };

    const syncParticipants = () => {
        if (!isInitiator.value || !currentBoardActor.value || !identity.value) return;
        
        const actorConnections = (boardSnapshot.value as any)?.context?.connections || new Map();
        const liveConnections = new Map(actorConnections);
        pendingConnections.value.forEach((c: any, id: string) => liveConnections.set(id, c));

        const participants = [
            { id: identity.value.id, name: identity.value.name, isHost: true, publicKey: identity.value.publicKey },
            ...Array.from(liveConnections.values())
                .filter((c: any) => c.status === ConnectionStatus.connected)
                .map((c: any) => ({
                    id: c.id,
                    name: c.remotePlayerName || "Anonymous",
                    isHost: false,
                    publicKey: c.remotePublicKey
                }))
        ];
        
        const mode = (boardSnapshot.value as any)?.context?.topologyMode || 'star';
        const topologyMap = (boardSnapshot.value as any)?.context?.topologyMap;
        const topologyObj = topologyMap ? Object.fromEntries(topologyMap.entries()) : {};

        currentBoardActor.value.send({ type: 'SYNC_PARTICIPANTS', participants, topologyMode: mode });
        
        broadcast({
            namespace: 'player',
            type: 'SYNC_PARTICIPANTS',
            payload: { participants, topologyMode: mode, topologyMap: topologyObj }
        });
    };

    const handlePlayerNamespace = (msg: any, connection: Connection) => {
        const actor = currentBoardActor.value;
        if (!actor) return;

        const { type, payload } = msg;

        if (type === 'SYNC_PARTICIPANTS') {
            actor.send({ 
                type: 'SYNC_PARTICIPANTS', 
                participants: payload.participants,
                topologyMode: payload.topologyMode,
                topologyMap: payload.topologyMap
            } as any);
        }
        
        if (type === 'CONNECTIVITY') {
            const { peerId, connections } = payload;
            actor.send({ type: 'UPDATE_TOPOLOGY', peerId: peerId, connections });
            if (isInitiator.value) {
                syncParticipants();
            }
        }

        // --- MEDIATED P2P SIGNALING HANDLERS ---
        
        if (type === 'REQUEST_P2P_OFFER') {
            const { targetPeerId, targetPlayerName, targetPublicKey } = payload;
            logger.sig(`[P2P] Received REQUEST_P2P_OFFER for target ${targetPeerId}`);
            
            (async () => {
                const p2pConnection = shallowReactive(new Connection((c) => {
                    updateConnection(c);
                }));
                
                const ident = await waitForIdentity();
                p2pConnection.localPlayerId = ident.id;
                p2pConnection.localPlayerName = ident.name;
                p2pConnection.localPublicKey = ident.publicKey;
                p2pConnection.remotePlayerName = targetPlayerName;
                p2pConnection.remotePublicKey = targetPublicKey;
                
                p2pConnection.openDataChannel();
                await p2pConnection.prepareOfferSignal(ident.name, ident.publicKey);
                
                updateConnection(p2pConnection);
                pendingConnections.value.set(targetPeerId, p2pConnection as any);
                
                const checkOffer = setInterval(() => {
                    if (p2pConnection.signal) {
                        clearInterval(checkOffer);
                        connection.send(JSON.stringify({
                            namespace: 'player',
                            type: 'PEER_P2P_OFFER',
                            payload: {
                                targetPeerId,
                                offer: p2pConnection.serializedSignal,
                                peerName: ident.name,
                                publicKey: ident.publicKey
                            }
                        }));
                    }
                }, 100);
            })();
        }

        if (type === 'PEER_P2P_OFFER') {
            if (isInitiator.value) {
                // Host forwards to target
                const { targetPeerId, offer, peerName, publicKey } = payload;
                const targetConn = connectedPeers.value.find(c => c.id === targetPeerId);
                if (targetConn) {
                    logger.sig(`[P2P] Forwarding Offer from ${connection.id} to ${targetPeerId}`);
                    targetConn.send(JSON.stringify({
                        namespace: 'player',
                        type: 'PEER_P2P_OFFER',
                        payload: {
                            sourcePeerId: connection.id,
                            offer,
                            peerName,
                            publicKey
                        }
                    }));
                }
            } else {
                // Guest receives forwarded offer
                const { sourcePeerId, offer, peerName, publicKey } = payload;
                logger.sig(`[P2P] Received forwarded Offer from ${sourcePeerId}`);
                
                (async () => {
                    const ident = await waitForIdentity();
                    const p2pConnection = shallowReactive(new Connection((c) => {
                        updateConnection(c);
                    }));
                    
                    p2pConnection.localPlayerId = ident.id;
                    p2pConnection.localPlayerName = ident.name;
                    p2pConnection.localPublicKey = ident.publicKey;
                    p2pConnection.remotePlayerName = peerName;
                    p2pConnection.remotePublicKey = publicKey;
                    
                    p2pConnection.setDataChannelCallback();
                    await p2pConnection.acceptOffer(offer, ident.name, ident.publicKey);
                    
                    updateConnection(p2pConnection);
                    pendingConnections.value.set(sourcePeerId, p2pConnection as any);
                    
                    const checkAnswer = setInterval(() => {
                        if (p2pConnection.signal) {
                            clearInterval(checkAnswer);
                            connection.send(JSON.stringify({
                                namespace: 'player',
                                type: 'PEER_P2P_ANSWER',
                                payload: {
                                    targetPeerId: sourcePeerId,
                                    answer: p2pConnection.serializedSignal,
                                    peerName: ident.name,
                                    publicKey: ident.publicKey
                                }
                            }));
                        }
                    }, 100);
                })();
            }
        }

        if (type === 'PEER_P2P_ANSWER') {
            if (isInitiator.value) {
                // Host forwards to target
                const { targetPeerId, answer, peerName, publicKey } = payload;
                const targetConn = connectedPeers.value.find(c => c.id === targetPeerId);
                if (targetConn) {
                    logger.sig(`[P2P] Forwarding Answer from ${connection.id} to ${targetPeerId}`);
                    targetConn.send(JSON.stringify({
                        namespace: 'player',
                        type: 'PEER_P2P_ANSWER',
                        payload: {
                            sourcePeerId: connection.id,
                            answer,
                            peerName,
                            publicKey
                        }
                    }));
                }
            } else {
                // Guest receives forwarded answer
                const { sourcePeerId, answer } = payload;
                logger.sig(`[P2P] Received forwarded Answer from ${sourcePeerId}`);
                const p2pConn = pendingConnections.value.get(sourcePeerId);
                if (p2pConn) {
                    (async () => {
                        await p2pConn.acceptAnswer(answer);
                        pendingConnections.value.delete(sourcePeerId);
                    })();
                }
            }
        }
    };

    const handleGameNamespace = (msg: any, connection: Connection) => {
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
    const registerConnectionHandlers = (connection: Connection) => {
       const actor = currentBoardActor.value;
        if (!actor || (connection as any)._hasListener) return;

        connection.addMessageListener(async (data: string) => {
            try {
                const msg = JSON.parse(data);
                if (msg.namespace === 'player') {
                    handlePlayerNamespace(msg, connection);
                    return;
                }

                if (msg.namespace === 'game') {
                    handleGameNamespace(msg, connection);
                    return;
                }
                
                // Legacy / Fallback handling for non-namespaced messages
                if (msg.type === 'PLAYER_IDENTITY') {
                    connection.remotePlayerName = msg.payload.name;
                    connection.remotePublicKey = msg.payload.publicKey;
                    updateConnection(connection);
                    if (isInitiator.value) syncParticipants();
                    return;
                }
           } catch { }
        });

        const onOpen = () => {
            if (isInitiator.value) syncParticipants();
        };

        if (connection.dataChannel?.readyState === 'open') {
            onOpen();
        } else if (connection.dataChannel) {
            const channel = connection.dataChannel;
            const originalOnOpen = channel.onopen;
            channel.onopen = (e) => {
                if (originalOnOpen) originalOnOpen.call(channel, e);
                onOpen();
            };
        }

        (connection as any)._hasListener = true;
    };

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
        registerConnectionHandlers(connection);
    };

    // Signaling Setup (moved from useLobby)
    const setupSignaling = async (gameIdArg: string, boardIdArg?: string, isManualMode?: boolean) => {
        const currentBoardId = boardIdArg || gameIdArg;
        
        // Host guard: don't connect if we are the host but haven't picked server mode yet
        if (isInitiator.value && hostSignalingMode.value !== 'server') return;

        logger.sig("setupSignaling called with gameId:", gameIdArg, "boardId:", boardIdArg, "resolved currentBoardId:", currentBoardId);
        if (!currentBoardId || currentBoardId === 'manual' || isManualMode || hostSignalingMode.value === 'manual' || route.query.mode === 'manual') return;

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
                    const client = new SignalingService(gameIdArg || "default", currentBoardId, ident.name, async (msg: any) => {
                        // Handle error messages
                        if (msg.type === 'error') {
                            logger.error("Signaling error:", msg.message || msg.code);

                            if ((msg.code === 'SESSION_NOT_FOUND' || msg.code === 'HOST_UNREACHABLE') && !isInitiator.value) {
                                if (isGameStarted.value) {
                                    logger.sig(`${msg.code} received after game started, ignoring.`);
                                    return;
                                }
                                logger.sig(`${msg.code}, retrying in 3s...`);
                                setTimeout(() => {
                                    hasRegistered.value = false; // Trigger the registration watcher again
                                }, 3000);
                                return;
                            }

                            toast.error(msg.message || "Signaling error occurred");

                            if (msg.code === 'DUPLICATE_IDENTITY') {
                                router.replace(`/games/${gameIdArg}`);
                            }
                        }

                        // Handle peerJoined: Guest has joined and wants to connect
                        if (msg.type === 'peerJoined') {
                            logger.sig("Peer joined:", msg.peerName, "publicKey:", msg.publicKey);

                            // Check if this is a known identity OR already in this session (e.g. refresh)
                            const isKnown = await isKnownIdentity(msg.publicKey!);
                            const isAlreadyInSession = playerInfos.value.some(p => p.publicKey === msg.publicKey);

                            if (isKnown || isAlreadyInSession) {
                                // Auto-approve known identity or returning peer
                                logger.sig(`Auto-approving ${isKnown ? 'known' : 'returning'} identity:`, msg.peerName);

                                // Auto-save identity if it's a returning peer but not yet permanently known
                                if (!isKnown && isAlreadyInSession && msg.publicKey) {
                                    db.addKnownIdentity({
                                        id: `identity-${Date.now()}-${msg.publicKey.substring(0, 8)}`,
                                        name: msg.peerName || "Guest",
                                        publicKey: msg.publicKey,
                                        addedAt: Date.now()
                                    }).catch(err => logger.error("Failed to auto-save returning peer identity:", err));
                                }

                                await autoApprovePeer({
                                    connectionId: msg.from!,
                                    peerName: msg.peerName || "Guest",
                                    publicKey: msg.publicKey!,
                                    encryptionPublicKey: msg.encryptionPublicKey,
                                    timestamp: Date.now()
                                });
                            } else {
                                // Add to pending join requests for manual host approval
                                pendingJoinRequests.value.push({
                                    connectionId: msg.from!,
                                    peerName: msg.peerName || "Guest",
                                    publicKey: msg.publicKey!,
                                    encryptionPublicKey: msg.encryptionPublicKey,
                                    timestamp: Date.now()
                                });
                            }
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
                            // Note: use gameIdArg here
                            const actor = getBoardActor(targetId, ident.name, false);
                            const connection = shallowReactive(new Connection((c) => {
                                actor.send({ type: 'UPDATE_CONNECTION', connection: c });
                            }));
                            connection.isHostConnection = true; // Guest to Host link

                            // Add message listener to route messages to board actor
                            connection.addMessageListener((data: string) => {
                                try {
                                    const message = JSON.parse(data);
                                    if (message.namespace === 'game') {
                                        handleGameNamespace(message, connection);
                                    } else if (message.namespace === 'player') {
                                        handlePlayerNamespace(message, connection);
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

                            if (msg.publicKey) connection.remotePublicKey = msg.publicKey;
                            if (msg.peerName) connection.remotePlayerName = msg.peerName;

                            connection.acceptOffer(msg.offer, ident.name, ident.publicKey).then(() => {
                                const checkAnswer = setInterval(() => {
                                    if (connection.signal && signalingClient.value) {
                                        clearInterval(checkAnswer);
                                        signalingClient.value.guestAnswer(msg.from!, ident.publicKey, connection.serializedSignal);
                                    }
                                }, 100);
                            }).catch(e => {
                                logger.error("Failed to accept offer:", e);
                            });
                        }

                        // Handle answer: Guest has sent WebRTC answer
                        if (msg.type === 'answer') {
                            logger.sig("Received answer from guest:", msg.from);
                            const conn = pendingConnections.value.get(msg.from!);
                            if (conn && msg.answer) {
                                if (msg.publicKey) conn.remotePublicKey = msg.publicKey;
                                if (msg.peerName) conn.remotePlayerName = msg.peerName;

                                // Convert plain object to Signal instance if needed
                                let answerSignal = msg.answer;
                                if (!(msg.answer instanceof Signal) && typeof msg.answer === 'object') {
                                    answerSignal = new Signal(
                                        (msg.answer as any).session,
                                        (msg.answer as any).playerName
                                    );
                                }

                                try {
                                    conn.acceptAnswer(answerSignal);
                                    pendingConnections.value.delete(msg.from!);
                                } catch (e) {
                                    logger.error("Failed to accept answer:", e);
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

    const isKnownIdentity = async (publicKey: string): Promise<boolean> => {
        const knownIdentities = await db.getAllKnownIdentities();
        return knownIdentities.some(f => f.publicKey === publicKey);
    };

    const autoApprovePeer = async (request: PendingJoinRequest) => {
        logger.sig("Approving peer:", request.peerName, "publicKey:", request.publicKey);

        const connection = shallowReactive(new Connection((c) => {
            updateConnection(c);
        }));

        connection.onClose = () => {
            currentBoardActor.value?.send({
                type: 'PEER_DISCONNECTED',
                connectionId: connection.id
            });
            pendingConnections.value.delete(request.connectionId);
        };

        const ident = await waitForIdentity();
        connection.remotePublicKey = request.publicKey;
        connection.openDataChannel();
        await connection.prepareOfferSignal(ident.name, ident.publicKey);

        pendingConnections.value.set(request.connectionId, connection);

        const checkOffer = setInterval(() => {
            if (connection.signal && signalingClient.value) {
                clearInterval(checkOffer);
                const wallet = SecureWallet.getInstance();
                wallet.getIdentity().then(ident => {
                    if (ident && signalingClient.value) {
                        signalingClient.value.hostOffer(
                            request.connectionId,
                            request.publicKey,
                            connection.signal,
                            ident.publicKey
                        );
                    }
                });
            }
        }, 100);
    };

    const onApprovePeer = async (request: PendingJoinRequest) => {
        pendingJoinRequests.value = pendingJoinRequests.value.filter(
            r => r.connectionId !== request.connectionId
        );
        await autoApprovePeer(request);
    };

    const onRejectPeer = (request: PendingJoinRequest) => {
        pendingJoinRequests.value = pendingJoinRequests.value.filter(
            r => r.connectionId !== request.connectionId
        );
    };

    const saveIdentityOnApprove = async (request: PendingJoinRequest) => {
        try {
            const newIdentity: KnownIdentity = {
                id: `identity-${Date.now()}`,
                name: request.peerName,
                publicKey: request.publicKey,
                addedAt: Date.now()
            };
            await db.addKnownIdentity(newIdentity);
            toast.success('Identity Saved');
        } catch (error) {
            toast.error('Failed to save identity');
        }
    };

    const startGame = () => {
        if (signalingClient.value && isInitiator.value) {
            signalingClient.value.deleteOffer();
        }
        currentBoardActor.value?.send({ type: 'START_GAME' });
    };

    const onFinishGame = () => {
        currentBoardActor.value?.send({ type: 'FINISH_GAME' });
        if (boardId.value) {
            SessionManager.updateStatus(boardId.value, 'finished');
        }
    };

    const onAddLedger = async (action: { type: string, payload: any }) => {
        if (!currentBoardActor.value) return;
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
        broadcast({
            namespace: 'game',
            type: 'SYNC_LEDGER',
            payload: updatedLedger
        });
    };

    const handlePlayAgain = () => {
        const newBoardId = uuidv4();
        broadcast({
            namespace: 'game',
            type: 'NEW_BOARD',
            payload: newBoardId
        });
        signalingClient.value?.deleteOffer();
        currentBoardActor.value?.send({ type: 'CLOSE_SESSION' });
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

    // --- MOBILE RESILIENCY ---
    const wakeLock = ref<any>(null);

    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLock.value = await (navigator as any).wakeLock.request('screen');
                logger.sig("Wake Lock acquired successfully");
                wakeLock.value.addEventListener('release', () => {
                    logger.sig("Wake Lock released");
                });
            } catch (err: any) {
                logger.error(`Wake Lock failed: ${err.name}, ${err.message}`);
            }
        }
    };

    const onAddManualConnection = async () => {
        logger.sig("Host generating manual WebRTC connection");
        const ident = await waitForIdentity();
        const connection = shallowReactive(new Connection((c: any) => {
            logger.sig(`Manual Host Connection status: ${c.status} for ${c.id}`);
            updateConnection(c);
        }));
        
        connection.localPlayerId = ident.id;
        connection.localPlayerName = ident.name || "Anonymous";
        connection.localPublicKey = ident.publicKey;
        
        connection.onClose = () => {
            currentBoardActor.value?.send({
                type: 'PEER_DISCONNECTED',
                connectionId: connection.id
            });
        };

        connection.openDataChannel();
        await connection.prepareOfferSignal(connection.localPlayerName, ident.publicKey);
        
        pendingConnections.value.set(connection.id, connection as any);
        pendingConnections.value = new Map(pendingConnections.value); // Trigger sync
        updateConnection(connection);
    };

    const onCreateGuestManualConnection = async (initialOffer?: string) => {
        if (manualGuestConnectionId.value) {
            const existing = pendingConnections.value.get(manualGuestConnectionId.value);
            if (existing && existing.status !== ConnectionStatus.closed) {
                logger.sig("Guest manual connection already exists, skipping duplicate initialization", manualGuestConnectionId.value);
                if (initialOffer && existing.status === ConnectionStatus.readyToAccept) {
                    logger.sig("Applying initialOffer to existing connection");
                    updateOffer(existing as any, initialOffer);
                }
                return;
            }
        }

        logger.sig("Guest creating placeholder for manual join, offering initialOffer?", !!initialOffer);
        hostSignalingMode.value = 'manual';
        const ident = await waitForIdentity();
        const connection = shallowReactive(new Connection((c: any) => {
            logger.sig(`Manual Guest Connection status: ${c.status} for ${c.id}`);
            updateConnection(c);
        }));
        
        connection.localPlayerId = ident.id;
        connection.localPlayerName = ident.name || "Anonymous";
        connection.localPublicKey = ident.publicKey;
        
        manualGuestConnectionId.value = connection.id;
        pendingConnections.value.set(connection.id, connection as any);
        pendingConnections.value = new Map(pendingConnections.value); // Trigger sync

        connection.onClose = () => {
            logger.sig(`Manual Guest Connection closed: ${connection.id}`);
            if (manualGuestConnectionId.value === connection.id) {
                manualGuestConnectionId.value = null;
            }
            currentBoardActor.value?.send({
                type: 'PEER_DISCONNECTED',
                connectionId: connection.id
            });
        };

        connection.status = ConnectionStatus.readyToAccept;
        connection.signal = new Signal({ type: 'offer', sdp: '' }, '');
        updateConnection(connection);

        if (initialOffer) {
            // Speed up automated intake
            setTimeout(() => {
                logger.sig("Auto-applying parsed query string offer");
                updateOffer(connection, initialOffer);
            }, 0);
        }
    };

    const updateOffer = async (connection: Connection, offer: string) => {
        try {
            const signal = await Signal.decompress(offer);
            const ident = await waitForIdentity();
            if (ident) {
                connection.setDataChannelCallback();
            await connection.acceptOffer(signal, ident.name, ident.publicKey);
                currentBoardActor.value?.send({ type: 'UPDATE_CONNECTION', connection });
            }
        } catch (e) {
            logger.error("Failed to accept offer:", e);
        }
    };

    const updateAnswer = async (connection: Connection, answer: string) => {
        try {
            const signal = await Signal.decompress(answer);
            connection.acceptAnswer(signal);
            currentBoardActor.value?.send({ type: 'UPDATE_CONNECTION', connection });
        } catch (e) {
            logger.error("Failed to update answer:", e);
        }
    };

    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
            logger.sig("App became visible, checking signaling status...");
            const hasActiveP2P = connectedPeers.value.length > 0;

            if (boardId.value === 'manual' || hostSignalingMode.value === 'manual' || route.query.mode === 'manual') return;

            if (signalingClient.value && !signalingClient.value.isConnected) {
                // Only re-register if we are not in an active game session with peers
                if (!isGameStarted.value || !hasActiveP2P) {
                    hasRegistered.value = false;
                    await setupSignaling(gameId.value, boardId.value);
                }
            } else if (signalingClient.value?.isConnected) {
                // Even if connected, re-register to ensure DynamoDB connectionId is fresh
                // But only if we are still in preparation/lobby phase
                if (!isGameStarted.value || !hasActiveP2P) {
                    hasRegistered.value = false;
                }
            }
        }
    };

    onMounted(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);
        if (isInsideBoard.value) requestWakeLock();
    });

    onUnmounted(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
        if (wakeLock.value) {
            wakeLock.value.release();
            wakeLock.value = null;
        }
    });

    // --- WATCHERS ---

    watch([isInitiator, playerInfos], () => {
        if (!isInitiator.value) return;

        const participants = playerInfos.value.map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            publicKey: p.publicKey
        }));

        broadcast({
            namespace: 'player',
            type: 'SYNC_PARTICIPANTS',
            payload: { participants }
        });
    }, { deep: true, immediate: true });

    watch([boardId, isInsideBoard, boardSnapshot], async () => {
        // Wait for machine to transition out of idle so we know for sure if we are initiator
        if (!boardSnapshot.value || boardSnapshot.value.matches('idle')) return;

        // Only auto-connect for guests joining via standard route. 
        // Hosts now initialize via `initializeServerSignaling()` explicitly.
        const shouldConnect = isInsideBoard.value && boardId.value && route.query.mode !== 'manual' && !isInitiator.value;
        if (shouldConnect) {
            await setupSignaling(gameId.value, boardId.value);
        }
    }, { immediate: true });

    watch([signalingClient, boardSnapshot, boardId], async () => {
        if (!signalingClient.value?.isConnected || !boardId.value || route.query.mode === 'manual' || hasRegistered.value) return;

        const wallet = SecureWallet.getInstance();
        const ident = await wallet.getIdentity();
        if (!ident) return;

        const state = boardSnapshot.value;
        if (!state) return;

        const isHosting = state.matches('hosting') || state.matches('preparation');
        const isJoining = state.matches('joining');

        if (isHosting && state.context.isInitiator && hostSignalingMode.value === 'server') {
            signalingClient.value.hostRegister(boardId.value, gameId.value, ident.name, ident.publicKey);
            hasRegistered.value = true;
        } else if (isJoining || !state.context.isInitiator) {
            signalingClient.value.guestJoin(boardId.value, ident.name, ident.publicKey, ident.publicKey);
            hasRegistered.value = true;
        }
    });

    watch(boardId, async (newId) => {
        if (newId && route.query.mode !== 'manual' && isInsideBoard.value) {
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

    // Track initiated P2P connections to avoid spamming requests
    const initiatedP2P = new Set<string>();

    watch(view, (newView) => {
        broadcast({
            namespace: 'game',
            type: 'SYNC_PLAYER_STATUS',
            payload: newView
        });
    });

    // Broadcast local connections to help build the global topology map
    watch(connectedPeers, (peers) => {
        const myId = identity.value?.id;
        if (!myId) return;

        const connections = peers
            .filter(c => c.status === ConnectionStatus.connected)
            .map(c => c.id);

        broadcast({
            namespace: 'player',
            type: 'CONNECTIVITY',
            payload: { peerId: myId, connections }
        });
    }, { deep: true });

    watch([connectedPeers, () => (boardSnapshot.value as any)?.context?.topologyMode], ([peers, mode]) => {
        (peers as any).forEach((c: any) => {
            if (!(c as any)._hasInitialSync) {
                // Direct send to the new peer only for bootstrap
                c.send(JSON.stringify({
                    namespace: 'game',
                    type: 'SYNC_PLAYER_STATUS',
                    payload: view.value
                }));
                if (isInitiator.value && boardId.value && boardId.value !== 'manual') {
                    c.send(JSON.stringify({
                        namespace: 'game',
                        type: 'NEW_BOARD',
                        payload: boardId.value
                    }));
                }
                (c as any)._hasInitialSync = true;
            }
        });

        // Host coordinates P2P Mesh
        if (isInitiator.value && mode === 'mesh') {
            const connectedGuests = (peers as Connection[]).filter(c => c.status === ConnectionStatus.connected);
            
            for (let i = 0; i < connectedGuests.length; i++) {
                for (let j = i + 1; j < connectedGuests.length; j++) {
                    const g1 = connectedGuests[i];
                    const g2 = connectedGuests[j];
                    
                    if (!g1.remotePublicKey || !g2.remotePublicKey) continue;

                    const pairId = [g1.remotePublicKey, g2.remotePublicKey].sort().join(':');
                    
                    if (!initiatedP2P.has(pairId)) {
                        logger.sig(`[P2P] Host requesting connection between ${g1.remotePlayerName} and ${g2.remotePlayerName}`);
                        
                        // Ask G1 to offer to G2
                        g1.send(JSON.stringify({
                            namespace: 'player',
                            type: 'REQUEST_P2P_OFFER',
                            payload: {
                                targetPeerId: g2.id,
                                targetPlayerName: g2.remotePlayerName,
                                targetPublicKey: g2.remotePublicKey
                            }
                        }));
                       
                        initiatedP2P.add(pairId);
                    }
                }
            }
        }
    }, { deep: true });

    const initializeServerSignaling = async () => {
        hostSignalingMode.value = 'server';
        await setupSignaling(gameId.value, boardId.value);
    };

    const initializeManualSignaling = () => {
        hostSignalingMode.value = 'manual';
        onAddManualConnection();
    };

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
        onApprovePeer,
        onRejectPeer,
        saveIdentityOnApprove,
        startGame,
        onFinishGame,
        onAddLedger,
        handlePlayAgain,
        onAcceptGuest,
        onRejectGuest,
        onCancelSignaling,
        onBackToGames,
        onBackToDiscovery,
        isKnownIdentity,
        onAddManualConnection,
        onCreateGuestManualConnection,
        updateOffer,
        updateAnswer,
        hostSignalingMode,
        initializeServerSignaling,
        initializeManualSignaling,
        topologyMode: computed(() => (boardSnapshot.value as any)?.context?.topologyMode || 'star'),
        setTopologyMode: (mode: 'star' | 'mesh') => currentBoardActor.value?.send({ type: 'SET_TOPOLOGY_MODE', mode })
    };
}
