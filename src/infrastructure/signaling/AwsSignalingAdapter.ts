import { ISignalingPort } from '../../application/ports/ISignalingPort';
import { logger } from '../../lib/logger';

export class AwsSignalingAdapter implements ISignalingPort {
    private socket: WebSocket | null = null;
    private onMessageCallback: ((msg: any) => void) | null = null;
    private pingInterval: any = null;

    async connect(token: string, publicKey?: string, signature?: string) {
        const url = import.meta.env.VITE_SIGNALING_SERVER_URL || 'wss://pebsg4v5yk.execute-api.eu-central-1.amazonaws.com/production';

        const params = new URLSearchParams();
        params.append('x-api-key', token);
        if (publicKey) params.append('x-pubkey', publicKey);
        if (signature) params.append('x-sig', signature);

        const SIGNALING_SERVER_URL = `${url}?${params.toString()}`;

        return new Promise<void>((resolve, reject) => {
            logger.sig(`Connecting to signaling server: ${SIGNALING_SERVER_URL}`);
            this.socket = new WebSocket(SIGNALING_SERVER_URL);

            this.socket.onopen = () => {
                this.pingInterval = setInterval(() => {
                    this.send({ type: 'ping' });
                }, 30000);
                resolve();
            };

            this.socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (this.onMessageCallback) this.onMessageCallback(msg);
                } catch (e) {
                    logger.error("Failed to parse signaling message", e);
                }
            };

            this.socket.onclose = () => {
                if (this.pingInterval) {
                   clearInterval(this.pingInterval);
                   this.pingInterval = null;
                }
                this.socket = null;
            };

            this.socket.onerror = (err) => {
                reject(err);
            };
        });
    }

    hostRegister(boardId: string, gameId: string, peerName: string, publicKey: string): boolean {
        return this.send({
            type: 'hostRegister',
            boardId,
            gameId,
            peerName,
            publicKey
        });
    }

    guestJoin(boardId: string, peerName: string, publicKey: string, encryptionPublicKey?: string): boolean {
        return this.send({
            type: 'guestJoin',
            boardId,
            peerName,
            publicKey,
            encryptionPublicKey
        });
    }

    hostOffer(target: string, guestPublicKey: string, offer: any, encryptionPublicKey?: string, iv?: string): boolean {
        return this.send({
            type: 'hostOffer',
            target,
            guestPublicKey,
            offer,
            encryptionPublicKey,
            iv
        });
    }

    guestAnswer(target: string, publicKey: string, answer: any, iv?: string): boolean {
        return this.send({
            type: 'guestAnswer',
            target,
            publicKey,
            answer,
            iv
        });
    }

    deleteOffer() {
        this.send({ type: 'deleteOffer' });
    }

    disconnect(deleteOfferFirst: boolean = false) {
        if (deleteOfferFirst) this.deleteOffer();
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        this.socket?.close();
        this.socket = null;
    }

    get isConnected(): boolean {
        return !!this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    onMessage(callback: (msg: any) => void): void {
        this.onMessageCallback = callback;
    }

    private send(message: any): boolean {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            if (message.type !== 'ping') logger.sig('Signaling suppressed: socket not connected');
            return false;
        }
        this.socket.send(JSON.stringify({
            action: 'sendMessage',
            ...message
        }));
        return true;
    }
}
