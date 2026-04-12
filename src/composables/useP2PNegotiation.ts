import { ref, inject } from 'vue';
import { logger } from '../lib/logger';
import type { PlayerInfo } from '@mykoboard/integration';
import * as Keys from '../application/InjectionKeys';
import { IPeerConnectionPort, PeerConnectionStatus } from '../application/ports/IPeerConnectionPort';
import { Signal } from '../lib/webrtc';

interface P2PNegotiationDependencies {
    playerInfos: import('vue').ComputedRef<PlayerInfo[]>;
    pendingConnections: import('vue').ShallowReactive<Map<string, IPeerConnectionPort>>;
    hostSignalingMode: import('vue').Ref<'server' | 'manual' | null>;
    updateConnection: (connection: IPeerConnectionPort) => void;
    currentBoardActor: import('vue').Ref<any>;
}

export function useP2PNegotiation({
    playerInfos,
    pendingConnections,
    hostSignalingMode,
    updateConnection,
    currentBoardActor,
}: P2PNegotiationDependencies) {
    const manualGuestConnectionId = ref<string | null>(null);

    // Inject Hexagonal Ports
    const identityRepo = inject(Keys.IdentityRepoKey)!;
    const createPeerConnection = inject(Keys.PeerConnectionFactoryKey)!;

    const onAddManualConnection = async () => {
        const ident = await identityRepo.getIdentity();
        if (!ident) return;
        const connection = createPeerConnection((_c) => { updateConnection(connection); });

        connection.remotePlayerId = connection.id;

        await connection.prepareOffer(ident.name || 'Anonymous', ident.publicKey);

        connection.onClose(() => {
            currentBoardActor.value?.send({ type: 'PEER_DISCONNECTED', connectionId: connection.id, publicKey: connection.remotePublicKey });
        });

        pendingConnections.set(connection.id, connection);
        updateConnection(connection);
    };

    const onCreateGuestManualConnection = async (initialOffer?: string) => {
        if (manualGuestConnectionId.value) {
            const existing = pendingConnections.get(manualGuestConnectionId.value);
            if (existing && existing.status !== PeerConnectionStatus.closed) {
                logger.sig('Guest manual connection already exists, skipping', manualGuestConnectionId.value);
                if (initialOffer && existing.status === PeerConnectionStatus.readyToAccept) {
                    logger.sig('Applying initialOffer to existing connection');
                    updateOffer(existing, initialOffer);
                }
                return;
            }
        }

        logger.info('Guest creating placeholder for manual join, initialOffer?', !!initialOffer);
        hostSignalingMode.value = 'manual';
        const ident = await identityRepo.getIdentity();
        if (!ident) return;
        const connection = createPeerConnection((_c) => {
            updateConnection(connection);
        });

        connection.remotePlayerId = connection.id;
        manualGuestConnectionId.value = connection.id;
        pendingConnections.set(connection.id, connection);

        connection.onClose(() => {
            logger.sig(`Manual Guest Connection closed: ${connection.id}`);
            if (manualGuestConnectionId.value === connection.id) manualGuestConnectionId.value = null;
            currentBoardActor.value?.send({ type: 'PEER_DISCONNECTED', connectionId: connection.id, publicKey: connection.remotePublicKey });
        });

        updateConnection(connection);

        if (initialOffer) setTimeout(() => { updateOffer(connection, initialOffer); }, 0);
    };

    const updateOffer = async (connection: IPeerConnectionPort, offer: string) => {
        try {
            const signal = await Signal.decompress(offer);
            const ident = await identityRepo.getIdentity();
            if (!ident) return;
            if (signal.publicKey) connection.remotePublicKey = signal.publicKey;

            await connection.acceptOffer(offer, ident.name, ident.publicKey);
            updateConnection(connection);
        } catch (e) {
            logger.error('Failed to accept offer:', e);
        }
    };

    const updateAnswer = async (connection: IPeerConnectionPort, answer: string) => {
        try {
            const signal = await Signal.decompress(answer);
            await connection.acceptAnswer(signal);
            updateConnection(connection);
        } catch (e) {
            logger.error('Failed to update answer:', e);
        }
    };

    const initializeManualSignaling = () => {
        hostSignalingMode.value = 'manual';
        onAddManualConnection();
    };

    return { manualGuestConnectionId, onAddManualConnection, onCreateGuestManualConnection, updateOffer, updateAnswer, initializeManualSignaling };
}
