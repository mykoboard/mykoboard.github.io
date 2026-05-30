import { ref, inject } from 'vue';
import { logger } from '../lib/logger';
import * as Keys from '../application/InjectionKeys';
import { Connection, Signal } from '@mykoboard/networking';

interface P2PNegotiationDependencies {
    hostSignalingMode: import('vue').Ref<'server' | 'manual' | null>;
    currentBoardActor: import('vue').Ref<any>;
}

export function useP2PNegotiation({
    hostSignalingMode,
    currentBoardActor,
}: P2PNegotiationDependencies) {
    const manualGuestConnectionId = ref<string | null>(null);

    // Inject Hexagonal Ports
    const identityRepo = inject(Keys.IdentityRepoKey)!;
    
    // Instead of shallowReactive Map, we hold references to the active manual connections here
    // In a full refactor, this would route back into NetworkManager, but for manual mode we can manage it locally.
    const manualConnections = ref<Connection[]>([]);

    const updateConnection = (conn: Connection) => {
        const actor = currentBoardActor.value;
        if (actor && conn.remotePublicKey) {
            actor.send({ 
                type: 'UPDATE_PARTICIPANT', 
                participant: {
                    publicKey: conn.remotePublicKey,
                    name: conn.remotePlayerName || 'Guest',
                    status: conn.status,
                    isHost: conn.isHostConnection
                }
            });
        }
    };

    const onAddManualConnection = async () => {
        const ident = await identityRepo.getIdentity();
        if (!ident) return;
        
        const connection = new Connection();
        connection.isHostConnection = true;

        connection.addEventListener('statuschange', () => updateConnection(connection));
        
        await connection.prepareOfferSignal(ident.name || 'Anonymous', ident.publicKey);

        // Note: we can't easily listen to onClose natively via a single event unless we map statuschange
        connection.addEventListener('statuschange', () => {
            if (connection.status === 'closed' || connection.status === 'failed') {
                currentBoardActor.value?.send({ type: 'PEER_DISCONNECTED', connectionId: connection.id, publicKey: connection.remotePublicKey });
            }
        });

        manualConnections.value.push(connection);
        updateConnection(connection);
    };

    const onCreateGuestManualConnection = async (initialOffer?: string) => {
        if (manualGuestConnectionId.value) {
            const existing = manualConnections.value.find(c => c.id === manualGuestConnectionId.value);
            if (existing && existing.status !== 'closed') {
                logger.sig('Guest manual connection already exists, skipping', manualGuestConnectionId.value);
                if (initialOffer && existing.status === 'new') { // 'readyToAccept' concept maps to new/started
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
        
        const connection = new Connection();
        connection.addEventListener('statuschange', () => updateConnection(connection));

        manualGuestConnectionId.value = connection.id;
        manualConnections.value.push(connection);

        connection.addEventListener('statuschange', () => {
            if (connection.status === 'closed' || connection.status === 'failed') {
                logger.sig(`Manual Guest Connection closed: ${connection.id}`);
                if (manualGuestConnectionId.value === connection.id) manualGuestConnectionId.value = null;
                currentBoardActor.value?.send({ type: 'PEER_DISCONNECTED', connectionId: connection.id, publicKey: connection.remotePublicKey });
            }
        });

        updateConnection(connection);

        if (initialOffer) setTimeout(() => { updateOffer(connection, initialOffer); }, 0);
    };

    const updateOffer = async (connection: Connection, offer: string) => {
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

    const updateAnswer = async (connection: Connection, answer: string) => {
        try {
            const signal = await Signal.decompress(answer);
            if (signal.publicKey) connection.remotePublicKey = signal.publicKey;
            await connection.acceptAnswer(answer); // Signal natively accepts string now
            updateConnection(connection);
        } catch (e) {
            logger.error('Failed to update answer:', e);
        }
    };

    const initializeManualSignaling = async () => {
        hostSignalingMode.value = 'manual';
        await onAddManualConnection();
    };

    return { 
        manualConnections, // exposed so UI can read connections directly
        manualGuestConnectionId, 
        onAddManualConnection, 
        onCreateGuestManualConnection, 
        updateOffer, 
        updateAnswer, 
        initializeManualSignaling 
    };
}

