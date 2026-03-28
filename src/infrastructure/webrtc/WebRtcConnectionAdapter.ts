import { reactive } from 'vue';
import { IPeerConnectionPort, PeerConnectionStatus, IceGatheringState } from '../../application/ports/IPeerConnectionPort';
import { Connection, ConnectionStatus } from '../../lib/webrtc';

/**
 * Adapter for WebRTC connections.
 * Bridges the legacy lib/webrtc.ts Connection class to the new IPeerConnectionPort hexagonal port.
 */
export class WebRtcConnectionAdapter implements IPeerConnectionPort {
    private connection: Connection;
    private statusListeners: ((status: PeerConnectionStatus) => void)[] = [];
    
    // Internal reactive state to bridge to Vue
    private state = reactive({
        status: PeerConnectionStatus.new,
        iceGatheringState: 'new' as IceGatheringState,
        serializedSignal: ''
    });

    constructor(onSignalUpdate: (connection: Connection) => void) {
        this.connection = new Connection((c) => {
            const mappedStatus = this.mapStatus(c.status);
            this.state.status = mappedStatus;
            this.state.iceGatheringState = c.iceGatheringState as IceGatheringState;
            this.state.serializedSignal = c.serializedSignal;
            
            this.statusListeners.forEach(l => l(mappedStatus));
            onSignalUpdate(c);
        });
    }

    private mapStatus(s: ConnectionStatus): PeerConnectionStatus {
        switch (s) {
            case ConnectionStatus.new: return PeerConnectionStatus.new;
            case ConnectionStatus.started: return PeerConnectionStatus.started;
            case ConnectionStatus.readyToAccept: return PeerConnectionStatus.readyToAccept;
            case ConnectionStatus.accepted: return PeerConnectionStatus.accepted;
            case ConnectionStatus.answered: return PeerConnectionStatus.answered;
            case ConnectionStatus.connected: return PeerConnectionStatus.connected;
            case ConnectionStatus.closed: return PeerConnectionStatus.closed;
            default: return PeerConnectionStatus.new;
        }
    }

    get id(): string { return this.connection.id; }
    get status(): PeerConnectionStatus { return this.state.status; }
    get iceGatheringState(): IceGatheringState { return this.state.iceGatheringState; }
    get isHostConnection(): boolean { return this.connection.isHostConnection; }

    get remotePublicKey(): string | undefined { return this.connection.remotePublicKey; }
    set remotePublicKey(val: string | undefined) { this.connection.remotePublicKey = val; }

    get remotePlayerName(): string | undefined { return this.connection.remotePlayerName; }
    set remotePlayerName(val: string | undefined) { this.connection.remotePlayerName = val || ""; }

    get remotePlayerId(): string | undefined { return (this.connection as any).remotePlayerId; }
    set remotePlayerId(val: string | undefined) { (this.connection as any).remotePlayerId = val; }

    send(data: string | Uint8Array | ArrayBuffer): void {
        // Current lib implementation only supports string
        if (typeof data === 'string') {
            this.connection.send(data);
        } else {
            console.warn('[WebRtcAdapter] Attempted to send non-string data, current implementation only supports strings.');
        }
    }

    close(): void {
        this.connection.close();
    }

    onMessage(callback: (data: string) => void): void {
        this.connection.addMessageListener(callback);
    }

    /** Backward compatibility for legacy MFE code */
    addMessageListener(callback: (data: string) => void): void {
        this.onMessage(callback);
    }

    /** Backward compatibility for legacy MFE code */
    removeMessageListener(callback: (data: string) => void): void {
        this.connection.removeMessageListener(callback);
    }

    onClose(callback: () => void): void {
        this.connection.onClose = callback;
    }

    /** Backward compatibility for legacy MFE code assignment: connection.onClose = ... */
    set onCloseLegacy(callback: (() => void) | undefined) {
        this.connection.onClose = callback;
    }

    onStatusChange(callback: (status: PeerConnectionStatus) => void): void {
        this.statusListeners.push(callback);
        callback(this.status);
    }

    /** Backward compatibility for legacy MFE state check */
    get isEstablished(): boolean {
        return this.status === PeerConnectionStatus.connected;
    }

    async prepareOffer(playerName: string, publicKey: string): Promise<void> {
        this.connection.openDataChannel();
        return this.connection.prepareOfferSignal(playerName, publicKey);
    }

    async acceptOffer(offer: string, playerName: string, publicKey: string): Promise<void> {
        this.connection.setDataChannelCallback();
        return this.connection.acceptOffer(offer, playerName, publicKey);
    }

    async acceptAnswer(answer: any): Promise<void> {
        return this.connection.acceptAnswer(answer);
    }

    get serializedSignal(): string {
        return this.state.serializedSignal;
    }
}
