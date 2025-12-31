export type MessageNamespace = 'lobby' | 'game';

export interface BaseMessage {
    namespace: MessageNamespace;
    type: string;
    payload?: any;
}

export interface LobbyMessage extends BaseMessage {
    namespace: 'lobby';
    type: 'START_GAME' | 'GAME_STARTED' | 'SYNC_PLAYER_STATUS' | 'SYNC_LEDGER' | 'GAME_RESET' | 'NEW_BOARD' | 'SYNC_PARTICIPANTS';
}

export interface GameMessage extends BaseMessage {
    namespace: 'game';
}

export const createLobbyMessage = (type: LobbyMessage['type'], payload?: any): LobbyMessage => ({
    namespace: 'lobby',
    type,
    payload
});

export const createGameMessage = (type: string, payload?: any): GameMessage => ({
    namespace: 'game',
    type,
    payload
});

export function isLobbyMessage(msg: any): msg is LobbyMessage {
    return msg && msg.namespace === 'lobby';
}

export function isGameMessage(msg: any): msg is GameMessage {
    return msg && msg.namespace === 'game';
}
