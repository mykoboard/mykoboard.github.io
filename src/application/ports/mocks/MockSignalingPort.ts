import { ISignalingPort } from '../ISignalingPort';

export class MockSignalingPort implements ISignalingPort {
    public isConnected: boolean = false;
    private messageHandlers: ((msg: any) => void)[] = [];

    async connect(token: string, publicKey?: string, signature?: string): Promise<void> {
        this.isConnected = true;
    }

    hostRegister(boardId: string, gameId: string, peerName: string, publicKey: string): boolean {
        return true;
    }

    guestJoin(boardId: string, peerName: string, publicKey: string, encryptionPublicKey?: string): boolean {
        return true;
    }

    hostOffer(targetConnectionId: string, guestPublicKey: string, offer: any, encryptionPublicKey?: string, iv?: string): boolean {
        return true;
    }

    guestAnswer(targetConnectionId: string, publicKey: string, answer: any, iv?: string): boolean {
        return true;
    }

    deleteOffer(): void {
        // No-op
    }

    disconnect(deleteOfferFirst?: boolean): void {
        this.isConnected = false;
    }

    onMessage(callback: (msg: any) => void): void {
        this.messageHandlers.push(callback);
    }

    // Test helper
    public async simulateMessage(msg: any): Promise<void> {
        await Promise.all(this.messageHandlers.map(h => h(msg)));
    }
}
