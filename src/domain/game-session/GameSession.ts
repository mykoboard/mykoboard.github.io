import { LedgerEntry } from '@mykoboard/integration';

export interface GameParticipant {
    id: string;
    name: string;
    isYou: boolean;
    isHost: boolean;
    publicKey?: string;
}

export interface GameSession {
    gameId: string;
    boardId: string;
    playerName: string;
    lastPlayed: number;
    gameName: string;
    status: 'active' | 'finished';
    ledger: LedgerEntry[];
    participants?: GameParticipant[];
}

export interface HostedSession {
    boardId: string;
    gameId: string;
    createdAt: number;
    maxPlayers: number;
}
