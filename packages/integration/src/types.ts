import { LedgerEntry } from './ledger';

export interface PlayerInfo {
    id: string;
    name: string;
    status: 'lobby' | 'game';
    isConnected: boolean;
    isLocal: boolean;
    isHost: boolean;
    publicKey?: string; // Public key for identity management
}

export interface SimpleConnection {
    id: string;
    send: (data: string) => void;
    addMessageListener: (callback: (data: string) => void) => void;
    removeMessageListener: (callback: (data: string) => void) => void;
}

export interface GameProps {
    connections: SimpleConnection[];
    playerNames: string[];
    playerInfos: PlayerInfo[];
    isInitiator: boolean;
    ledger: LedgerEntry[];
    onAddLedger: (action: { type: string, payload: any }) => void;
    onFinishGame: () => void;
}
