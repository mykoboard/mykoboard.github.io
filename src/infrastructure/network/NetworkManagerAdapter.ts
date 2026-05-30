import { INetworkManagerPort } from '../../application/ports/INetworkManagerPort';
import { NetworkManager, TopologyMode, Peer, PeerMessageEvent, PeerStatusEvent } from '@mykoboard/networking';

export class NetworkManagerAdapter implements INetworkManagerPort {
    
    constructor(private networkManager: NetworkManager) {
    }

    get topologyMode(): TopologyMode {
        return this.networkManager.topologyMode;
    }

    setTopologyMode(mode: TopologyMode): void {
        this.networkManager.setTopologyMode(mode);
    }

    broadcast(data: string | any): void {
        this.networkManager.broadcast(data);
    }

    sendTo(targetPublicKey: string, data: string | any): void {
        this.networkManager.sendTo(targetPublicKey, data);
    }

    async connectToPeer(targetPublicKey: string, targetPlayerName: string): Promise<void> {
        await this.networkManager.connectToPeer(targetPublicKey, targetPlayerName);
    }

    getConnectedPeers(): Peer[] {
        return this.networkManager.getConnectedPeers();
    }

    onPeerJoined(callback: (peer: Peer) => void): void {
        this.networkManager.addEventListener('peerstatus', (e: Event) => {
            const statusEvent = e as PeerStatusEvent;
            if (statusEvent.peer.status === 'connected') { // 'connected' is PeerStatus.connected
                callback(statusEvent.peer);
            }
        });
    }

    onPeerLeft(callback: (peer: Peer) => void): void {
        this.networkManager.addEventListener('peerstatus', (e: Event) => {
            const statusEvent = e as PeerStatusEvent;
            if (statusEvent.peer.status === 'closed' || statusEvent.peer.status === 'failed') {
                callback(statusEvent.peer);
            }
        });
    }

    onMessage(callback: (peerId: string, data: any) => void): void {
        this.networkManager.addEventListener('message', (e: Event) => {
            const msgEvent = e as PeerMessageEvent;
            callback(msgEvent.peerId, msgEvent.data);
        });
    }
}
