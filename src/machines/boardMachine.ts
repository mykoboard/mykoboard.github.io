import { createMachine, assign } from 'xstate';
import { LedgerEntry } from '@mykoboard/integration';
import { Participant } from '../domain/game-session/Participant';

interface BoardContext {
    participants: Map<string, Participant>;
    playerStatuses: Map<string, 'lobby' | 'game'>;
    isInitiator: boolean;
    isGameStarted: boolean;
    isGameFinished: boolean;
    playerName: string;
    ledger: LedgerEntry[];
    pendingGuest: { id: string; name: string; answer: any } | null;
    externalParticipants: { id: string; name: string; isHost: boolean }[];
    maxPlayers: number;
    boardId: string;
    topologyMode: 'star' | 'mesh';
    topologyMap: Map<string, string[]>;
}

type BoardEvent =
    | { type: 'HOST'; maxPlayers?: number; boardId: string }
    | { type: 'JOIN'; boardId: string }
    | { type: 'UPDATE_PARTICIPANT'; participant: Participant }
    | { type: 'SET_PLAYER_STATUS'; playerId: string; status: 'lobby' | 'game' }
    | { type: 'START_GAME' }
    | { type: 'GAME_STARTED' }
    | { type: 'CLOSE_SESSION' }
    | { type: 'REMOVE_PLAYER'; playerId: string }
    | { type: 'SYNC_LEDGER'; ledger: LedgerEntry[] }
    | { type: 'PEER_DISCONNECTED'; connectionId: string }
    | { type: 'REQUEST_JOIN'; connectionId: string; peerName: string; answer: any }
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
        participants: new Map<string, Participant>(),
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
                            answer: event.answer
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
                            answer: event.answer
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
        UPDATE_PARTICIPANT: {
            actions: ['updateParticipant', 'syncParticipant']
        },
        PEER_DISCONNECTED: {
            actions: ['updateParticipantStatus', 'removeParticipant']
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
            actions: ['resetContext', 'closeAllParticipants']
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
        updateParticipantStatus: assign(({ context, event }) => {
            if (event.type !== 'PEER_DISCONNECTED') return context;
            const newParticipants = new Map(context.participants);
            const p = newParticipants.get(event.connectionId);
            if (p) {
                p.status = 'closed';
            }
            return { participants: newParticipants };
        }),
        updateParticipant: assign(({ context, event }) => {
            if (event.type !== 'UPDATE_PARTICIPANT') return context;

            const participant = event.participant;

            const newParticipants = new Map(context.participants);
            newParticipants.set(participant.id, participant);

            const newStatuses = new Map(context.playerStatuses);
            if (!newStatuses.has(participant.id)) {
                newStatuses.set(participant.id, 'lobby');
            }

            return { participants: newParticipants, playerStatuses: newStatuses };
        }),
        syncParticipant: () => {
             // Side effect to be handled by application layer/listener
             // This previously called connection.send()
        },
        removeParticipant: assign(({ context, event }) => {
            if (event.type !== 'PEER_DISCONNECTED') return context;
            const newParticipants = new Map(context.participants);
            newParticipants.delete(event.connectionId);
            return { participants: newParticipants };
        }),
        removePlayer: assign(({ context, event }) => {
            if (event.type !== 'REMOVE_PLAYER') return context;
            const newParticipants = new Map(context.participants);
            newParticipants.delete(event.playerId);
            const newStatuses = new Map(context.playerStatuses);
            newStatuses.delete(event.playerId);
            return { participants: newParticipants, playerStatuses: newStatuses };
        }),
        syncLedger: assign(({ context, event }) => {
            if (event.type !== 'SYNC_LEDGER') return context;
            return { ledger: event.ledger };
        }),
        broadcastStartGame: () => {
             // Side effect to be handled by application layer/listener
        },
        broadcastResetGame: () => {
             // Side effect to be handled by application layer/listener
        },
        closeAllParticipants: () => {
             // Side effect to be handled by application layer/listener
        },
        acceptGuest: () => {
             // Side effect to be handled by application layer/listener
        },
        updateTopology: assign(({ context, event }) => {
            if (event.type !== 'UPDATE_TOPOLOGY') return context;
            const newMap = new Map(context.topologyMap);
            newMap.set(event.peerId, event.connections);
            return { topologyMap: newMap };
        }),
        rejectGuest: () => {
             // Side effect to be handled by application layer/listener
        },
        resetContext: assign(({ context }) => ({
            participants: new Map<string, Participant>(),
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
            return Array.from(context.participants.values()).some(
                p => p.status === 'connected'
            );
        }
    }
});
