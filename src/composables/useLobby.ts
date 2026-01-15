import { ref, computed, watch, provide, inject } from 'vue';
import { useRouter } from 'vue-router';
import { createActor } from 'xstate';
import { lobbyMachine } from "../machines/lobbyMachine";
import { SignalingService } from "../lib/signaling";
import { SessionManager } from "../lib/sessions";
import { GameSession } from "../lib/db";
import { SecureWallet, PlayerIdentity } from "../lib/wallet";
import { useSelector } from "@xstate/vue";
import { logger } from "../lib/logger";
import { toast } from "vue-sonner";
import { Connection } from "../lib/webrtc";
import { createLobbyMessage, isLobbyMessage } from "@mykoboard/integration";
import { boardMachine } from "../machines/boardMachine";
import { ConnectionStatus } from "../lib/webrtc";

// Global-ish state for the session to mimic the Provider behavior
const identity = ref<PlayerIdentity | null>(null);
const isLoading = ref(true);
const signalingClient = ref<SignalingService | null>(null);
const availableOffers = ref<any[]>([]);
const activeSessions = ref<GameSession[]>([]);
const isServerConnecting = ref(false);
const connectionBoardId = ref<string | undefined>();

// Persistent Lobby Actor
const lobbyActor = createActor(lobbyMachine, {
    input: { playerName: "Anonymous" }
}).start();

// Persistent Board Actor Management
const boardActors = new Map<string, any>();

function getBoardActor(boardId: string, playerName: string, isInitiator: boolean = false, maxPlayers: number = 2) {
    if (!boardActors.has(boardId)) {
        logger.lobby('STATE', `Creating new board actor for ${boardId}`);
        const actor = createActor(boardMachine, {
            input: { playerName, boardId, isInitiator, maxPlayers }
        });
        actor.start();
        boardActors.set(boardId, actor);
    }
    return boardActors.get(boardId)!;
}

