import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useMachine } from "@xstate/react";
import { lobbyMachine } from "../machines/lobbyMachine";
import { Connection, ConnectionStatus } from "../lib/webrtc";
import { logger } from "../lib/logger";
import { getGameById } from "../lib/GameRegistry";
import { toast } from "sonner";
import { Ledger, createLobbyMessage, isLobbyMessage, PlayerInfo } from "@mykoboard/integration";
import { SecureWallet, PlayerIdentity } from "../lib/wallet";
import { SignalingService } from "../lib/signaling";
import { SessionManager } from "../lib/sessions";
import { GameSession } from "../lib/db";

interface GameSessionContextType {
    identity: PlayerIdentity | null;
    state: any;
    send: (event: any) => void;
    signalingMode: 'manual' | 'server' | null;
    setSignalingMode: (mode: 'manual' | 'server' | null) => void;
    isServerConnecting: boolean;
    signalingClient: SignalingService | null;
    availableOffers: any[];
    activeSessions: GameSession[];
    playerInfos: PlayerInfo[];
    connectedPeers: Connection[];
    pendingSignaling: Connection[];
    isInitiator: boolean;
    isGameStarted: boolean;
    onHostAGame: (playerCount?: number) => void;
    connectWithOffer: () => void;
    updateOffer: (connection: Connection, offer: string) => void;
    updateAnswer: (connection: Connection, answer: string) => void;
    startGame: () => void;
    onFinishGame: () => void;
    onAddLedger: (action: { type: string, payload: any }) => Promise<void>;
    onJoinFromList: (session: any, slot: any) => Promise<void>;
    handlePlayAgain: () => void;
    onDeleteSession: (id: string) => Promise<void>;
    onAcceptGuest: () => void;
    onRejectGuest: () => void;
    onCancelSignaling: (connection: Connection) => void;
    onBackToGames: () => void;
    onBackToDiscovery: () => void;
}

const GameSessionContext = createContext<GameSessionContextType | undefined>(undefined);

export const GameSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadIdentity = async () => {
            const wallet = SecureWallet.getInstance();
            const id = await wallet.getIdentity();
            setIdentity(id);
            setIsLoading(false);
        };
        loadIdentity();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-b-transparent" />
                    <p className="text-slate-500 font-medium animate-pulse">Initializing Session...</p>
                </div>
            </div>
        );
    }

    return (
        <GameSessionManager identity={identity}>
            {children}
        </GameSessionManager>
    );
};

