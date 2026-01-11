import { createMachine, assign } from 'xstate';
import { Connection, ConnectionStatus } from '../lib/webrtc';
import { logger } from '../lib/logger';
import { createLobbyMessage, LedgerEntry } from '@mykoboard/integration';

interface LobbyContext {
    connections: Map<string, Connection>;
    playerStatuses: Map<string, 'lobby' | 'game'>;
    isInitiator: boolean;
    isGameStarted: boolean;
    isGameFinished: boolean;
    playerName: string;
    ledger: LedgerEntry[];
    pendingGuest: { id: string; name: string; answer: any; connection: Connection } | null;
    externalParticipants: { id: string; name: string; isHost: boolean }[];
    maxPlayers: number;
}

type LobbyEvent =
    | { type: 'HOST'; maxPlayers?: number }
    | { type: 'JOIN' }
    | { type: 'GOTO_LOBBY' }
    | { type: 'UPDATE_CONNECTION'; connection: Connection }
    | { type: 'SET_PLAYER_STATUS'; playerId: string; status: 'lobby' | 'game' }
    | { type: 'START_GAME' }
    | { type: 'GAME_STARTED' }
    | { type: 'BACK_TO_LOBBY' }
    | { type: 'CLOSE_SESSION' }
    | { type: 'REMOVE_PLAYER'; playerId: string }
    | { type: 'ADD_TO_LEDGER'; action: { type: string, payload: any } }
    | { type: 'SYNC_LEDGER'; ledger: LedgerEntry[] }
    | { type: 'PEER_DISCONNECTED'; connectionId: string }
    | { type: 'REQUEST_JOIN'; connectionId: string; peerName: string; answer: any; connection: Connection }
    | { type: 'ACCEPT_GUEST' }
    | { type: 'REJECT_GUEST' }
    | { type: 'CANCEL_SIGNALING'; connectionId: string }
    | { type: 'RESUME' }
    | { type: 'FINISH_GAME' }
    | { type: 'GAME_RESET' }
    | { type: 'RESET_GAME' }
    | { type: 'SYNC_PARTICIPANTS'; participants: { id: string, name: string, isHost: boolean }[] }
    | { type: 'LOAD_LEDGER'; ledger: LedgerEntry[] };

