export interface PendingJoinRequest {
    connectionId: string;
    peerName: string;
    publicKey: string;
    encryptionPublicKey?: string;
    timestamp: number;
}