const GameSessionManager: React.FC<{ identity: PlayerIdentity | null, children: React.ReactNode }> = ({ identity, children }) => {
    const { gameId, boardId } = useParams();
    const navigate = useNavigate();
    const game = useMemo(() => getGameById(gameId || ""), [gameId]);

    const [signalingMode, setSignalingMode] = useState<'manual' | 'server' | null>(null);
    const [isServerConnecting, setIsServerConnecting] = useState(false);
    const [signalingClient, setSignalingClient] = useState<SignalingService | null>(null);
    const [availableOffers, setAvailableOffers] = useState<any[]>([]);
    const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);

    const [state, send] = useMachine(lobbyMachine, {
        input: {
            playerName: identity?.name || "Anonymous"
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

    const { connections, isInitiator, isGameStarted } = state.context;
    const view = (state.matches('selection') || state.matches('discovery'))
        ? 'lobby' as const
        : 'game' as const;

    const connectionList = useMemo(() => Array.from(connections.values()), [connections]);
    const connectedPeers = useMemo(() => connectionList.filter(c => c.status === ConnectionStatus.connected), [connectionList]);
    const pendingSignaling = useMemo(() => connectionList.filter(c => c.status !== ConnectionStatus.connected && c.status !== ConnectionStatus.closed), [connectionList]);
    const isConnected = state.matches('room');

    const isLeavingRef = useRef(false);
    const prevBoardIdRef = useRef<string | undefined>(boardId);

    // Host Exit Detection & Signaling Cleanup
    useEffect(() => {
        const wasOnBoard = !!prevBoardIdRef.current;
        const isNowOffBoard = !boardId;

        if (wasOnBoard && isNowOffBoard && isInitiator) {
            logger.sig(`Host detected leaving board ${prevBoardIdRef.current}. Purging offers.`);
            if (signalingClient?.isConnected) {
                signalingClient.deleteOffer();
            }
            // Also reset machine so we don't carry over hosting state to the lobby
            send({ type: 'CLOSE_SESSION' });
        }

        prevBoardIdRef.current = boardId;
    }, [boardId, isInitiator, signalingClient, send]);

    // Browser-level cleanup (Reload/Close)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isInitiator && signalingClient && boardId) {
                // Attempt to purge offer before the socket is killed by the browser
                signalingClient.deleteOffer();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isInitiator, signalingClient, boardId]);

    const playerInfos = useMemo((): PlayerInfo[] => {
        const currentSession = activeSessions.find(s => s.boardId === boardId);
        const storedParticipants = currentSession?.participants || [];
        const externalParticipants = state.context.externalParticipants as { id: string, name: string, isHost: boolean }[];

        const localParticipant = storedParticipants.find(p => p.isYou);

        const localPlayer: PlayerInfo = {
            id: identity?.id || 'local',
            name: state.context.playerName,
            status: isGameStarted ? 'game' : 'lobby',
            isConnected: true,
            isLocal: true,
            isHost: localParticipant ? localParticipant.isHost : isInitiator
        };

        const infos: PlayerInfo[] = [];
        const processedIds = new Set<string>();

        // 1. DETERMINE THE HOST (Always index 0)
        if (isInitiator) {
            infos.push(localPlayer);
            processedIds.add(localPlayer.id);
        } else if (externalParticipants.length > 0) {
            const hostData = externalParticipants.find(p => p.isHost);
            if (hostData) {
                const hostConnection = connectionList.find(c => c.status === ConnectionStatus.connected);
                infos.push({
                    id: hostData.id,
                    name: hostData.name,
                    status: (hostConnection ? state.context.playerStatuses.get(hostConnection.id) : null) || (isGameStarted ? 'game' : 'lobby'),
                    isConnected: !!hostConnection,
                    isLocal: false,
                    isHost: true
                });
                processedIds.add(hostData.id);
            }
        }

        // 2. ADD OTHER PARTICIPANTS
        if (isInitiator) {
            // Host adds connections in order
            connectionList.forEach(c => {
                if (!processedIds.has(c.id)) {
                    const storedPeer = storedParticipants.find(p => p.id === c.id);
                    infos.push({
                        id: c.id,
                        name: c.remotePlayerName || storedPeer?.name || "Anonymous",
                        status: state.context.playerStatuses.get(c.id) || 'lobby',
                        isConnected: c.status === ConnectionStatus.connected,
                        isLocal: false,
                        isHost: false
                    });
                    processedIds.add(c.id);
                }
            });
        } else if (externalParticipants.length > 0) {
            // Guest uses Host's broadcasted list for order
            externalParticipants.forEach(p => {
                const isHostData = p.isHost || p.id === 'local';
                if (isHostData) return; // Already handled host

                if (p.name === localPlayer.name && !processedIds.has(p.id)) {
                    // This is ME (the guest) - adapt to the ID the host gave us
                    infos.push({ ...localPlayer, id: p.id });
                    processedIds.add(p.id);
                } else {
                    // This is another GUEST
                    infos.push({
                        id: p.id,
                        name: p.name,
                        status: isGameStarted ? 'game' : 'lobby',
                        isConnected: true, // Synced guests are effectively connected via the host
                        isLocal: false,
                        isHost: false
                    });
                    processedIds.add(p.id);
                }
            });
        }

        // Add disconnected historical participants
        storedParticipants.forEach(p => {
            if (!p.isYou && !processedIds.has(p.id)) {
                infos.push({
                    id: p.id,
                    name: p.name,
                    status: (currentSession?.status === 'finished' || isGameStarted) ? 'game' : 'lobby',
                    isConnected: false,
                    isLocal: false,
                    isHost: p.isHost
                });
            }
        });

        return infos;
    }, [state.context.playerName, isGameStarted, connectionList, state.context.playerStatuses, isInitiator, activeSessions, boardId, state.context.externalParticipants]);

    const signalingClientRef = useRef<SignalingService | null>(null);
    const isInitiatorRef = useRef(false);

    useEffect(() => {
        signalingClientRef.current = signalingClient;
    }, [signalingClient]);

    useEffect(() => {
        isInitiatorRef.current = isInitiator;
    }, [isInitiator]);

    const lastStatusRef = useRef<Map<string, string>>(new Map());
    const lastSignalRef = useRef<Map<string, string>>(new Map());

    const updateConnection = (connection: Connection) => {
        // Prevent redundant machine events if nothing meaningful changed
        // This significantly reduces log noise from ICE candidate gathering
        const existingStatus = lastStatusRef.current.get(connection.id);
        const existingSignal = connection.signal?.toString() || "";
        const prevSignal = lastSignalRef.current.get(connection.id);

        if (existingStatus === connection.status && prevSignal === existingSignal) {
            return;
        }

        lastStatusRef.current.set(connection.id, connection.status);
        lastSignalRef.current.set(connection.id, existingSignal);

        send({ type: 'UPDATE_CONNECTION', connection });

        if (!(connection as any)._hasListener) {
            const handleLobbyMessage = (data: string) => {
                try {
                    const msg = JSON.parse(data);
                    if (!isLobbyMessage(msg)) return;

                    if (msg.type === 'START_GAME') send({ type: 'START_GAME' });
                    if (msg.type === 'GAME_STARTED') send({ type: 'GAME_STARTED' });
                    if (msg.type === 'GAME_RESET') send({ type: 'GAME_RESET' });
                    if (msg.type === 'NEW_BOARD') navigate(`/games/${gameId}/${msg.payload}`);
                    if (msg.type === 'SYNC_PLAYER_STATUS') {
                        send({ type: 'SET_PLAYER_STATUS', playerId: connection.id, status: msg.payload });
                    }
                    if (msg.type === 'SYNC_PARTICIPANTS') {
                        send({ type: 'SYNC_PARTICIPANTS', participants: msg.payload });
                    }
                    if (msg.type === 'SYNC_LEDGER') {
                        const verifyLedger = async () => {
                            const entries = msg.payload as any[];
                            for (const entry of entries) {
                                if (entry.signature && entry.signerPublicKey) {
                                    const isValid = await SecureWallet.verify(entry.action, entry.signature, entry.signerPublicKey);
                                    if (!isValid) {
                                        logger.error("Invalid signature in ledger entry", entry);
                                        return;
                                    }
                                }
                            }
                            send({ type: 'SYNC_LEDGER', ledger: msg.payload });
                        };
                        verifyLedger();
                    }
                } catch (e) { }
            };

            connection.addMessageListener(handleLobbyMessage);
            (connection as any)._hasListener = true;
        }

        if (connection.status === ConnectionStatus.connected && !(connection as any)._hasInitialSync) {
            logger.lobby('STATE', `Sending initial sync to ${connection.id}`);
            connection.send(JSON.stringify(createLobbyMessage('SYNC_PLAYER_STATUS', view)));
            // If we are host and already have a session, tell the newcomer which board they should be on
            // This is critical for manual joiners who start at /manual route
            if (isInitiator && boardId && boardId !== 'manual') {
                connection.send(JSON.stringify(createLobbyMessage('NEW_BOARD', boardId)));
            }
            (connection as any)._hasInitialSync = true;
        }
        send({ type: 'UPDATE_CONNECTION', connection });
    };

    // Broadcast participants (Host Only)
    useEffect(() => {
        if (isInitiator && connectedPeers.length > 0) {
            const participants = playerInfos.map(p => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost
            }));

            connectedPeers.forEach(c => {
                if (c.status === ConnectionStatus.connected) {
                    c.send(JSON.stringify(createLobbyMessage('SYNC_PARTICIPANTS', participants)));
                }
            });
        }
    }, [isInitiator, connectedPeers, playerInfos]);

    const lastSentSlotsRef = useRef<string>("");
    const broadcastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Broadcast combined offer (Host Only)
    useEffect(() => {
        const effectiveBoardId = state.context.boardId || boardId;
        if (!isInitiator || signalingMode !== 'server' || !signalingClient || !effectiveBoardId) {
            return;
        }

        // Clear existing timeout
        if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);

        broadcastTimeoutRef.current = setTimeout(() => {
            const currentSlots: any[] = [];
            const processedConnIds = new Set<string>();

            // 1. Add connected players
            connectedPeers.forEach(c => {
                if (c.id === 'local') return;
                currentSlots.push({
                    connectionId: c.id,
                    offer: c.signal,
                    status: 'taken',
                    peerName: c.remotePlayerName
                });
                processedConnIds.add(c.id);
            });

            // 2. Add pending connections (waiting for guests)
            pendingSignaling.forEach(c => {
                if (!processedConnIds.has(c.id) && c.signal) {
                    currentSlots.push({
                        connectionId: c.id,
                        offer: c.signal,
                        status: 'open'
                    });
                    processedConnIds.add(c.id);
                }
            });

            if (currentSlots.length > 0) {
                const slotsString = JSON.stringify(currentSlots);
                // We also include boardId in the key to ensure we broadcast when switching boards
                const cacheKey = `${effectiveBoardId}:${slotsString}`;
                if (cacheKey !== lastSentSlotsRef.current) {
                    logger.sig(`Broadcasting update with ${currentSlots.length} slots for session ${effectiveBoardId}`);
                    const success = signalingClient.sendOffer(currentSlots, gameId!, effectiveBoardId, state.context.playerName);
                    if (success) {
                        lastSentSlotsRef.current = cacheKey;
                    } else {
                        logger.sig(`Broadcast failed (likely socket not open). Will retry.`);
                    }
                }
            } else {
                logger.sig(`Broadcast: No active signal slots available for session ${effectiveBoardId} yet.`);
            }
        }, 500);

        return () => {
            if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
        };
    }, [isInitiator, signalingMode, signalingClient, boardId, state.context.boardId, connectedPeers, pendingSignaling, state.context.playerName, gameId]);

    useEffect(() => {
        if (isConnected || isInitiator) {
            const currentStatus = isGameStarted ? 'game' : 'lobby';
            connectedPeers.forEach(c => {
                if (c.status === ConnectionStatus.connected) {
                    c.send(JSON.stringify(createLobbyMessage('SYNC_PLAYER_STATUS', currentStatus)));
                }
            });
        }
    }, [isGameStarted, isConnected, isInitiator, connectedPeers]);

    useEffect(() => {
        const loadSessions = async () => {
            const sessions = await SessionManager.getSessions();
            setActiveSessions(sessions);
        };
        loadSessions();
    }, [state.value]);

    useEffect(() => {
        if (isLeavingRef.current) {
            // Once we are safely in the lobby (no boardId), reset the leaving flag
            if (!boardId) {
                isLeavingRef.current = false;
            }
            return;
        }

        if (boardId && boardId !== 'manual' && (state.matches('selection') || state.matches('discovery'))) {
            const restoreSession = async () => {
                const session = await SessionManager.getSession(boardId);
                if (session && session.ledger.length > 0 && state.context.ledger.length === 0) {
                    logger.lobby('STATE', `Restoring session ${boardId}, status: ${session.status}`);
                    send({ type: 'LOAD_LEDGER', ledger: session.ledger });
                    send({ type: 'RESUME' });
                    if (session.status === 'finished') {
                        // Use a small delay to ensure the machine has transitioned to 'room' before finishing
                        setTimeout(() => send({ type: 'FINISH_GAME' }), 10);
                    }
                }
            };
            restoreSession();
        }
    }, [boardId]); // Only trigger when the board ID changes

    useEffect(() => {
        if (state.matches('room') && gameId && boardId && boardId !== 'manual') {
            SessionManager.saveSession({
                gameId,
                boardId,
                playerName: state.context.playerName,
                gameName: game?.name || "Unknown Game",
                lastPlayed: Date.now(),
                status: state.matches('room.finished') ? 'finished' : 'active',
                ledger: state.context.ledger,
                participants: playerInfos.map(p => ({
                    id: p.id,
                    name: p.name,
                    isYou: p.isLocal,
                    isHost: p.isHost
                }))
            });
        }
    }, [state.value, gameId, boardId, game?.name, state.context.playerName, state.context.ledger, playerInfos]);

    useEffect(() => {
        if (state.matches('room') && boardId && boardId !== 'manual' && state.context.ledger.length > 0) {
            SessionManager.updateLedger(boardId, state.context.ledger);
        }
    }, [state.context.ledger, boardId, state.matches('room')]);

    const signalingHandlerRef = useRef<((msg: any) => void) | null>(null);
    const connectionBoardIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        signalingHandlerRef.current = (msg: any) => {
            if (msg.type === 'offerList') {
                setAvailableOffers(msg.offers || []);
            }
            if (msg.type === 'error') {
                logger.error("Signaling error:", msg.message);
                toast.error(msg.message || "Signaling error occurred", {
                    description: msg.code === 'DUPLICATE_IDENTITY' ? "You are already in this game session." : undefined
                });
            }
            if (msg.type === 'answer') {
                const connectionList = Array.from(state.context.connections.values()) as Connection[];
                // Targeted connection (multi-slot) or first available
                const pendingConn = msg.to
                    ? connectionList.find(c => c.id === msg.to)
                    : connectionList.find(c => c.status === ConnectionStatus.started);

                if (pendingConn) {
                    if (signalingMode === 'server') {
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
        };
    }, [state.context.connections, signalingMode]);

    useEffect(() => {
        const isActiveLobby = state.matches('hosting') || state.matches('discovery') || state.matches('joining') || state.matches('approving');
        const isHostInRoom = state.matches('room') && isInitiator;
        const shouldConnect = signalingMode === 'server' && (isActiveLobby || isHostInRoom);
        const currentBoardId = state.context.boardId || boardId || gameId || "";

        if (shouldConnect) {
            const boardIdChanged = connectionBoardIdRef.current !== currentBoardId;

            if (boardIdChanged && signalingClient?.isConnected) {
                // If we already have a connection, just update the board ID statefully
                // This prevents losing the WebSocket connectionId during host initiation
                signalingClient.updateBoardId(currentBoardId);
                connectionBoardIdRef.current = currentBoardId;
            }

            // Re-init ONLY if client doesn't exist or is not connected
            const needsConnection = (!signalingClient || !signalingClient.isConnected) && !isServerConnecting;

            if (needsConnection) {
                const initSignaling = async () => {
                    if (isServerConnecting || signalingClient?.isConnected) return;
                    setIsServerConnecting(true);
                    try {
                        const wallet = SecureWallet.getInstance();
                        const identity = await wallet.getIdentity();
                        if (!identity) {
                            logger.error("No identity available for signaling");
                            return;
                        }

                        logger.sig(`Initializing signaling for session: ${currentBoardId}`);
                        const client = new SignalingService(
                            gameId || "default",
                            currentBoardId,
                            identity.name,
                            (msg) => signalingHandlerRef.current?.(msg)
                        );

                        const challenge = `SIGN_IN:${identity.subscriptionToken}`;
                        const signature = await wallet.sign(challenge);
                        await client.connect(identity.subscriptionToken, identity.publicKey, signature);

                        connectionBoardIdRef.current = currentBoardId;
                        setSignalingClient(client);
                        logger.sig(`Signaling connected for session: ${currentBoardId}`);
                    } catch (e) {
                        logger.error("Signaling connection failed", e);
                    } finally {
                        setIsServerConnecting(false);
                    }
                };
                initSignaling();
            }
        }

        if (!shouldConnect && signalingClient) {
            // If we are disconnecting because we left the board/game and we were the host,
            // ensure we delete the offer before closing the socket.
            const wasHost = isInitiator;
            logger.sig(`Cleanup: Disconnecting signaling client. Was host: ${wasHost}`);
            signalingClient.disconnect(wasHost);
            setSignalingClient(null);
        }

        return () => {
            // This runs on unmount or when dependencies change (e.g., boardId changes)
            // We NO LONGER null out the ref here because we handle it in the next effect run
            // or we let the shouldConnect logic handle it.
            // But if we are COMPLETELY unmounting, we should cleanup.
        };
    }, [signalingMode, state.value, state.context.boardId, gameId, boardId, isInitiator, signalingClient]);

    // Add a dedicated cleanup effect for unmounting the Provider
    useEffect(() => {
        return () => {
            if (signalingClientRef.current) {
                const wasHost = isInitiatorRef.current;
                logger.sig(`Provider Unmount: Cleaning up signaling. Was host: ${wasHost}`);
                signalingClientRef.current.disconnect(wasHost);
            }
        };
    }, []);

    // Refresh offers when entering lobby
    useEffect(() => {
        if (signalingMode === 'server' && signalingClient && (state.matches('discovery') || state.matches('selection'))) {
            signalingClient.requestOffers();
        }
    }, [state.value, signalingMode, signalingClient]);

    const onHostAGame = (playerCount: number = 2) => {
        const isNewSession = state.matches('selection') || state.matches('discovery');

        if (isNewSession) {
            const newBoardId = uuidv4();
            navigate(`/games/${gameId}/${newBoardId}`, { replace: true });
            send({ type: 'HOST', maxPlayers: playerCount, boardId: newBoardId });
        }

        // Capacity check
        const currentCount = playerInfos.length;
        const pendingCount = pendingSignaling.length;
        if (currentCount + pendingCount >= state.context.maxPlayers) {
            logger.info("Lobby capacity reached");
            return;
        }

        const createConnection = () => {
            const connection = new Connection(updateConnection);
            connection.onClose = () => send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
            connection.openDataChannel();
            connection.prepareOfferSignal(state.context.playerName);
        };

        if (isNewSession) {
            const numOffers = playerCount - 1;
            for (let i = 0; i < numOffers; i++) {
                createConnection();
            }
        } else {
            // Incremental connect
            createConnection();
        }
    };

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
            await connection.acceptOffer(offer, state.context.playerName);
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

    const startGame = () => {
        if (signalingMode === 'server' && signalingClient && isInitiator) {
            signalingClient.deleteOffer();
        }
        send({ type: 'START_GAME' });
    };


    const onFinishGame = () => {
        send({ type: 'FINISH_GAME' });
        if (boardId) {
            SessionManager.updateStatus(boardId, 'finished');
        }
    };

    const onAddLedger = async (action: { type: string, payload: any }) => {
        if (!isInitiator) return;
        const wallet = SecureWallet.getInstance();
        const identity = await wallet.getIdentity();
        if (!identity) return;

        const signature = await wallet.sign(action);
        const ledger = Ledger.fromEntries(state.context.ledger);
        const entry = await ledger.addEntry({ ...action });
        entry.signature = signature;
        entry.signerPublicKey = identity.publicKey;

        const updatedLedger = ledger.getEntries();
        send({ type: 'SYNC_LEDGER', ledger: updatedLedger });
        connectedPeers.forEach(c => {
            c.send(JSON.stringify(createLobbyMessage('SYNC_LEDGER', updatedLedger)));
        });
    };

    const onJoinFromList = async (session: any, slot: any) => {
        send({ type: 'JOIN' });
        const conn = new Connection(updateConnection);
        conn.setDataChannelCallback();
        await conn.acceptOffer(slot.offer, state.context.playerName);

        const checkSignal = setInterval(() => {
            if (conn.signal) {
                const targetBoardId = session.sessionBoardId || session.boardId || boardId;

                // Sync signaling client board ID before sending answer
                if (targetBoardId) {
                    signalingClient?.updateBoardId(targetBoardId);
                }

                signalingClient?.sendAnswer(session.connectionId, slot.connectionId, conn.signal, targetBoardId);
                clearInterval(checkSignal);

                if (!boardId && targetBoardId) {
                    navigate(`/games/${gameId}/${targetBoardId}`, { replace: true });
                }
            }
        }, 500);
    };

    const handlePlayAgain = () => {
        const newBoardId = uuidv4();
        connectedPeers.forEach(c => {
            if (c.status === ConnectionStatus.connected) {
                c.send(JSON.stringify(createLobbyMessage('NEW_BOARD', newBoardId)));
            }
        });

        signalingClient?.deleteOffer();
        send({ type: 'CLOSE_SESSION' });
        send({ type: 'HOST' });
        navigate(`/games/${gameId}/${newBoardId}`);
    };

    const onDeleteSession = async (id: string) => {
        await SessionManager.removeSession(id);
        const sessions = await SessionManager.getSessions();
        setActiveSessions(sessions);
    };

    const onAcceptGuest = () => {
        const guest = state.context.pendingGuest;
        send({ type: 'ACCEPT_GUEST' });
        if (guest) {
            updateConnection(guest.connection);
        }
    };

    const onRejectGuest = () => {
        send({ type: 'REJECT_GUEST' });
    };

    const onCancelSignaling = (connection: Connection) => {
        connection.close();
        send({ type: 'CANCEL_SIGNALING', connectionId: connection.id });
    };

    const onBackToGames = () => {
        signalingClient?.deleteOffer();
        send({ type: 'CLOSE_SESSION' });
        navigate(`/games/${gameId}`);
    };


    const onBackToDiscovery = () => {
        isLeavingRef.current = true;
        send({ type: 'BACK_TO_LOBBY' });
        if (signalingMode === 'server') {
            signalingClient?.requestOffers();
        }
        navigate(`/games/${gameId}`);
    };

    const value = {
        identity,
        state,
        send,
        signalingMode,
        setSignalingMode,
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
        connectWithOffer,
        updateOffer,
        updateAnswer,
        startGame,
        onFinishGame,
        onAddLedger,
        onJoinFromList,
        handlePlayAgain,
        onDeleteSession,
        onAcceptGuest,
        onRejectGuest,
        onCancelSignaling,
        onBackToGames,
        onBackToDiscovery
    };

    return (
        <GameSessionContext.Provider value={value}>
            {children}
        </GameSessionContext.Provider>
    );
};

export const useGameSession = () => {
    const context = useContext(GameSessionContext);
    if (context === undefined) {
        throw new Error("useGameSession must be used within a GameSessionProvider");
    }
    return context;
};
