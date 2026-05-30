import { Peer, PeerStatus, IceGatheringState } from './types.ts';
import { Signal } from './Signal.ts';

// We could use a library like uuid, or standard crypto.randomUUID
const uuidv4 = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

const configuration: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

// Custom Events
export class ConnectionMessageEvent extends Event {
    constructor(public readonly data: any) {
        super('message');
    }
}

export class ConnectionStatusEvent extends Event {
    constructor(public readonly status: PeerStatus) {
        super('statuschange');
    }
}

export class ConnectionSignalEvent extends Event {
    constructor(public readonly signal: string) {
        super('signal');
    }
}

export class Connection extends EventTarget implements Peer {
    public readonly id: string;
    public peerConnection: RTCPeerConnection;
    public localPlayerName: string = "";
    public localPublicKey?: string;
    public remotePlayerName: string = "";
    public remotePublicKey?: string;
    public dataChannel?: RTCDataChannel;
    public iceCandidates: RTCIceCandidate[] = [];
    
    private _status: PeerStatus = PeerStatus.new;
    public isHostConnection: boolean = false;
    
    public signal: Signal | null = null;
    public serializedSignal: string = "";
    public iceGatheringState: IceGatheringState;

    constructor() {
        super();
        this.id = uuidv4();
        this.peerConnection = new RTCPeerConnection(configuration);
        this.iceGatheringState = this.peerConnection.iceGatheringState as IceGatheringState;
        
        let iceTimer: any = null;
        this.peerConnection.onicecandidate = (_event) => {
            if (_event.candidate) {
                this.iceCandidates.push(_event.candidate);
                if (this.status === PeerStatus.started || this.status === PeerStatus.answered) {
                    this.updateSignal();
                    if (iceTimer) clearTimeout(iceTimer);
                    iceTimer = setTimeout(() => {
                        this.dispatchEvent(new ConnectionSignalEvent(this.serializedSignal));
                        iceTimer = null;
                    }, 200);
                }
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            if (state === "connected") {
                this.setStatus(PeerStatus.connected);
            } else if (state === "disconnected" || state === "failed" || state === "closed") {
                this.close();
            }
        };

        this.peerConnection.onicegatheringstatechange = () => {
            this.iceGatheringState = this.peerConnection.iceGatheringState as IceGatheringState;
            if (this.iceGatheringState === 'complete') {
                this.updateSignal().then(() => {
                    this.dispatchEvent(new ConnectionSignalEvent(this.serializedSignal));
                });
            }
        };
    }

    get status(): PeerStatus {
        return this._status;
    }

    get publicKey(): string | undefined {
        return this.remotePublicKey;
    }

    get displayName(): string | undefined {
        return this.remotePlayerName;
    }

    private setStatus(newStatus: PeerStatus) {
        if (this._status !== newStatus) {
            this._status = newStatus;
            this.dispatchEvent(new ConnectionStatusEvent(this._status));
        }
    }

    private async updateSignal(publicKey?: string) {
        if (this.peerConnection.localDescription) {
            this.signal = new Signal(
                this.peerConnection.localDescription,
                publicKey || this.localPublicKey
            );
            this.serializedSignal = await this.signal.serialize();
        }
    }

    openDataChannel() {
        this.dataChannel = this.peerConnection.createDataChannel('gameData');
        if (this.dataChannel) {
            this.dataChannel.onmessage = (e) => this.dispatchEvent(new ConnectionMessageEvent(e.data));
        }
    }

    setDataChannelCallback() {
        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.dataChannel.onmessage = (e) => this.dispatchEvent(new ConnectionMessageEvent(e.data));
            this.dataChannel.onopen = () => {
                if (this.dataChannel?.readyState === "open") {
                    this.send(JSON.stringify({
                        namespace: 'player',
                        type: 'PLAYER_IDENTITY',
                        payload: { name: this.localPlayerName, publicKey: this.localPublicKey }
                    }));
                }
            };
        };
    }

    async prepareOfferSignal(playerName: string, publicKey: string) {
        this.localPlayerName = playerName;
        this.setStatus(PeerStatus.new);
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.setStatus(PeerStatus.started);
            this.localPublicKey = publicKey;
            await this.updateSignal(publicKey);
            this.dispatchEvent(new ConnectionSignalEvent(this.serializedSignal));
        } catch (e: any) {
            console.error('Failed to create offer', e);
        }
    }

    async send(text: string) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            await this.dataChannel.send(text);
        }
    }

    async acceptOffer(offerSignal: string | Signal, acceptingPlayerName: string, acceptingPublicKey: string) {
        const signal = typeof offerSignal === 'string' ? await Signal.decompress(offerSignal) : offerSignal;
        this.remotePublicKey = signal.publicKey;
        this.localPlayerName = acceptingPlayerName;
        this.localPublicKey = acceptingPublicKey;

        await this.peerConnection.setRemoteDescription(signal.session);

        try {
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.setStatus(PeerStatus.answered);
            await this.updateSignal(acceptingPublicKey);
            this.dispatchEvent(new ConnectionSignalEvent(this.serializedSignal));
        } catch (e: any) {
            console.error('Failed to accept offer', e);
        }
    }

    async acceptAnswer(answerSignal: string | Signal) {
        const connectionSignal = typeof answerSignal === 'string' ? await Signal.decompress(answerSignal) : answerSignal;
        try {
            await this.peerConnection.setRemoteDescription(connectionSignal.session);
            this.remotePublicKey = connectionSignal.publicKey;
        } catch (e) {
            console.error("Failed to set remote description from answer", e);
        }
    }

    close() {
        if (this.dataChannel) this.dataChannel.close();
        this.peerConnection.close();
        this.setStatus(PeerStatus.closed);
    }

    private _messageListeners = new Map<(data: string) => void, EventListener>();

    addMessageListener(callback: (data: string) => void) {
        const wrapper = ((e: Event) => {
            const msgEvent = e as ConnectionMessageEvent;
            callback(msgEvent.data);
        }) as EventListener;
        this._messageListeners.set(callback, wrapper);
        this.addEventListener('message', wrapper);
    }

    removeMessageListener(callback: (data: string) => void) {
        const wrapper = this._messageListeners.get(callback);
        if (wrapper) {
            this.removeEventListener('message', wrapper);
            this._messageListeners.delete(callback);
        }
    }
}
