import { Signal } from './webrtc';

export type SignalingMessage = {
    action: 'sendMessage'; // Required for AWS API Gateway routing
    type: 'register' | 'offer' | 'listOffers' | 'offerList' | 'answer' | 'deleteOffer';
    from?: string;
    target?: string;
    peerName?: string;
    offer?: any;
    offers?: any[];
    answer?: any;
    boardId?: string;
};

export class SignalingService {
    private socket: WebSocket | null = null;
    private onMessageCallback: (msg: any) => void;
    private boardId: string;
    private peerName: string;

    constructor(boardId: string, peerName: string, onMessage: (msg: any) => void) {
        this.boardId = boardId;
        this.peerName = peerName;
        this.onMessageCallback = onMessage;
    }

    async connect(token: string, publicKey?: string, signature?: string) {
        let url = import.meta.env.VITE_SIGNALING_SERVER_URL || 'wss://pebsg4v5yk.execute-api.eu-central-1.amazonaws.com/production';

        const params = new URLSearchParams();
        params.append('x-api-key', token);
        if (publicKey) params.append('x-pubkey', publicKey);
        if (signature) params.append('x-sig', signature);

        const SIGNALING_SERVER_URL = `${url}?${params.toString()}`;

        return new Promise<void>((resolve, reject) => {
            console.log(`Connecting to signaling server: ${SIGNALING_SERVER_URL}`);
            this.socket = new WebSocket(SIGNALING_SERVER_URL);

            this.socket.onopen = () => {
                console.log("WebSocket Connection Open.");
                resolve();
            };

            this.socket.onmessage = (event) => {
                console.log("Raw message from server:", event.data);
                try {
                    const msg = JSON.parse(event.data);
                    this.onMessageCallback(msg);
                } catch (e) {
                    console.error("Failed to parse signaling message", e);
                }
            };

            this.socket.onclose = (event) => {
                console.log("Disconnected from signaling server", event.code, event.reason);
                this.socket = null;
            };

            this.socket.onerror = (err) => {
                console.error("Signaling WebSocket error:", err);
                reject(err);
            };
        });
    }

    async register() {
        console.log("Registering peer:", this.peerName, "for board:", this.boardId);
        this.send({
            type: 'register',
            peerName: this.peerName,
            boardId: this.boardId
        });
    }

    sendOffer(signal: Signal) {
        console.log("Broadcasting offer for board:", this.boardId);
        this.send({
            type: 'offer',
            offer: signal,
            boardId: this.boardId
        });
    }

    requestOffers() {
        console.log("Requesting active offers for board:", this.boardId);
        this.send({
            type: 'listOffers',
            boardId: this.boardId
        });
    }

    sendAnswer(targetConnectionId: string, signal: Signal) {
        console.log("Sending answer to:", targetConnectionId);
        this.send({
            type: 'answer',
            target: targetConnectionId,
            answer: signal,
            peerName: this.peerName // Include name so host can approve
        });
    }

    deleteOffer() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn("Cannot delete offer: Signaling socket is not open.");
            return;
        }
        console.log("Deleting offer for board:", this.boardId);
        this.send({
            type: 'deleteOffer',
            boardId: this.boardId
        });
    }

    private send(message: Partial<SignalingMessage>) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error("Signaling socket not open. State:", this.socket?.readyState);
            return;
        }

        // AWS API Gateway REQUIRES the 'action' key to match the route 
        // if you are using custom routes like 'sendMessage'
        const payload = {
            action: 'sendMessage',
            ...message
        };

        console.log("Sending payload to AWS:", payload);
        this.socket.send(JSON.stringify(payload));
    }

    disconnect() {
        this.socket?.close();
        this.socket = null;
    }

    get isConnected(): boolean {
        return !!this.socket && this.socket.readyState === WebSocket.OPEN;
    }
}
