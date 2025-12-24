export interface PlayerInfo {
    id: string;
    name: string;
    status: 'lobby' | 'game';
    isConnected: boolean;
    isLocal: boolean;
    isHost: boolean;
}