export const lobbyMachine = createMachine({
    types: {} as {
        context: LobbyContext;
        events: LobbyEvent;
        input: { playerName: string };
    },
    id: 'lobby',
    initial: 'selection',
    context: ({ input }) => ({
        connections: new Map<string, Connection>(),
        playerStatuses: new Map<string, 'lobby' | 'game'>(),
        isInitiator: false,
        isGameStarted: false,
        isGameFinished: false,
        playerName: input.playerName,
        ledger: [],
        pendingGuest: null,
        externalParticipants: [],
        maxPlayers: 2,
    }),
    on: {
        UPDATE_CONNECTION: {
            actions: ['updateConnection', 'syncConnection']
        },
        PEER_DISCONNECTED: {
            actions: ['updateConnectionStatus', 'removeConnection']
        },
        SET_PLAYER_STATUS: {
            actions: 'setPlayerStatus'
        },
        REMOVE_PLAYER: {
            actions: 'removePlayer'
        },
        SYNC_LEDGER: {
            actions: 'syncLedger'
        },
        LOAD_LEDGER: {
            actions: assign({ ledger: ({ event }) => event.ledger })
        },
        SYNC_PARTICIPANTS: {
            actions: assign({ externalParticipants: ({ event }) => event.participants })
        },
        BACK_TO_LOBBY: {
            target: '#discovery',
            actions: ['resetContext', 'clearPendingGuest']
        },
        CLOSE_SESSION: {
            target: '#selection',
            actions: ['resetContext', 'closeAllConnections', 'resetGameStarted', 'clearPendingGuest']
        },
        CANCEL_SIGNALING: {
            actions: 'removeConnection'
        }
    },
    states: {
        // selection of manual or auto signaling
        selection: {
            id: 'selection',
            on: {
                HOST: {
                    target: '#hosting',
                    actions: ['resetContext', assign({
                        isInitiator: true,
                        isGameFinished: false,
                        maxPlayers: ({ event }) => event.type === 'HOST' ? (event.maxPlayers || 2) : 2
                    })]
                },
                JOIN: {
                    target: '#joining',
                    actions: ['resetContext']
                },
                GOTO_LOBBY: '#discovery',
                RESUME: {
                    target: '#room',
                    actions: 'setGameStarted'
                }
            }
        },
        // discovery of available sessions when selection is auto signaling
        discovery: {
            id: 'discovery',
            on: {
                HOST: {
                    target: '#hosting',
                    actions: ['resetContext', assign({
                        isInitiator: true,
                        isGameFinished: false,
                        maxPlayers: ({ event }) => event.type === 'HOST' ? (event.maxPlayers || 2) : 2
                    })]
                },
                JOIN: {
                    target: '#joining',
                    actions: ['resetContext']
                },
                RESUME: {
                    target: '#room',
                    actions: 'setGameStarted'
                }
            }
        },
        hosting: {
            id: 'hosting',
            on: {
                CLOSE_SESSION: '#selection',
                REQUEST_JOIN: {
                    target: '#approving',
                    actions: assign({
                        pendingGuest: ({ event }) => ({
                            id: event.connectionId,
                            name: event.peerName,
                            answer: event.answer,
                            connection: event.connection
                        })
                    })
                }
            },
            always: [
                {
                    target: '#room',
                    guard: 'hasConnections'
                }
            ]
        },
        approving: {
            id: 'approving',
            on: {
                ACCEPT_GUEST: {
                    target: '#room',
                    actions: ['acceptGuest', 'clearPendingGuest']
                },
                REJECT_GUEST: {
                    target: '#hosting',
                    actions: ['rejectGuest', 'clearPendingGuest']
                },
                CLOSE_SESSION: '#selection',
            }
        },
        joining: {
            id: 'joining',
            on: {
                CLOSE_SESSION: '#selection',
            },
            always: [
                {
                    target: '#room',
                    guard: 'hasConnections'
                }
            ]
        },
        room: {
            id: 'room',
            initial: 'waiting',
            states: {
                waiting: {
                    always: [
                        {
                            target: 'game',
                            guard: ({ context }) => context.isGameStarted
                        }
                    ],
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
                        FINISH_GAME: {
                            target: 'finished',
                            actions: assign({ isGameFinished: true })
                        }
                    }
                },
                finished: {
                    on: {
                    }
                }
            },
            on: {
                CLOSE_SESSION: {
                    target: '#selection',
                    actions: 'closeAllConnections'
                },
                REQUEST_JOIN: {
                    target: '#approving',
                    actions: assign({
                        pendingGuest: ({ event }) => ({
                            id: event.connectionId,
                            name: event.peerName,
                            answer: event.answer,
                            connection: event.connection
                        })
                    })
                },
                GAME_STARTED: {
                    target: '.game',
                    actions: 'setGameStarted'
                },
                GAME_RESET: {
                    target: '.waiting',
                    actions: 'resetGameStarted'
                },
                RESET_GAME: {
                    target: '.waiting',
                    actions: ['resetGameStarted', 'broadcastResetGame']
                },
                CANCEL_SIGNALING: {
                    actions: 'removeConnection'
                }
            }
        }
    }
}, {
    actions: {
        setGameStarted: assign({ isGameStarted: true, isGameFinished: false }),
        resetGameStarted: assign({ isGameStarted: false, isGameFinished: false, ledger: [] }),
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

            const existing = context.connections.get(connection.id);
            if (existing) {
                const statusChanged = (existing as any)._lastKnownStatus !== connection.status;
                const signalChanged = (existing as any)._lastKnownSignal !== (connection.signal?.toString() || "");

                if (!statusChanged && !signalChanged) {
                    return context;
                }
            }

            // Update tracked values for next comparison
            (connection as any)._lastKnownStatus = connection.status;
            (connection as any)._lastKnownSignal = connection.signal?.toString() || "";

            const newConnections = new Map(context.connections);
            newConnections.set(connection.id, connection);

            // Initialize status if new
            const newStatuses = new Map(context.playerStatuses);
            if (!newStatuses.has(connection.id)) {
                newStatuses.set(connection.id, 'lobby');
            }

            return { connections: newConnections, playerStatuses: newStatuses };
        }),
        syncConnection: ({ context, event }) => {
            if (event.type !== 'UPDATE_CONNECTION') return;

            const connection = event.connection;

            // Only sync if we are host and connection just became connected
            if (context.isInitiator && connection.status === ConnectionStatus.connected) {
                // Check if we already synced this connection in this session
                if ((connection as any)._synced) return;
                (connection as any)._synced = true;

                logger.lobby('STATE', `Syncing new connection: ${connection.id}`);

                // CRITICAL: Always sync ledger first so the game state is ready
                connection.send(JSON.stringify(createLobbyMessage('SYNC_LEDGER', context.ledger)));

                // If game is already started, tell the newcomer
                if (context.isGameStarted) {
                    connection.send(JSON.stringify(createLobbyMessage('GAME_STARTED')));
                }
            }
        },
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
        broadcastResetGame: ({ context }) => {
            if (!context.isInitiator) return;
            context.connections.forEach(c => {
                if (c.status === ConnectionStatus.connected) {
                    c.send(JSON.stringify(createLobbyMessage('GAME_RESET')));
                }
            });
        },
        closeAllConnections: ({ context }) => {
            context.connections.forEach(c => c.close());
        },
        acceptGuest: ({ context }) => {
            if (context.pendingGuest) {
                logger.sig("Accepting guest:", context.pendingGuest.name);
                context.pendingGuest.connection.acceptAnswer(context.pendingGuest.answer);
            }
        },
        rejectGuest: ({ context }) => {
            if (context.pendingGuest) {
                logger.sig("Rejecting guest:", context.pendingGuest.name);
                context.pendingGuest.connection.close();
            }
        },
        resetContext: assign({
            connections: new Map<string, Connection>(),
            playerStatuses: new Map<string, 'lobby' | 'game'>(),
            ledger: [],
            isGameStarted: false,
            isGameFinished: false,
            isInitiator: false,
            maxPlayers: 2,
            pendingGuest: null,
            externalParticipants: []
        }),
        clearPendingGuest: assign({ pendingGuest: null })
    },
    guards: {
        hasConnections: ({ context }) => {
            return Array.from(context.connections.values()).some(
                c => c.status === ConnectionStatus.connected
            );
        }
    }
});
