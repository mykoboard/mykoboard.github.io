import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useMachine } from "@xstate/react";
import { lobbyMachine } from "../machines/lobbyMachine";
import { Connection, ConnectionStatus } from "../lib/webrtc";
import { logger } from "../lib/logger";
import { getGameById } from "../lib/GameRegistry";
import { Ledger } from "../lib/ledger";
import { createLobbyMessage, isLobbyMessage } from "../lib/network";
import { SecureWallet, PlayerIdentity } from "../lib/wallet";
import { SignalingService } from "../lib/signaling";
import { SessionManager } from "../lib/sessions";
import { GameSession } from "../lib/db";
import { PlayerInfo } from "../components/board/Players";

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
    onHostAGame: () => void;
    connectWithOffer: () => void;
    updateOffer: (connection: Connection, offer: string) => void;
    updateAnswer: (connection: Connection, answer: string) => void;
    startGame: () => void;
    onFinishGame: () => void;
    onAddLedger: (action: { type: string, payload: any }) => Promise<void>;
    onJoinFromList: (offer: any) => Promise<void>;
    handlePlayAgain: () => void;
    onDeleteSession: (id: string) => Promise<void>;
    onAcceptGuest: () => void;
    onRejectGuest: () => void;
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
                logger.state('EVENT', inspectionEvent.event.type, inspectionEvent.event);
            }
            if (inspectionEvent.type === '@xstate.snapshot' && inspectionEvent.snapshot.status === 'active') {
                const snapshotValue = (inspectionEvent.snapshot as any).value;
                logger.state('STATE', JSON.stringify(snapshotValue));
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

    const playerInfos = useMemo((): PlayerInfo[] => [
        {
            id: 'local',
            name: state.context.playerName,
            status: isGameStarted ? 'game' : 'lobby',
            isConnected: true,
            isLocal: true,
            isHost: isInitiator
        },
        ...connectionList.map(c => ({
            id: c.id,
            name: c.remotePlayerName || "Anonymous",
            status: state.context.playerStatuses.get(c.id) || 'lobby',
            isConnected: c.status === ConnectionStatus.connected,
            isLocal: false,
            isHost: false
        }))
    ], [state.context.playerName, isGameStarted, connectionList, state.context.playerStatuses, isInitiator]);

    const updateConnection = (connection: Connection) => {
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
                    if (msg.type === 'SYNC_LEDGER') {
                        const verifyLedger = async () => {
                            const entries = msg.payload as any[];
                            for (const entry of entries) {
                                if (entry.signature && entry.signerPublicKey) {
                                    const isValid = await SecureWallet.verify(entry.action, entry.signature, entry.signerPublicKey);
                                    if (!isValid) {
                                        console.error("Invalid signature in ledger entry", entry);
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
            console.log(`[LOBBY] Sending initial sync to ${connection.id}`);
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

    // Broadcast player status changes
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
                    console.log(`[LOBBY] Restoring session ${boardId}, status: ${session.status}`);
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
            if (msg.type === 'answer') {
                const connectionList = Array.from(state.context.connections.values());
                const pendingConn = connectionList.find(c => c.status === ConnectionStatus.started);

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
        const currentBoardId = boardId || gameId;

        if (shouldConnect && !signalingClient) {
            const initSignaling = async () => {
                setIsServerConnecting(true);
                try {
                    const wallet = SecureWallet.getInstance();
                    const identity = await wallet.getIdentity();
                    if (!identity) return;

                    const client = new SignalingService(
                        gameId || "default",
                        boardId || gameId || "",
                        identity.name,
                        (msg) => signalingHandlerRef.current?.(msg)
                    );

                    const challenge = `SIGN_IN:${identity.subscriptionToken}`;
                    const signature = await wallet.sign(challenge);
                    await client.connect(identity.subscriptionToken, identity.publicKey, signature);
                    connectionBoardIdRef.current = currentBoardId;
                    setSignalingClient(client);
                } catch (e) {
                    console.error("Signaling connection failed", e);
                } finally {
                    setIsServerConnecting(false);
                }
            };
            initSignaling();
        }

        if (!shouldConnect && signalingClient) {
            signalingClient.disconnect();
            setSignalingClient(null);
        }
    }, [signalingMode, state.value, gameId, boardId, isInitiator, signalingClient]);

    // Refresh offers when entering lobby
    useEffect(() => {
        if (signalingMode === 'server' && signalingClient && (state.matches('discovery') || state.matches('selection'))) {
            signalingClient.requestOffers();
        }
    }, [state.value, signalingMode, signalingClient]);

    const onHostAGame = () => {
        const newBoardId = uuidv4();
        navigate(`/games/${gameId}/${newBoardId}`, { replace: true });

        send({ type: 'HOST' });

        const connection = new Connection(updateConnection);
        connection.onClose = () => send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
        connection.openDataChannel();
        connection.prepareOfferSignal(state.context.playerName);

        if (signalingMode === 'server' && signalingClient) {
            const checkSignal = setInterval(() => {
                if (connection.signal) {
                    signalingClient.sendOffer(connection.signal, gameId, newBoardId, state.context.playerName);
                    clearInterval(checkSignal);
                }
            }, 500);
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
            console.error("Failed to accept offer", e);
        }
    };

    const updateAnswer = (connection: Connection, answer: string) => {
        if (!(connection instanceof Connection) || !answer) return;
        try {
            connection.acceptAnswer(answer);
            updateConnection(connection);
        } catch (e) {
            console.error("Failed to accept answer", e);
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

    const onJoinFromList = async (offer: any) => {
        send({ type: 'JOIN' });
        const conn = new Connection(updateConnection);
        conn.setDataChannelCallback();
        await conn.acceptOffer(offer.offer, state.context.playerName);

        const checkSignal = setInterval(() => {
            if (conn.signal) {
                signalingClient?.sendAnswer(offer.connectionId, conn.signal);
                clearInterval(checkSignal);

                const targetBoardId = offer.sessionBoardId || offer.boardId;
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