export function useLobby() {
    const router = useRouter();
    const lobbySnapshot = useSelector(lobbyActor, (s) => s as any);
    const lobbySend = (event: any) => lobbyActor.send(event);

    const signalingMode = computed(() => lobbySnapshot.value?.context?.signalingMode);

    const setSignalingMode = (mode: 'manual' | 'server' | null) => {
        lobbySend({ type: 'SELECT_MODE', mode });
    };

    // Load identity once
    const initIdentity = async () => {
        if (identity.value) return;
        const wallet = SecureWallet.getInstance();
        identity.value = await wallet.getIdentity();
        isLoading.value = false;

        // Update lobby machine with player name if available
        if (identity.value?.name) {
            // In XState v5 we can't easily update input after start, 
            // but we can have an event or just rely on the name from context when needed.
        }
    };
    initIdentity();

    const onDeleteSession = async (id: string) => {
        await SessionManager.removeSession(id);
        activeSessions.value = await SessionManager.getSessions();
        // Board actor cleanup should happen in useGameSession if it's currently managing it
    };


    // Initial load of sessions
    const loadSessions = async () => {
        activeSessions.value = await SessionManager.getSessions();
    };
    loadSessions();

    const onJoinFromList = async (gameId: string, session: any, slot: any) => {
        const targetBoardId = session.sessionBoardId || session.boardId;
        if (!targetBoardId) return;

        const actor = getBoardActor(targetBoardId, identity.value?.name || "Anonymous", false);
        actor.send({ type: 'JOIN', boardId: targetBoardId });

        const conn = new Connection((c) => {
            actor.send({ type: 'UPDATE_CONNECTION', connection: c });

            // Re-setup message listener since this is a new connection callback scope
            if (!(c as any)._hasListener) {
                c.addMessageListener((data: string) => {
                    try {
                        const msg = JSON.parse(data);
                        if (!isLobbyMessage(msg)) return;
                        if (msg.type === 'START_GAME') actor.send({ type: 'START_GAME' });
                        if (msg.type === 'GAME_STARTED') actor.send({ type: 'GAME_STARTED' });
                        if (msg.type === 'GAME_RESET') actor.send({ type: 'GAME_RESET' });
                        // Navigation handled in BoardView or global watcher? 
                        // For now we rely on the component using useGameSession to handle navigation if boardId changes
                        if (msg.type === 'NEW_BOARD') router.replace(`/games/${gameId}/${msg.payload}`);
                        if (msg.type === 'SYNC_PLAYER_STATUS') actor.send({ type: 'SET_PLAYER_STATUS', playerId: c.id, status: msg.payload });
                        if (msg.type === 'SYNC_PARTICIPANTS') actor.send({ type: 'SYNC_PARTICIPANTS', participants: msg.payload });
                        if (msg.type === 'SYNC_LEDGER') actor.send({ type: 'SYNC_LEDGER', ledger: msg.payload });
                    } catch { }
                });
                (c as any)._hasListener = true;
            }
        });

        conn.setDataChannelCallback();
        await conn.acceptOffer(slot.offer, identity.value?.name || "Anonymous");

        const checkSignal = setInterval(() => {
            if (conn.signal) {
                if (targetBoardId) signalingClient.value?.updateBoardId(targetBoardId);
                signalingClient.value?.sendAnswer(session.connectionId, slot.connectionId, conn.signal, targetBoardId);
                clearInterval(checkSignal);
                // Navigation to board
                router.replace(`/games/${gameId}/${targetBoardId}`);
            }
        }, 500);
    };

    // Signaling Lifecycle (Global)
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
                        if (msg.type === 'offerList') availableOffers.value = msg.offers || [];
                        if (msg.type === 'error') {
                            logger.error("Signaling error:", msg.message);
                            toast.error(msg.message || "Signaling error occurred");
                        }
                        if (msg.type === 'answer') {
                            logger.sig("Received answer message from Guest. msg.boardId:", msg.boardId, "connectionBoardId:", connectionBoardId.value);
                            const targetId = msg.boardId || connectionBoardId.value;

                            if (!targetId || targetId === gameId) {
                                logger.error("No valid target board UUID for answer message. Falling back to connectionBoardId:", connectionBoardId.value);
                                // If msg.boardId is missing, we MUST have a valid connectionBoardId that isn't the gameId
                                if (connectionBoardId.value === gameId) {
                                    logger.error("Abort routing: targetId matches gameId exactly. This would create a zombie actor.");
                                    return;
                                }
                            }

                            logger.sig("Routing answer to actor:", targetId);
                            const actor = getBoardActor(targetId!, ident.name, false);
                            const ctx = (actor.getSnapshot() as any).context;

                            const connectionsIter = Array.from(ctx.connections.values()) as any[];
                            const pendingConn = msg.to
                                ? connectionsIter.find((c: any) => c.id === msg.to)
                                : connectionsIter.find((c: any) => c.status === ConnectionStatus.started);

                            if (pendingConn) {
                                actor.send({
                                    type: 'REQUEST_JOIN',
                                    connectionId: msg.from,
                                    peerName: msg.peerName || "Anonymous Guest",
                                    answer: msg.answer,
                                    connection: pendingConn
                                });
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
    };

    const requestOffers = () => {
        if (signalingMode.value === 'server' && signalingClient.value) {
            signalingClient.value.requestOffers();
        }
    };

    const onBackToDiscovery = (gameId: string) => {
        router.push(`/games/${gameId}`);
    };

    const onBackToGames = onBackToDiscovery; // Alias for consistency if needed

    return {
        identity,
        isLoading,
        lobbySnapshot,
        lobbySend,
        signalingMode,
        setSignalingMode,
        signalingClient,
        availableOffers,
        activeSessions,
        onDeleteSession,
        isServerConnecting,
        onJoinFromList,
        setupSignaling,
        requestOffers,
        onBackToDiscovery,
        onBackToGames
    };
}

// Named exports for global refs that useGameSession needs
export { identity, isLoading, signalingClient, availableOffers, activeSessions, lobbyActor, boardActors, getBoardActor };
