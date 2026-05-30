import { ref, inject } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';
import { Ledger } from '@mykoboard/integration';
import { toast } from 'vue-sonner';
import type { PendingJoinRequest } from './useGameSession.types';
import * as Keys from '../application/InjectionKeys';
import { ISignalingPort } from '../application/ports/ISignalingPort';

interface SessionActionsDependencies {
    signalingClient: import('vue').Ref<ISignalingPort | null>;
    broadcast: (msg: any) => void;
    router: any;
    boardId: import('vue').Ref<string>;
    gameId: import('vue').Ref<string>;
    isInitiator: import('vue').Ref<boolean>;
    currentBoardActor: import('vue').Ref<any>;
    boardSnapshot: import('vue').Ref<any>;
}

export function useSessionActions({
    signalingClient,
    broadcast,
    router,
    boardId,
    gameId,
    isInitiator,
    currentBoardActor,
    boardSnapshot
}: SessionActionsDependencies) {
    
    // Inject Hexagonal Ports
    const identityRepo = inject(Keys.IdentityRepoKey)!;
    const knownIdentityRepo = inject(Keys.KnownIdentityRepoKey)!;
    const sessionRepo = inject(Keys.SessionRepoKey)!;
    const networkManager = inject(Keys.NetworkManagerPortKey)!;

    const pendingJoinRequests = ref<PendingJoinRequest[]>([]);

    const isKnownIdentity = async (publicKey: string): Promise<boolean> => {
        return knownIdentityRepo.isKnown(publicKey);
    };

    const autoApprovePeer = async (request: PendingJoinRequest) => {
        // networkManager implicitly manages this connection internally and automatically 
        // sends the offer using the configured SignalingAdapter.
        await networkManager.connectToPeer(request.publicKey, request.peerName);
    };

    const onApprovePeer = async (request: PendingJoinRequest) => {
        pendingJoinRequests.value = pendingJoinRequests.value.filter(r => r.connectionId !== request.connectionId);
        await autoApprovePeer(request);
    };

    const onRejectPeer = (request: PendingJoinRequest) => {
        pendingJoinRequests.value = pendingJoinRequests.value.filter(r => r.connectionId !== request.connectionId);
    };

    const saveIdentityOnApprove = async (request: PendingJoinRequest) => {
        try {
            await knownIdentityRepo.addKnownIdentity({ 
                id: request.publicKey,
                name: request.peerName, 
                publicKey: request.publicKey, 
                addedAt: Date.now() 
            });
            toast.success('Identity Saved');
        } catch {
            toast.error('Failed to save identity');
        }
    };

    const onHostAGame = async (playerCount: number = 2) => {
        router.push(`/games/${gameId.value}/${uuidv4()}?maxPlayers=${playerCount}`);
    };

    const onJoinAsGuest = async () => {
        if (!boardId.value || !signalingClient.value?.isConnected) {
            logger.error('Cannot join as guest: missing boardId or signaling not connected');
            return;
        }
        const ident = await identityRepo.getIdentity();
        if (!ident) {
            logger.error('Cannot join as guest: identity not found');
            return;
        }
        logger.info('Sending guestJoin for boardId:', boardId.value);
        signalingClient.value.guestJoin(boardId.value, ident.name, ident.publicKey, ident.publicKey);
    };

    const startGame = () => {
        if (signalingClient.value && isInitiator.value) signalingClient.value.deleteOffer();
        
        // CRITICAL: Notify all peers that the game is starting
        broadcast({ namespace: 'game', type: 'GAME_STARTED' });
        
        currentBoardActor.value?.send({ type: 'START_GAME' });
    };

    const onFinishGame = async () => {
        currentBoardActor.value?.send({ type: 'FINISH_GAME' });
        if (boardId.value && boardSnapshot.value?.context?.session) {
            const session = { ...boardSnapshot.value.context.session, status: 'finished' as const };
            await sessionRepo.saveGame(session);
        }
    };

    const onAddLedger = async (action: { type: string; payload: any }) => {
        if (!currentBoardActor.value) return;
        const ident = await identityRepo.getIdentity();
        if (!ident) return;

        const signature = await identityRepo.sign(action);
        const ledger = Ledger.fromEntries((boardSnapshot.value as any)?.context?.ledger || []);
        const entry = await ledger.addEntry({ ...action });
        entry.signature = signature;
        entry.signerPublicKey = ident.publicKey;

        const updatedLedger = ledger.getEntries();
        currentBoardActor.value.send({ type: 'SYNC_LEDGER', ledger: updatedLedger });
        broadcast({ namespace: 'game', type: 'SYNC_LEDGER', payload: updatedLedger });
    };

    const handlePlayAgain = () => {
        const newBoardId = uuidv4();
        broadcast({ namespace: 'game', type: 'NEW_BOARD', payload: newBoardId });
        signalingClient.value?.deleteOffer();
        currentBoardActor.value?.send({ type: 'CLOSE_SESSION' });
        router.push(`/games/${gameId.value}/${newBoardId}`);
    };

    const onAcceptGuest = () => {
        currentBoardActor.value?.send({ type: 'ACCEPT_GUEST' });
        // Handling of guest acceptance is handled implicitly by connection states.
    };

    const onRejectGuest = () => currentBoardActor.value?.send({ type: 'REJECT_GUEST' });

    const onCancelSignaling = () => {
        // This used to close a pending P2P connection manually. 
        // With NetworkManager, it's not strictly necessary for individual peer cancellation unless added to the Port API.
    };

    const onBackToGames = () => {
        signalingClient.value?.deleteOffer();
        currentBoardActor.value?.send({ type: 'CLOSE_SESSION' });
        router.push(`/games/${gameId.value}`);
    };

    const onBackToDiscovery = () => router.push(`/games/${gameId.value}`);

    return {
        pendingJoinRequests,
        isKnownIdentity,
        autoApprovePeer,
        onApprovePeer,
        onRejectPeer,
        saveIdentityOnApprove,
        onHostAGame,
        onJoinAsGuest,
        startGame,
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

