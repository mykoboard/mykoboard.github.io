import { ref, watch, onMounted, onUnmounted, inject } from 'vue';
import { logger } from '../lib/logger';
import { toast } from 'vue-sonner';
// NO SHARED STATE IMPORTS
import type { PlayerInfo } from '@mykoboard/integration';
import type { PendingJoinRequest } from './useGameSession.types';
import * as Keys from '../application/InjectionKeys';
import { IPeerConnectionPort } from '../application/ports/IPeerConnectionPort';

interface SignalingDependencies {
    playerInfos: import('vue').ComputedRef<PlayerInfo[]>;
    pendingJoinRequests: import('vue').Ref<PendingJoinRequest[]>;
    autoApprovePeer: (request: PendingJoinRequest) => Promise<void>;
    handleGameNamespace: (msg: any, connection: IPeerConnectionPort) => void;
    handlePlayerNamespace: (msg: any, connection: IPeerConnectionPort) => void;
    route: any;
    boardId: import('vue').Ref<string>;
    gameId: import('vue').Ref<string>;
    boardSnapshot: import('vue').Ref<any>;
    isInitiator: import('vue').Ref<boolean>;
    isGameStarted: import('vue').Ref<boolean>;
    getBoardActor: (id: string, name: string, isInitiator: boolean) => any;
}

