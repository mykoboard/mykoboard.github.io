import { Signal } from './webrtc';
import { logger } from './logger';

export type SignalingSlot = {
    connectionId: string;
    offer: any;
    status: 'open' | 'taken';
    peerName?: string;
};

export type SignalingMessage = {
    action: 'sendMessage'; // Required for AWS API Gateway routing
    type: 'hostRegister' | 'guestJoin' | 'hostOffer' | 'guestAnswer' | 'deleteOffer' |
    'peerJoined' | 'offer' | 'answer' | 'error';
    from?: string;
    to?: string;
    target?: string;
    peerName?: string;
    offer?: any;
    answer?: any;
    boardId?: string;
    gameId?: string;
    publicKey?: string;
    guestPublicKey?: string;
    encryptionPublicKey?: string;
    iv?: string;
    code?: string;
    message?: string;
};

export class SignalingService {
    private socket: WebSocket | null = null;
    private onMessageCallback: (msg: any) => void;
    private gameId: string;
    private boardId: string; // The specific session ID (optional for joiners)
    private peerName: string;
    private publicKey: string | null = null;

    constructor(gameId: string, boardId: string | undefined, peerName: string, onMessage: (msg: any) => void) {
        this.gameId = gameId;
        this.boardId = boardId || "";
        this.peerName = peerName;
        this.onMessageCallback = onMessage;
    }

    updateBoardId(boardId: string) {
        logger.sig(`Updating signaling boardId from ${this.boardId} to ${boardId}`);
        this.boardId = boardId;
    }

    async connect(token: string, publicKey?: string, signature?: string) {
        let url = import.meta.env.VITE_SIGNALING_SERVER_URL || 'wss://pebsg4v5yk.execute-api.eu-central-1.amazonaws.com/production';

        const params = new URLSearchParams();
        params.append('x-api-key', token);
        if (publicKey) {
            params.append('x-pubkey', publicKey);
            this.publicKey = publicKey;
        }
        if (signature) params.append('x-sig', signature);

        const SIGNALING_SERVER_URL = `${url}?${params.toString()}`;

        return new Promise<void>((resolve, reject) => {
            logger.sig(`Connecting to signaling server: ${SIGNALING_SERVER_URL}`);
            this.socket = new WebSocket(SIGNALING_SERVER_URL);

            this.socket.onopen = () => {
                logger.sig("WebSocket Connection Open.");
                resolve();
            };

            this.socket.onmessage = (event) => {
                logger.sig("Raw message from server:", event.data);
                try {
                    const msg = JSON.parse(event.data);
                    this.onMessageCallback(msg);
                } catch (e) {
                    logger.error("Failed to parse signaling message", e);
                }
            };

            this.socket.onclose = (event) => {
                logger.sig("Disconnected from signaling server", event.code, event.reason);
                this.socket = null;
            };

            this.socket.onerror = (err) => {
                logger.error("Signaling WebSocket error:", err);
                reject(err);
            };
        });
    }

    // New Flow: Host registers session without WebRTC offers
    hostRegister(boardId: string, gameId: string, peerName: string, publicKey: string): boolean {
        logger.sig("Registering as host for board:", boardId);
        return this.send({
            type: 'hostRegister',
            boardId,
            gameId,
            peerName,
            publicKey
        });
    }

    // New Flow: Guest joins session
    guestJoin(boardId: string, peerName: string, publicKey: string, encryptionPublicKey?: string): boolean {
        logger.sig("Joining as guest for board:", boardId);
        return this.send({
            type: 'guestJoin',
            boardId,
            peerName,
            publicKey,
            encryptionPublicKey
        });
    }

    // New Flow: Host sends offer to specific guest
    hostOffer(targetConnectionId: string, guestPublicKey: string, offer: any, encryptionPublicKey?: string, iv?: string): boolean {
        logger.sig("Sending offer to guest:", targetConnectionId);
        return this.send({
            type: 'hostOffer',
            target: targetConnectionId,
            guestPublicKey,
            offer,
            peerName: this.peerName,
            publicKey: this.publicKey || undefined,
            encryptionPublicKey,
            iv,
            boardId: this.boardId
        });
    }

    // New Flow: Guest sends answer to host
    guestAnswer(targetConnectionId: string, publicKey: string, answer: any, iv?: string): boolean {
        logger.sig("Sending answer to host:", targetConnectionId);
        return this.send({
            type: 'guestAnswer',
            target: targetConnectionId,
            publicKey,
            answer,
            peerName: this.peerName,
            iv,
            boardId: this.boardId
        });
    }

    deleteOffer() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            logger.sig("Cannot delete offer: Signaling socket is not open.");
            return;
        }
        logger.sig("Deleting offer for game:", this.gameId, "board:", this.boardId);
        this.send({
            type: 'deleteOffer',
            gameId: this.gameId,
            ...(this.boardId ? { boardId: this.boardId } : {})
        });
    }

    private send(message: Partial<SignalingMessage>): boolean {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            logger.error("Signaling socket not open. State:", this.socket?.readyState);
            return false;
        }

        // AWS API Gateway REQUIRES the 'action' key to match the route 
        // if you are using custom routes like 'sendMessage'
        const payload = {
            action: 'sendMessage',
            ...message
        };

        logger.sig("Sending payload to AWS:", payload);
        this.socket.send(JSON.stringify(payload));
        return true;
    }

    disconnect(deleteOfferFirst: boolean = false) {
        if (deleteOfferFirst && this.isConnected) {
            this.deleteOffer();
        }
        this.socket?.close();
        this.socket = null;
    }

    get isConnected(): boolean {
        return !!this.socket && this.socket.readyState === WebSocket.OPEN;
    }
}
