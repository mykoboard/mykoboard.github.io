import { createMachine, assign } from 'xstate';
import { Connection, ConnectionStatus } from '../lib/webrtc';
import { createLobbyMessage, isLobbyMessage } from '../lib/network';
import { Ledger, LedgerEntry } from '../lib/ledger';

interface LobbyContext {
    connections: Map<string, Connection>;
    playerStatuses: Map<string, 'lobby' | 'game'>;
    isInitiator: boolean;
    isGameStarted: boolean;
    playerName: string;
    ledger: LedgerEntry[];
}

type LobbyEvent =
    | { type: 'HOST' }
    | { type: 'JOIN' }
    | { type: 'UPDATE_CONNECTION'; connection: Connection }
    | { type: 'SET_PLAYER_STATUS'; playerId: string; status: 'lobby' | 'game' }
    | { type: 'START_GAME' }
    | { type: 'GAME_STARTED' }
    | { type: 'BACK_TO_LOBBY' }
    | { type: 'CLOSE_SESSION' }
    | { type: 'REMOVE_PLAYER'; playerId: string }
    | { type: 'ADD_TO_LEDGER'; action: { type: string, payload: any } }
    | { type: 'SYNC_LEDGER'; ledger: LedgerEntry[] }
    | { type: 'PEER_DISCONNECTED'; connectionId: string };

export const lobbyMachine = createMachine({
    types: {} as {
        context: LobbyContext;
        events: LobbyEvent;
        input: { playerName: string };
    },
    id: 'lobby',
    initial: 'idle',
    context: ({ input }) => ({
        connections: new Map<string, Connection>(),
        playerStatuses: new Map<string, 'lobby' | 'game'>(),
        isInitiator: false,
        isGameStarted: false,
        playerName: input.playerName,
        ledger: [],
    }),
    on: {
        UPDATE_CONNECTION: {
            actions: 'updateConnection'
        },
        PEER_DISCONNECTED: {
            actions: 'updateConnectionStatus'
        },
        SET_PLAYER_STATUS: {
            actions: 'setPlayerStatus'
        },
        REMOVE_PLAYER: {
            actions: 'removePlayer'
        },
        SYNC_LEDGER: {
            actions: 'syncLedger'
        }
    },
    states: {
        idle: {
            on: {
                HOST: {
                    target: 'hosting',
                    actions: assign({ isInitiator: true })
                },
                JOIN: {
                    target: 'joining',
                    actions: assign({ isInitiator: false })
                }
            }
        },
        hosting: {
            on: {
                CLOSE_SESSION: 'idle'
            },
            always: [
                {
                    target: 'room',
                    guard: 'hasConnections'
                }
            ]
        },
        joining: {
            on: {
                CLOSE_SESSION: 'idle'
            },
            always: [
                {
                    target: 'room',
                    guard: 'hasConnections'
                }
            ]
        },
        room: {
            initial: 'lobby',
            states: {
                lobby: {
                    on: {
                        START_GAME: {
                            target: 'game',
                            actions: ['setGameStarted', 'broadcastStartGame']
                        },
                        GAME_STARTED: {
                            target: 'game',
                            actions: 'setGameStarted'
                        }
                    }
                },
                game: {
                    on: {
                        BACK_TO_LOBBY: 'lobby'
                    }
                }
            },
            on: {
                CLOSE_SESSION: {
                    target: 'idle',
                    actions: 'closeAllConnections'
                },
                GAME_STARTED: {
                    target: '.game',
                    actions: 'setGameStarted'
                }
            }
        }
    }
}, {
    actions: {
        setGameStarted: assign({ isGameStarted: true }),
        setPlayerStatus: assign(({ context, event }) => {
            if (event.type !== 'SET_PLAYER_STATUS') return context;
            const newStatuses = new Map(context.playerStatuses);
            newStatuses.set(event.playerId, event.status);
            return { playerStatuses: newStatuses };
        }),
        updateConnectionStatus: assign(({ context, event }) => {
            if (event.type !== 'PEER_DISCONNECTED') return context;
            const newConnections = new Map(context.connections);
            const conn = newConnections.get(event.connectionId);
            if (conn) {
                conn.status = ConnectionStatus.closed;
            }
            return { connections: newConnections };
        }),
        updateConnection: assign(({ context, event }) => {
            if (event.type !== 'UPDATE_CONNECTION') return context;

            const connection = event.connection;

            // If it's a closed connection and we don't already have it, ignore it
            // This prevents removed players from being re-added by their own close() callback
            if (connection.status === ConnectionStatus.closed && !context.connections.has(connection.id)) {
                return context;
            }

            // If host and game started, notify new peer and sync ledger
            if (context.isInitiator && connection.status === ConnectionStatus.connected) {
                if (context.isGameStarted) {
                    connection.send(JSON.stringify(createLobbyMessage('GAME_STARTED')));
                }
                // Always sync ledger when someone connects (it might be empty if game hasn't started)
                connection.send(JSON.stringify(createLobbyMessage('SYNC_LEDGER', context.ledger)));
            }

            const newConnections = new Map(context.connections);
            newConnections.set(connection.id, connection);

            // Initialize status if new
            const newStatuses = new Map(context.playerStatuses);
            if (!newStatuses.has(connection.id)) {
                newStatuses.set(connection.id, 'lobby');
            }

            return { connections: newConnections, playerStatuses: newStatuses };
        }),
        removeConnection: assign(({ context, event }) => {
            if (event.type !== 'PEER_DISCONNECTED') return context;
            const newConnections = new Map(context.connections);
            newConnections.delete(event.connectionId);
            return { connections: newConnections };
        }),
        removePlayer: assign(({ context, event }) => {
            if (event.type !== 'REMOVE_PLAYER') return context;
            const newConnections = new Map(context.connections);
            const connection = newConnections.get(event.playerId);
            if (connection) {
                connection.close();
                newConnections.delete(event.playerId);
            }
            const newStatuses = new Map(context.playerStatuses);
            newStatuses.delete(event.playerId);
            return { connections: newConnections, playerStatuses: newStatuses };
        }),
        syncLedger: assign(({ context, event }) => {
            if (event.type !== 'SYNC_LEDGER') return context;
            return { ledger: event.ledger };
        }),
        broadcastStartGame: ({ context }) => {
            if (!context.isInitiator) return;
            context.connections.forEach(c => {
                if (c.status === ConnectionStatus.connected) {
                    c.send(JSON.stringify(createLobbyMessage('START_GAME')));
                }
            });
        },
        closeAllConnections: ({ context }) => {
            context.connections.forEach(c => c.close());
        }
    },
    guards: {
        hasConnections: ({ context }) => {
            return Array.from(context.connections.values()).some(
                c => c.status === ConnectionStatus.connected
            );
        }
    }
});
