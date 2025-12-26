import { Connection } from "./webrtc";
import { LedgerEntry } from "./ledger";

export interface PlayerInfo {
    id: string;
    name: string;
    status: 'lobby' | 'game';
    isConnected: boolean;
    isLocal: boolean;
    isHost: boolean;
}

export interface GameProps {
    connections: Connection[];
    playerNames: string[];
    playerInfos: PlayerInfo[];
    isInitiator: boolean;
    ledger: LedgerEntry[];
    onAddLedger: (action: { type: string, payload: any }) => void;
    onFinishGame: () => void;
}
