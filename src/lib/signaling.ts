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
    publicKey?: string;
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

    sendOffer(slots: SignalingSlot[], gameId: string, boardId: string, peerName: string): boolean {
        logger.sig("Broadcasting combined offer for game:", this.gameId, "board:", boardId, "slots:", slots.length);
        return this.send({
            type: 'offer',
            slots: slots,
            gameId: this.gameId,
            boardId: boardId,
            peerName: peerName,
            publicKey: this.publicKey || undefined
        });
    }

    requestOffers(): boolean {
        logger.sig("Requesting active offers for game:", this.gameId);
        return this.send({
            type: 'listOffers',
            gameId: this.gameId
        });
    }

    sendAnswer(targetWebSocketId: string, targetP2PId: string, signal: Signal, boardId?: string): boolean {
        logger.sig("Sending answer to host:", targetWebSocketId, "for P2P slot:", targetP2PId);
        return this.send({
            type: 'answer',
            target: targetWebSocketId,
            to: targetP2PId,
            answer: signal,
            peerName: this.peerName,
            boardId: boardId || this.boardId
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
