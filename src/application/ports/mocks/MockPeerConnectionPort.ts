import { IPeerConnectionPort, PeerConnectionStatus } from '../IPeerConnectionPort';

export class MockPeerConnectionPort implements IPeerConnectionPort {
    public readonly id: string;
    public status: PeerConnectionStatus = PeerConnectionStatus.new;
    public isHostConnection: boolean = false;
    public remotePublicKey?: string;
    public remotePlayerName?: string;
    public serializedSignal: string = '';

    private messageHandlers: ((data: string) => void)[] = [];
    private closeHandlers: (() => void)[] = [];
    private statusHandlers: ((status: PeerConnectionStatus) => void)[] = [];
    private sentMessages: (string | Uint8Array | ArrayBuffer)[] = [];

    constructor(id: string, isHost: boolean = false) {
        this.id = id;
        this.isHostConnection = isHost;
        this.serializedSignal = `mock-signal-${id}`;
    }

    send(data: string | Uint8Array | ArrayBuffer): void {
        this.sentMessages.push(data);
    }

    close(): void {
        this.status = PeerConnectionStatus.closed;
        this.statusHandlers.forEach(h => h(this.status));
        this.closeHandlers.forEach(h => h());
    }

    onMessage(callback: (data: string) => void): void {
        this.messageHandlers.push(callback);
    }

    onClose(callback: () => void): void {
        this.closeHandlers.push(callback);
    }

    onStatusChange(callback: (status: PeerConnectionStatus) => void): void {
        this.statusHandlers.push(callback);
    }

    async prepareOffer(playerName: string, publicKey: string): Promise<void> {
        this.status = PeerConnectionStatus.started;
        this.statusHandlers.forEach(h => h(this.status));
    }

    async acceptOffer(offer: string, playerName: string, publicKey: string): Promise<void> {
        this.status = PeerConnectionStatus.answered;
        this.statusHandlers.forEach(h => h(this.status));
    }

    async acceptAnswer(answer: any): Promise<void> {
        this.status = PeerConnectionStatus.connected;
        this.statusHandlers.forEach(h => h(this.status));
    }

    // Test helpers
    public simulateMessage(data: string): void {
        this.messageHandlers.forEach(h => h(data));
    }

    public simulateStatusChange(status: PeerConnectionStatus): void {
        this.status = status;
        this.statusHandlers.forEach(h => h(status));
    }

    public getSentMessages(): (string | Uint8Array | ArrayBuffer)[] {
        return this.sentMessages;
    }
}
