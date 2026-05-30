import { TopologyMode } from '@mykoboard/networking';
import type { Peer } from '@mykoboard/networking';

export interface INetworkManagerPort {
    readonly topologyMode: TopologyMode;
    
    // Commands
    setTopologyMode(mode: TopologyMode): void;
    broadcast(data: string | any): void;
    sendTo(targetPublicKey: string, data: string | any): void;
    connectToPeer(targetPublicKey: string, targetPlayerName: string): Promise<void>;
    
    // Queries
    getConnectedPeers(): Peer[];
    
    // Event listeners
    onPeerJoined(callback: (peer: Peer) => void): void;
    onPeerLeft(callback: (peer: Peer) => void): void;
    onMessage(callback: (peerId: string, data: any) => void): void;
}
