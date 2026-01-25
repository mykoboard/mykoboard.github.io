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
                        // Handle error messages
                        if (msg.type === 'error') {
                            logger.error("Signaling error:", msg.message || msg.code);
                            toast.error(msg.message || "Signaling error occurred");

                            // Redirect back to lobby if join was rejected due to duplicate identity
                            if (msg.code === 'DUPLICATE_IDENTITY') {
                                router.replace(`/games/${gameId}`);
                            }
                        }

                        // Handle peerJoined: Guest has joined and wants to connect
                        if (msg.type === 'peerJoined') {
                            logger.sig("Peer joined:", msg.peerName, "publicKey:", msg.publicKey);
                            const actor = getBoardActor(currentBoardId, ident.name, false);
                            actor.send({
                                type: 'PEER_JOIN_REQUEST',
                                connectionId: msg.from,
                                peerName: msg.peerName,
                                publicKey: msg.publicKey,
                                encryptionPublicKey: msg.encryptionPublicKey
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

                            const actor = getBoardActor(targetId, ident.name, false);
                            actor.send({
                                type: 'RECEIVE_OFFER',
                                connectionId: msg.from,
                                offer: msg.offer,
                                peerName: msg.peerName,
                                publicKey: msg.publicKey,
                                encryptionPublicKey: msg.encryptionPublicKey,
                                iv: msg.iv
                            });
                        }

                        // Handle answer: Guest has sent WebRTC answer
                        if (msg.type === 'answer') {
                            logger.sig("Received answer from guest:", msg.from, "publicKey:", msg.publicKey);
                            const targetId = msg.boardId || connectionBoardId.value;
                            if (!targetId) {
                                logger.error("No valid target board UUID for answer message");
                                return;
                            }

                            const actor = getBoardActor(targetId, ident.name, false);
                            actor.send({
                                type: 'RECEIVE_ANSWER',
                                connectionId: msg.from,
                                answer: msg.answer,
                                peerName: msg.peerName,
                                publicKey: msg.publicKey,
                                iv: msg.iv
                            });
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
        setupSignaling,
        onBackToDiscovery,
        onBackToGames
    };
}

// Named exports for global refs that useGameSession needs
export { identity, isLoading, signalingClient, availableOffers, activeSessions, lobbyActor, boardActors, getBoardActor };