export function useSignaling({
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
    getBoardActor
}: SignalingDependencies) {
    
    // Inject Hexagonal Ports
    const identityRepo = inject(Keys.IdentityRepoKey)!;
    const knownIdentityRepo = inject(Keys.KnownIdentityRepoKey)!;
    const signalingPort = inject(Keys.SignalingPortKey)!;
    const createPeerConnection = inject(Keys.PeerConnectionFactoryKey)!;

    const isServerConnecting = ref(false);
    const connectionBoardId = ref<string>('');
    const hasRegistered = ref(false);
    const hostSignalingMode = ref<'server' | 'manual' | null>(null);
    const wakeLock = ref<any>(null);

    const isKnownIdentity = async (publicKey: string): Promise<boolean> => {
        const known = await knownIdentityRepo.getAllKnownIdentities();
        return known.some(f => f.publicKey === publicKey);
    };

    const setupSignaling = async (gameIdArg: string, boardIdArg?: string, isManualMode?: boolean) => {
        const currentBoardId = boardIdArg || gameIdArg;
        if (isInitiator.value && hostSignalingMode.value !== 'server') return;
        if (!currentBoardId || currentBoardId === 'manual' || isManualMode || hostSignalingMode.value === 'manual' || (route && route.query.mode === 'manual')) return;

        if (connectionBoardId.value !== currentBoardId && signalingPort.isConnected) {
            logger.sig('Switching signaling board from', connectionBoardId.value, 'to', currentBoardId);
            signalingPort.disconnect();
        }

        if (!signalingPort.isConnected && !isServerConnecting.value) {
            isServerConnecting.value = true;
            try {
                const ident = await identityRepo.getIdentity();
                if (ident) {
                    signalingPort.onMessage(async (msg: any) => {
                        if (msg.type === 'error') {
                            logger.error('Signaling error:', msg.message || msg.code);
                            if ((msg.code === 'SESSION_NOT_FOUND' || msg.code === 'HOST_UNREACHABLE') && !isInitiator.value) {
                                if (isGameStarted.value) { logger.sig(`${msg.code} ignored after game started`); return; }
                                logger.sig(`${msg.code}, retrying in 3s...`);
                                setTimeout(() => { hasRegistered.value = false; }, 3000);
                                return;
                            }
                            toast.error(msg.message || 'Signaling error occurred');
                            if (msg.code === 'DUPLICATE_IDENTITY') window.location.replace(`/games/${gameIdArg}`);
                        }

                        if (msg.type === 'peerJoined') {
                            const isKnown = await isKnownIdentity(msg.publicKey!);
                            const isAlreadyInSession = playerInfos.value.some(p => p.publicKey === msg.publicKey);

                            if (isKnown || isAlreadyInSession) {
                                logger.sig(`Auto-approving ${isKnown ? 'known' : 'returning'} identity:`, msg.peerName);
                                if (!isKnown && isAlreadyInSession && msg.publicKey) {
                                    knownIdentityRepo.addKnownIdentity({
                                        id: `identity-${Date.now()}-${msg.publicKey.substring(0, 8)}`,
                                        name: msg.peerName || 'Guest', publicKey: msg.publicKey, addedAt: Date.now(),
                                    }).catch(err => logger.error('Failed to auto-save returning peer:', err));
                                }
                                await autoApprovePeer({ connectionId: msg.from!, peerName: msg.peerName || 'Guest', publicKey: msg.publicKey!, encryptionPublicKey: msg.encryptionPublicKey, timestamp: Date.now() });
                            } else {
                                pendingJoinRequests.value.push({ connectionId: msg.from!, peerName: msg.peerName || 'Guest', publicKey: msg.publicKey!, encryptionPublicKey: msg.encryptionPublicKey, timestamp: Date.now() });
                            }
                        }

                        if (msg.type === 'offer') {
                            const targetId = msg.boardId || connectionBoardId.value;
                            if (!targetId) { logger.error('No valid target board UUID for offer'); return; }

                            const actor = getBoardActor(targetId, ident.name, false);
                            const connection = createPeerConnection(() => { 
                                actor.send({ 
                                    type: 'UPDATE_PARTICIPANT', 
                                    participant: {
                                        id: connection.id,
                                        name: connection.remotePlayerName || 'Guest',
                                        status: (connection.status as any),
                                        isHost: connection.isHostConnection,
                                        publicKey: connection.remotePublicKey
                                    } 
                                }); 
                            });
                            
                            connection.onMessage((data: string) => {
                                try {
                                    const message = JSON.parse(data);
                                    if (message.namespace === 'game') handleGameNamespace(message, connection);
                                    else if (message.namespace === 'player') handlePlayerNamespace(message, connection);
                                } catch (e) { logger.error('Failed to parse message:', e); }
                            });

                            connection.onClose(() => actor.send({ type: 'PEER_DISCONNECTED', connectionId: connection.id }));
                            
                            if (msg.publicKey) connection.remotePublicKey = msg.publicKey;
                            if (msg.peerName) connection.remotePlayerName = msg.peerName;
                            const hostPlayer = playerInfos.value.find(p => p.isHost);
                            if (hostPlayer) connection.remotePlayerId = hostPlayer.id;
                            
                            connection.acceptOffer(msg.offer, ident.name, ident.publicKey).then(() => {
                                const checkAnswer = setInterval(() => {
                                    if (connection.serializedSignal && signalingPort.isConnected) {
                                        clearInterval(checkAnswer);
                                        signalingPort.guestAnswer(msg.from!, ident.publicKey, connection.serializedSignal);
                                    }
                                }, 100);
                            }).catch((err: any) => logger.error('Failed to accept offer:', err));
                        }

                        if (msg.type === 'answer') {
                            const event = new CustomEvent('signaling:answer', { detail: msg });
                            window.dispatchEvent(event);
                        }
                    });

                    const challenge = `SIGN_IN:${ident.subscriptionToken}`;
                    const signature = await identityRepo.sign(challenge);
                    await signalingPort.connect(ident.subscriptionToken, ident.publicKey, signature);
                    connectionBoardId.value = currentBoardId;
                }
            } catch (err) {
                logger.error('Failed to connect to signaling server:', err);
            } finally {
                isServerConnecting.value = false;
            }
        }
    };

    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLock.value = await (navigator as any).wakeLock.request('screen');
                wakeLock.value.addEventListener('release', () => logger.sig('Wake Lock released'));
            } catch (err: any) {
                logger.error(`Wake Lock failed: ${err.name}, ${err.message}`);
            }
        }
    };

    const handleVisibilityChange = async () => {
        if (document.visibilityState !== 'visible') return;
        if (boardId.value === 'manual' || hostSignalingMode.value === 'manual' || (route && route.query.base64Offer) || (route && route.query.mode === 'manual')) return;

        if (signalingPort && !signalingPort.isConnected) {
            if (!isGameStarted.value) { hasRegistered.value = false; await setupSignaling(gameId.value, boardId.value); }
        } else if (signalingPort?.isConnected) {
            if (!isGameStarted.value) hasRegistered.value = false;
        }
    };

    onMounted(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);
        if (boardId.value) requestWakeLock();
    });

    onUnmounted(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
        if (wakeLock.value) { wakeLock.value.release(); wakeLock.value = null; }
    });

    watch([boardId, boardSnapshot, hostSignalingMode], async () => {
        if (hostSignalingMode.value === 'manual' || (route && route.query.mode === 'manual')) {
            if (signalingPort.isConnected) signalingPort.disconnect();
            return;
        }

        if (!boardSnapshot.value || boardSnapshot.value.matches('idle')) return;
        const shouldConnect = !!boardId.value && 
                             (!route || (!route.query.mode && !route.query.base64Offer)) && 
                             !isInitiator.value && 
                             hostSignalingMode.value === 'server';
        if (shouldConnect) await setupSignaling(gameId.value, boardId.value);
    }, { immediate: true });

    watch([boardSnapshot, boardId, hostSignalingMode], async () => {
        if (hostSignalingMode.value === 'manual' || (route && route.query.mode === 'manual')) {
            if (signalingPort.isConnected) signalingPort.disconnect();
            return;
        }

        if (!signalingPort.isConnected || !boardId.value || hasRegistered.value) return;

        const ident = await identityRepo.getIdentity();
        if (!ident) return;
        const state = boardSnapshot.value;
        if (!state) return;

        const isHosting = state.matches('hosting') || state.matches('preparation');
        const isJoining = state.matches('joining');

        if (isHosting && state.context.isInitiator && hostSignalingMode.value === 'server') {
            signalingPort.hostRegister(boardId.value, gameId.value, ident.name, ident.publicKey);
            hasRegistered.value = true;
        } else if (isJoining || !state.context.isInitiator) {
            signalingPort.guestJoin(boardId.value, ident.name, ident.publicKey, ident.publicKey);
            hasRegistered.value = true;
        }
    });

    const initializeServerSignaling = async () => {
        hostSignalingMode.value = 'server';
        await setupSignaling(gameId.value, boardId.value);
    };

    return { signalingClient: signalingPort, isServerConnecting, hostSignalingMode, hasRegistered, initializeServerSignaling, isKnownIdentity, setupSignaling };
}
