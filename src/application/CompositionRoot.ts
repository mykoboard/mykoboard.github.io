import { createActor } from 'xstate';
import { boardMachine } from '../machines/boardMachine';
import { logger } from '../lib/logger';
import { Connection } from '../lib/webrtc';

// Infrastructure Adapters
import { SecureWalletAdapter } from '../infrastructure/identity/SecureWalletAdapter';
import { IndexedDbSessionRepo } from '../infrastructure/persistence/IndexedDbSessionRepo';
import { IndexedDbKnownIdentityRepo } from '../infrastructure/persistence/IndexedDbKnownIdentityRepo';
import { AwsSignalingAdapter } from '../infrastructure/signaling/AwsSignalingAdapter';
import { WebRtcConnectionAdapter } from '../infrastructure/webrtc/WebRtcConnectionAdapter';

// Singleton registry for domain actors (Board Machines)
const boardActors = new Map<string, any>();

export const compositionRoot = {
    identityRepo: SecureWalletAdapter.getInstance(),
    sessionRepo: new IndexedDbSessionRepo(),
    knownIdentityRepo: new IndexedDbKnownIdentityRepo(),
    signalingPort: new AwsSignalingAdapter(),
    
    createPeerConnection: (onSignalUpdate: (c: Connection) => void) => 
        new WebRtcConnectionAdapter(onSignalUpdate),

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
