export interface Participant {
    id: string;
    name: string;
    status: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
    isHost: boolean;
    publicKey?: string;
}
