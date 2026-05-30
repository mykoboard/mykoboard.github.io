import { Connection, ConnectionMessageEvent, ConnectionStatusEvent, ConnectionSignalEvent } from './Connection.ts';
import { Peer, PeerStatus } from './types.ts';
import { ISignalingAdapter } from './ISignalingAdapter.ts';

export type TopologyMode = 'star' | 'mesh';

export class PeerMessageEvent extends Event {
    constructor(public readonly peerId: string, public readonly data: any) {
        super('message');
    }
}

export class PeerStatusEvent extends Event {
    constructor(public readonly peer: Peer) {
        super('peerstatus');
    }
}

export class NetworkManager extends EventTarget {
    private connections = new Map<string, Connection>();
    private pendingConnections = new Map<string, Connection>();
    
    public topologyMode: TopologyMode = 'star';
    
    constructor(
        private signalingAdapter: ISignalingAdapter,
        private localPlayerName: string,
        public readonly localPublicKey: string,
        public isInitiator: boolean
    ) {
        super();
        this.setupSignalingListeners();
    }

    private setupSignalingListeners() {
        this.signalingAdapter.addEventListener('offer', async (e: Event) => {
            const event = e as CustomEvent<{ sourcePublicKey: string; offer: string; peerName: string; targetPublicKey: string }>;
            if (event.detail.targetPublicKey !== this.localPublicKey) return;

            const connection = new Connection();
            this.attachConnectionListeners(connection);
            
            // For P2P we might need to route this properly. 
            // In Mesh topology, an offer can arrive from a guest to a guest.
            await connection.acceptOffer(event.detail.offer, this.localPlayerName, this.localPublicKey);
            this.pendingConnections.set(event.detail.sourcePublicKey, connection);
        });

        this.signalingAdapter.addEventListener('answer', async (e: Event) => {
            const event = e as CustomEvent<{ sourcePublicKey: string; answer: string; peerName: string; targetPublicKey: string }>;
            if (event.detail.targetPublicKey !== this.localPublicKey) return;

            const connection = this.pendingConnections.get(event.detail.sourcePublicKey);
            if (connection) {
                await connection.acceptAnswer(event.detail.answer);
                this.pendingConnections.delete(event.detail.sourcePublicKey);
            }
        });
    }

    private attachConnectionListeners(connection: Connection) {
        connection.addEventListener('message', (e: Event) => {
            const msgEvent = e as ConnectionMessageEvent;
            
            // Handle internal topology gossip here if it's a topology message
            try {
                const parsed = JSON.parse(msgEvent.data);
                if (parsed.namespace === 'player' && parsed.type === 'REQUEST_P2P_OFFER') {
                    this.handleP2POfferRequest(parsed.payload);
                    return;
                }
            } catch {}

            // Dispatch to application
            if (connection.remotePublicKey) {
                this.dispatchEvent(new PeerMessageEvent(connection.remotePublicKey, msgEvent.data));
            }
        });

        connection.addEventListener('statuschange', (e: Event) => {
            const statusEvent = e as ConnectionStatusEvent;
            if (statusEvent.status === PeerStatus.connected && connection.remotePublicKey) {
                this.connections.set(connection.remotePublicKey, connection);
                if (this.topologyMode === 'mesh') this.negotiateMesh();
            } else if (statusEvent.status === PeerStatus.closed || statusEvent.status === PeerStatus.failed) {
                if (connection.remotePublicKey) this.connections.delete(connection.remotePublicKey);
            }
            this.dispatchEvent(new PeerStatusEvent(connection));
        });

        connection.addEventListener('signal', (e: Event) => {
            const signalEvent = e as ConnectionSignalEvent;
            if (connection.status === PeerStatus.started && connection.remotePublicKey) {
                this.signalingAdapter.sendOffer(
                    connection.remotePublicKey, 
                    signalEvent.signal, 
                    this.localPlayerName, 
                    this.localPublicKey
                );
            } else if (connection.status === PeerStatus.answered && connection.remotePublicKey) {
                this.signalingAdapter.sendAnswer(
                    connection.remotePublicKey, 
                    signalEvent.signal, 
                    this.localPlayerName, 
                    this.localPublicKey
                );
            }
        });
    }

    public async connectToPeer(targetPublicKey: string, targetPlayerName: string) {
        if (this.connections.has(targetPublicKey) || this.pendingConnections.has(targetPublicKey)) return;
        
        const connection = new Connection();
        this.attachConnectionListeners(connection);
        connection.remotePublicKey = targetPublicKey;
        connection.remotePlayerName = targetPlayerName;
        
        this.pendingConnections.set(targetPublicKey, connection);
        connection.openDataChannel();
        await connection.prepareOfferSignal(this.localPlayerName, this.localPublicKey);
    }

    public broadcast(data: string | any) {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        for (const conn of this.connections.values()) {
            if (conn.status === PeerStatus.connected) {
                if (this.topologyMode === 'star' && !this.isInitiator) {
                    if (conn.isHostConnection) conn.send(payload);
                } else {
                    conn.send(payload);
                }
            }
        }
    }

    public sendTo(targetPublicKey: string, data: string | any) {
        const conn = this.connections.get(targetPublicKey);
        if (conn && conn.status === PeerStatus.connected) {
            conn.send(typeof data === 'string' ? data : JSON.stringify(data));
        }
    }

    public getConnectedPeers(): Peer[] {
        return Array.from(this.connections.values());
    }

    public setTopologyMode(mode: TopologyMode) {
        this.topologyMode = mode;
        if (mode === 'mesh') this.negotiateMesh();
    }

    private negotiateMesh() {
        if (!this.isInitiator || this.topologyMode !== 'mesh') return;
        
        const peers = Array.from(this.connections.values());
        for (let i = 0; i < peers.length; i++) {
            for (let j = i + 1; j < peers.length; j++) {
                const p1 = peers[i];
                const p2 = peers[j];
                if (p1.remotePublicKey && p2.remotePublicKey) {
                    // Send a command to p1 to connect to p2
                    p1.send(JSON.stringify({
                        namespace: 'player',
                        type: 'REQUEST_P2P_OFFER',
                        payload: { targetPublicKey: p2.remotePublicKey, targetPlayerName: p2.remotePlayerName }
                    }));
                }
            }
        }
    }

    private handleP2POfferRequest(payload: any) {
        const { targetPublicKey, targetPlayerName } = payload;
        // As a guest, we received an instruction from the host to connect to another guest
        if (!this.isInitiator && targetPublicKey) {
            this.connectToPeer(targetPublicKey, targetPlayerName || 'Guest');
        }
    }
}
