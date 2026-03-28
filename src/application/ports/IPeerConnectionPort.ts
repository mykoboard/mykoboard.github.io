export enum PeerConnectionStatus {
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

export interface IPeerConnectionPort {
    readonly id: string;
    readonly status: PeerConnectionStatus;
    readonly iceGatheringState: IceGatheringState;
    readonly isHostConnection: boolean;
    remotePublicKey?: string;
    remotePlayerName?: string;
    remotePlayerId?: string;

    send(data: string | Uint8Array | ArrayBuffer): void;
    close(): void;
    onMessage(callback: (data: string) => void): void;
    onClose(callback: () => void): void;
    onStatusChange(callback: (status: PeerConnectionStatus) => void): void;

    // For signaling integration
    prepareOffer(playerName: string, publicKey: string): Promise<void>;
    acceptOffer(offer: string, playerName: string, publicKey: string): Promise<void>;
    acceptAnswer(answer: any): Promise<void>;
    serializedSignal: string;
}
