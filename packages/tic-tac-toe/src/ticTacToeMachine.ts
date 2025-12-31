import { createMachine, assign } from 'xstate';
import { Connection } from '@/lib/webrtc';

export type Player = 'X' | 'O';

interface GameContext {
    board: (Player | null)[];
    mySymbol: Player;
    opponentSymbol: Player;
    isInitiator: boolean;
    connections: Connection[];
}

type GameEvent =
    | { type: 'MOVE'; index: number }
    | { type: 'RECEIVE_MOVE'; index: number }
    | { type: 'RESET' }
    | { type: 'RECEIVE_RESET' }
    | { type: 'SYNC_STATE'; board: (Player | null)[] }
    | { type: 'UPDATE_CONNECTIONS'; connections: Connection[] };

export const ticTacToeMachine = createMachine({
    types: {} as {
        context: GameContext;
        events: GameEvent;
        input: { isInitiator: boolean };
    },
    id: 'ticTacToe',
    initial: 'deciding',
    context: ({ input }) => ({
        board: Array(9).fill(null),
        mySymbol: input.isInitiator ? 'X' : 'O',
        opponentSymbol: input.isInitiator ? 'O' : 'X',
        isInitiator: input.isInitiator,
        connections: [],
    }),
    states: {
        deciding: {
            always: [
                { target: 'playing.myTurn', guard: ({ context }) => context.isInitiator },
                { target: 'playing.opponentTurn' }
            ]
        },
        playing: {
            initial: 'decidingTurn',
            states: {
                decidingTurn: {
                    always: [
                        {
                            target: 'myTurn',
                            guard: ({ context }) => {
                                const moves = context.board.filter(Boolean).length;
                                const isXTurn = moves % 2 === 0;
                                return (isXTurn && context.mySymbol === 'X') || (!isXTurn && context.mySymbol === 'O');
                            }
                        },
                        { target: 'opponentTurn' }
                    ]
                },
                myTurn: {
                    on: {
                        MOVE: {
                            target: 'decidingTurn',
                            guard: ({ context, event }) => !context.board[event.index],
                            actions: ['makeMyMove', 'broadcastMove']
                        }
                    }
                },
                opponentTurn: {
                    on: {
                        RECEIVE_MOVE: {
                            target: 'decidingTurn',
                            actions: 'makeOpponentMove'
                        }
                    }
                }
            },
            always: [
                { target: 'won', guard: 'checkWinner' },
                { target: 'draw', guard: 'checkDraw' }
            ]
        },
        won: {
            on: {
                RESET: {
                    target: 'deciding',
                    actions: ['resetBoard', 'broadcastReset']
                },
                RECEIVE_RESET: {
                    target: 'deciding',
                    actions: 'resetBoard'
                }
            }
        },
        draw: {
            on: {
                RESET: {
                    target: 'deciding',
                    actions: ['resetBoard', 'broadcastReset']
                },
                RECEIVE_RESET: {
                    target: 'deciding',
                    actions: 'resetBoard'
                }
            }
        }
    },
    on: {
        UPDATE_CONNECTIONS: {
            actions: 'updateConnections'
        },
        SYNC_STATE: {
            target: '.playing.decidingTurn',
            actions: 'syncBoard'
        }
    }
}, {
    actions: {
        updateConnections: assign(({ event }) => {
            if (event.type !== 'UPDATE_CONNECTIONS') return {};
            return { connections: event.connections };
        }),
        makeMyMove: assign(({ context, event }) => {
            if (event.type !== 'MOVE') return {};
            const newBoard = [...context.board];
            newBoard[event.index] = context.mySymbol;
            return { board: newBoard };
        }),
        makeOpponentMove: assign(({ context, event }) => {
            if (event.type !== 'RECEIVE_MOVE') return {};
            const newBoard = [...context.board];
            newBoard[event.index] = context.opponentSymbol;
            return { board: newBoard };
        }),
        resetBoard: assign({
            board: () => Array(9).fill(null)
        }),
        syncBoard: assign(({ event }) => {
            if (event.type !== 'SYNC_STATE') return {};
            return { board: event.board };
        }),
        broadcastMove: ({ context, event }) => {
            if (event.type !== 'MOVE') return;
            context.connections.forEach(c => c.send(JSON.stringify({ namespace: 'game', type: 'MOVE', payload: { index: event.index } })));
        },
        broadcastReset: ({ context }) => {
            context.connections.forEach(c => c.send(JSON.stringify({ namespace: 'game', type: 'RESET' })));
        }
    },
    guards: {
        checkWinner: ({ context }) => !!calculateWinner(context.board),
        checkDraw: ({ context }) => !calculateWinner(context.board) && context.board.every(Boolean)
    }
});

export function calculateWinner(squares: (Player | null)[]): Player | null {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    return null;
}
