export interface Participant {
    publicKey: string;
    name: string;
    status: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
    isHost: boolean;
}
