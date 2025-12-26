import { Signal } from './webrtc';

export type SignalingSlot = {
    connectionId: string;
    offer: any;
    status: 'open' | 'taken';
    peerName?: string;
};

export type SignalingMessage = {
    action: 'sendMessage'; // Required for AWS API Gateway routing
    type: 'register' | 'offer' | 'listOffers' | 'offerList' | 'answer' | 'deleteOffer';
    from?: string;
    to?: string;
    target?: string;
    peerName?: string;
    offer?: any;
    slots?: SignalingSlot[];
    offers?: any[];
    answer?: any;
    boardId?: string;
    gameId?: string;
};

export class SignalingService {
    private socket: WebSocket | null = null;
    private onMessageCallback: (msg: any) => void;
    private gameId: string;
    private boardId: string; // The specific session ID (optional for joiners)
    private peerName: string;

    constructor(gameId: string, boardId: string | undefined, peerName: string, onMessage: (msg: any) => void) {
        this.gameId = gameId;
        this.boardId = boardId || "";
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

    sendOffer(slots: SignalingSlot[], gameId: string, boardId: string, peerName: string) {
        console.log("Broadcasting combined offer for game:", this.gameId, "board:", boardId, "slots:", slots.length);
        this.send({
            type: 'offer',
            slots: slots,
            gameId: this.gameId,
            boardId: boardId,
            peerName: peerName
        });
    }

    requestOffers() {
        console.log("Requesting active offers for game:", this.gameId);
        this.send({
            type: 'listOffers',
            gameId: this.gameId
        });
    }

    sendAnswer(targetWebSocketId: string, targetP2PId: string, signal: Signal) {
        console.log("Sending answer to host:", targetWebSocketId, "for P2P slot:", targetP2PId);
        this.send({
            type: 'answer',
            target: targetWebSocketId,
            to: targetP2PId,
            answer: signal,
            peerName: this.peerName // Include name so host can approve
        });
    }

    deleteOffer() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn("Cannot delete offer: Signaling socket is not open.");
            return;
        }
        console.log("Deleting offer for game:", this.gameId, "board:", this.boardId);
        this.send({
            type: 'deleteOffer',
            gameId: this.gameId,
            ...(this.boardId ? { boardId: this.boardId } : {})
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
