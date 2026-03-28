export interface ISignalingPort {
    connect(token: string, publicKey?: string, signature?: string): Promise<void>;
    hostRegister(boardId: string, gameId: string, peerName: string, publicKey: string): boolean;
    guestJoin(boardId: string, peerName: string, publicKey: string, encryptionPublicKey?: string): boolean;
    hostOffer(targetConnectionId: string, guestPublicKey: string, offer: any, encryptionPublicKey?: string, iv?: string): boolean;
    guestAnswer(targetConnectionId: string, publicKey: string, answer: any, iv?: string): boolean;
    deleteOffer(): void;
    disconnect(deleteOfferFirst?: boolean): void;
    isConnected: boolean;
    onMessage(callback: (msg: any) => void): void;
}
