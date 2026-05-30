export enum PeerStatus {
    new = 'new',
    started = 'started',
    readyToAccept = 'readyToAccept',
    accepted = 'accepted',
    answered = 'answered',
    connecting = 'connecting',
    connected = 'connected',
    disconnected = 'disconnected',
    failed = 'failed',
    closed = 'closed'
}

export type IceGatheringState = 'new' | 'gathering' | 'complete';

export interface Peer {
    readonly id: string;
    readonly publicKey?: string;
    readonly displayName?: string;
    readonly status: PeerStatus;
    readonly isHostConnection: boolean;
}
