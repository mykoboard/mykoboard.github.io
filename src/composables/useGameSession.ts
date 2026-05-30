import { onMounted, onUnmounted } from 'vue';
import { useBoardState } from './useBoardState';
import { useConnectionManager } from './useConnectionManager';
import { useSignaling } from './useSignaling';
import { useP2PNegotiation } from './useP2PNegotiation';
import { useSessionActions } from './useSessionActions';
import { compositionRoot } from '../application/CompositionRoot';
import { ISignalingPort } from '../application/ports/ISignalingPort';

const { identity, isLoading } = compositionRoot.identityRepo;
const { activeSessions } = compositionRoot.sessionRepo;

export function useGameSession() {
    // Board state (still needed for playerInfos, topologyMode, view, activeSessions)
    const boardState = useBoardState();
    const {
        playerInfos,
        topologyMode,
        setTopologyMode,
        boardSnapshot,
        isInitiator,
        isGameStarted,
        router,
        route,
        boardId,
        gameId,
        currentBoardActor
    } = boardState;

    // --- Connection management: needs board context ---
    const connectionManager = useConnectionManager({
        router,
        currentBoardActor,
        boardSnapshot,
        isInitiator,
        boardId,
        gameId
    });
    const {
        pendingConnections,
        connectedPeers,
        pendingSignaling,
        broadcast,
        updateConnection,
        handleGameNamespace,
        handlePlayerNamespace
    } = connectionManager;

    // --- Session actions: needs signalingClient (cross-composable), broadcast+updateConnection from connection manager, plus board context ---
    const signalingClientRef = { value: null as ISignalingPort | null };
    const sessionActions = useSessionActions({
        signalingClient: signalingClientRef as any,
        broadcast,
        router,
        boardId,
        gameId,
        isInitiator,
        currentBoardActor,
        boardSnapshot
    });
    const {
        pendingJoinRequests,
        isKnownIdentity,
        autoApprovePeer,
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
        onBackToDiscovery
    } = sessionActions;

    // --- Signaling: needs the message handlers from connection manager + peer management from session actions, plus board context ---
    const signalingComposable = useSignaling({
        playerInfos,
        pendingJoinRequests,
        autoApprovePeer,
        handleGameNamespace,
        handlePlayerNamespace,
        route,
        boardId,
        gameId,
        boardSnapshot,
        isInitiator,
        isGameStarted,
        getBoardActor: (_id: string, _name: string, _isInit: boolean) =>
            boardState.currentBoardActor.value?.parent?.send || boardState.currentBoardActor.value
    });
    const {
        signalingClient,
        isServerConnecting,
        hostSignalingMode,
        initializeServerSignaling
    } = signalingComposable;

    // Wire the real signalingClient ref into sessionActions
    Object.assign(signalingClientRef, { value: signalingClient });

    // --- Manual P2P negotiation: needs board context ---
    const p2pNegotiation = useP2PNegotiation({
        hostSignalingMode,
        currentBoardActor
    });
    const {
        onAddManualConnection,
        onCreateGuestManualConnection,
        updateOffer,
        updateAnswer,
        initializeManualSignaling
    } = p2pNegotiation;

    // Event listeners are no longer needed for signaling:answer since NetworkManager manages this.
    onMounted(() => {
    });

    onUnmounted(() => {
    });

    return {
        identity,
        isLoading,
        snapshot: boardSnapshot,
        signalingClient,
        isServerConnecting,
        pendingJoinRequests,
        activeSessions,
        playerInfos,
        connectedPeers,
        pendingSignaling,
        isInitiator,
        isGameStarted,
        onHostAGame: sessionActions.onHostAGame,
        onJoinAsGuest: sessionActions.onJoinAsGuest,
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
        topologyMode,
        setTopologyMode,
        send: (ev: any) => boardState.currentBoardActor.value?.send(ev),
    };
}
