import { createMachine, assign } from 'xstate';
import { Connection, ConnectionStatus } from '../lib/webrtc';
import { logger } from '../lib/logger';
import { LedgerEntry } from '@mykoboard/integration';

interface BoardContext {
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
    boardId: string;
    topologyMode: 'star' | 'mesh';
    topologyMap: Map<string, string[]>;
}

type BoardEvent =
    | { type: 'HOST'; maxPlayers?: number; boardId: string }
    | { type: 'JOIN'; boardId: string }
    | { type: 'UPDATE_CONNECTION'; connection: Connection }
    | { type: 'SET_PLAYER_STATUS'; playerId: string; status: 'lobby' | 'game' }
    | { type: 'START_GAME' }
    | { type: 'GAME_STARTED' }
    | { type: 'CLOSE_SESSION' }
    | { type: 'REMOVE_PLAYER'; playerId: string }
    | { type: 'SYNC_LEDGER'; ledger: LedgerEntry[] }
    | { type: 'PEER_DISCONNECTED'; connectionId: string }
    | { type: 'REQUEST_JOIN'; connectionId: string; peerName: string; answer: any; connection: Connection }
    | { type: 'ACCEPT_GUEST' }
    | { type: 'REJECT_GUEST' }
    | { type: 'FINISH_GAME' }
    | { type: 'RESET_GAME' }
    | { type: 'SYNC_PARTICIPANTS'; participants: { id: string, name: string, isHost: boolean }[]; topologyMode?: 'star' | 'mesh' }
    | { type: 'LOAD_LEDGER'; ledger: LedgerEntry[] }
    | { type: 'GAME_RESET' }
    | { type: 'SET_TOPOLOGY_MODE'; mode: 'star' | 'mesh' }
    | { type: 'UPDATE_TOPOLOGY'; peerId: string; connections: string[] };

