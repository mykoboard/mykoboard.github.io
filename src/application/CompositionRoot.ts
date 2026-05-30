import { createActor } from 'xstate';
import { boardMachine } from '../machines/boardMachine';
import { logger } from '../lib/logger';

// Infrastructure Adapters
import { SecureWalletAdapter } from '../infrastructure/identity/SecureWalletAdapter';
import { IndexedDbSessionRepo } from '../infrastructure/persistence/IndexedDbSessionRepo';
import { IndexedDbKnownIdentityRepo } from '../infrastructure/persistence/IndexedDbKnownIdentityRepo';
import { AwsSignalingAdapter } from '../infrastructure/signaling/AwsSignalingAdapter';
import { SignalingAdapterWrapper } from '../infrastructure/network/SignalingAdapterWrapper';
import { NetworkManagerAdapter } from '../infrastructure/network/NetworkManagerAdapter';
import { NetworkManager } from '@mykoboard/networking';

// Singleton registry for domain actors (Board Machines)
const boardActors = new Map<string, any>();
const signalingPort = new AwsSignalingAdapter();

export const compositionRoot = {
    identityRepo: SecureWalletAdapter.getInstance(),
    sessionRepo: new IndexedDbSessionRepo(),
    knownIdentityRepo: new IndexedDbKnownIdentityRepo(),
    signalingPort,
    
    createNetworkManager: (isInitiator: boolean) => {
        const ident = SecureWalletAdapter.getInstance().identity.value;
        const nm = new NetworkManager(
            new SignalingAdapterWrapper(signalingPort),
            ident?.name || 'Anonymous',
            ident?.publicKey || '',
            isInitiator
        );
        return new NetworkManagerAdapter(nm);
    },

    getBoardActor: (boardId: string, playerName: string, isInitiator: boolean = false, maxPlayers: number = 2) => {
        if (!boardActors.has(boardId)) {
            logger.lobby('STATE', `Creating new hexagonal board actor for ${boardId}`);
            const actor = createActor(boardMachine, {
                input: { playerName, boardId, isInitiator, maxPlayers }
            });
            actor.start();
            boardActors.set(boardId, actor);
        }
        return boardActors.get(boardId)!;
    }
};