export const boardMachine = createMachine({
    types: {} as {
        context: BoardContext;
        events: BoardEvent;
        input: { playerName: string; boardId?: string; isInitiator?: boolean; maxPlayers?: number };
    },
    id: 'board',
    initial: 'idle',
    context: ({ input }) => ({
        connections: new Map<string, Connection>(),
        playerStatuses: new Map<string, 'lobby' | 'game'>(),
        isInitiator: input.isInitiator || false,
        isGameStarted: false,
        isGameFinished: false,
        playerName: input.playerName,
        ledger: [],
        pendingGuest: null,
        externalParticipants: [],
        maxPlayers: input.maxPlayers || 2,
        boardId: input.boardId || '',
        topologyMode: 'star',
        topologyMap: new Map<string, string[]>(),
    }),
    states: {
        idle: {
            on: {
                HOST: {
                    target: 'hosting',
                    actions: assign({
                        isInitiator: true,
                        maxPlayers: ({ event }) => event.maxPlayers || 2,
                        boardId: ({ event }) => event.boardId
                    })
                },
                JOIN: {
                    target: 'joining',
                    actions: assign({
                        isInitiator: false,
                        boardId: ({ event }) => event.boardId
                    })
                }
            }
        },
        hosting: {
            on: {
                REQUEST_JOIN: {
                    target: 'approving',
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
                { target: 'preparation', guard: 'hasConnections' }
            ]
        },
        joining: {
            always: [
                { target: 'preparation', guard: 'hasConnections' }
            ]
        },
        approving: {
            on: {
                ACCEPT_GUEST: {
                    target: 'preparation',
                    actions: ['acceptGuest', 'clearPendingGuest']
                },
                REJECT_GUEST: {
                    target: 'hosting',
                    actions: ['rejectGuest', 'clearPendingGuest']
                }
            }
        },
        preparation: {
            on: {
                START_GAME: {
                    target: 'playing',
                    actions: ['setGameStarted', 'broadcastStartGame']
                },
                GAME_STARTED: {
                    target: 'playing',
                    actions: 'setGameStarted'
                },
                REQUEST_JOIN: {
                    target: 'approving',
                    actions: assign({
                        pendingGuest: ({ event }) => ({
                            id: event.connectionId,
                            name: event.peerName,
                            answer: event.answer,
                            connection: event.connection
                        })
                    })
                }
            }
        },
        playing: {
            on: {
                FINISH_GAME: {
                    target: 'finished',
                    actions: assign({ isGameFinished: true })
                }
            }
        },
        finished: {
            on: {
                RESET_GAME: {
                    target: 'preparation',
                    actions: ['resetGameStarted', 'broadcastResetGame']
                }
            }
        }
    },
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
            actions: assign(({ event }) => ({
                externalParticipants: event.participants,
                topologyMode: event.topologyMode || 'star',
                topologyMap: (event as any).topologyMap ? new Map(Object.entries((event as any).topologyMap)) : undefined
            }))
        },
        UPDATE_TOPOLOGY: {
            actions: 'updateTopology'
        },
        GAME_STARTED: {
            actions: 'setGameStarted'
        },
        GAME_RESET: {
            actions: 'resetGameStarted'
        },
        CLOSE_SESSION: {
            target: '.idle',
            actions: ['resetContext', 'closeAllConnections']
        },
        SET_TOPOLOGY_MODE: {
            actions: assign({ topologyMode: ({ event }) => event.mode })
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

            if (connection.status === ConnectionStatus.closed && !context.connections.has(connection.id)) {
                return context;
            }

            const existing = context.connections.get(connection.id);
            if (existing) {
                // If the incoming connection is the SAME instance, we can't rely on comparing 
                // it to 'existing'. Instead, we check if the values have changed relative 
                // to what the Machine previously recorded.
                const statusChanged = (existing as any)._lastKnownStatus !== connection.status;
                const signalChanged = (existing as any)._lastKnownSignal !== (connection.signal?.toString() || "");
                const iceGatheringChanged = (existing as any)._lastKnownIceGathering !== (connection as any).iceGatheringState;
                const identityChanged = (existing as any)._lastKnownRemotePublicKey !== connection.remotePublicKey;

                if (!statusChanged && !signalChanged && !iceGatheringChanged && !identityChanged) {
                    return context;
                }
            }

            // Record the NEW state BEFORE updating the context
            const connectionProxy = (connection as any);
            connectionProxy._lastKnownStatus = connection.status;
            connectionProxy._lastKnownSignal = connection.signal?.toString() || "";
            connectionProxy._lastKnownIceGathering = connectionProxy.iceGatheringState;
            connectionProxy._lastKnownRemotePublicKey = connection.remotePublicKey;

            const newConnections = new Map(context.connections);
            newConnections.set(connection.id, connection);

            const newStatuses = new Map(context.playerStatuses);
            if (!newStatuses.has(connection.id)) {
                newStatuses.set(connection.id, 'lobby');
            }

            return { connections: newConnections, playerStatuses: newStatuses };
        }),
        syncConnection: ({ context, event }) => {
            if (event.type !== 'UPDATE_CONNECTION') return;

            const connection = event.connection;

            if (context.isInitiator && connection.status === ConnectionStatus.connected) {
                if ((connection as any)._synced) return;
                (connection as any)._synced = true;

                logger.lobby('STATE', `Syncing new connection: ${connection.id}`);
                connection.send(JSON.stringify({
                    namespace: 'game',
                    type: 'SYNC_LEDGER',
                    payload: context.ledger
                }));

                if (context.isGameStarted) {
                    connection.send(JSON.stringify({
                        namespace: 'game',
                        type: 'GAME_STARTED'
                    }));
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
                    c.send(JSON.stringify({
                        namespace: 'game',
                        type: 'START_GAME'
                    }));
                }
            });
        },
        broadcastResetGame: ({ context }) => {
            if (!context.isInitiator) return;
            context.connections.forEach(c => {
                if (c.status === ConnectionStatus.connected) {
                    c.send(JSON.stringify({
                        namespace: 'game',
                        type: 'GAME_RESET'
                    }));
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
        updateTopology: assign(({ context, event }) => {
            if (event.type !== 'UPDATE_TOPOLOGY') return context;
            const newMap = new Map(context.topologyMap);
            newMap.set(event.peerId, event.connections);
            return { topologyMap: newMap };
        }),
        rejectGuest: ({ context }) => {
            if (context.pendingGuest) {
                logger.sig("Rejecting guest:", context.pendingGuest.name);
                context.pendingGuest.connection.close();
            }
        },
        resetContext: assign(({ context }) => ({
            connections: new Map<string, Connection>(),
            playerStatuses: new Map<string, 'lobby' | 'game'>(),
            ledger: [],
            isGameStarted: false,
            isGameFinished: false,
            isInitiator: false,
            maxPlayers: context.maxPlayers,
            pendingGuest: null,
            externalParticipants: [],
            boardId: '',
            topologyMode: 'star',
            topologyMap: new Map<string, string[]>()
        })),
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
