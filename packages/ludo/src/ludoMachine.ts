import { createMachine, assign } from 'xstate';
import { LedgerEntry } from '@mykoboard/integration';

export type Color = 'red' | 'green' | 'yellow' | 'blue';

export interface Piece {
    id: string;
    color: Color;
    status: 'base' | 'track' | 'homePath' | 'finished';
    position: number; // 0-51 for track, 0-4 for homePath
}

export interface Player {
    id: string;
    name: string;
    color: Color;
}

interface LudoContext {
    players: Player[];
    currentPlayerIndex: number;
    pieces: Piece[];
    diceValue: number | null;
    isInitiator: boolean;
    winners: string[]; // List of player IDs who finished
    rollsInTurn: number;
    lastRoll: number | null;
    ledger?: LedgerEntry[];
}

type LudoEvent =
    | { type: 'ROLL_DICE'; value: number }
    | { type: 'MOVE_PIECE'; pieceId: string }
    | { type: 'SYNC_STATE'; context: Partial<LudoContext> }
    | { type: 'RESET' };

const START_OFFSETS: Record<Color, number> = {
    yellow: 40,
    green: 1,
    blue: 27,
    red: 14
};

const COLORS: Color[] = ['yellow', 'green', 'blue', 'red'];

export const createLudoPieces = (players: Player[]): Piece[] => {
    const pieces: Piece[] = [];
    players.forEach(p => {
        for (let i = 0; i < 4; i++) {
            pieces.push({
                id: `${p.color}-${i}`,
                color: p.color,
                status: 'base',
                position: 0
            });
        }
    });
    return pieces;
};

const moveOneStep = (piece: Piece): Piece => {
    const newPiece = { ...piece };
    const safeSquares = [1, 9, 14, 22, 27, 35, 40, 48];
    const startOffset = START_OFFSETS[newPiece.color];

    if (newPiece.status === 'track') {
        const endPos = (startOffset + 51) % 52;
        if (newPiece.position === endPos) {
            newPiece.status = 'homePath';
            newPiece.position = 0;
        } else {
            let nextPos = (newPiece.position + 1) % 52;
            // Star Jump: Jump over other players' starting/star positions
            while (safeSquares.includes(nextPos) && nextPos !== startOffset) {
                nextPos = (nextPos + 1) % 52;
            }
            newPiece.position = nextPos;
        }
    } else if (newPiece.status === 'homePath') {
        const newPos = newPiece.position + 1;
        if (newPos < 5) {
            newPiece.position = newPos;
        } else {
            newPiece.status = 'finished';
            newPiece.position = 0;
        }
    }
    return newPiece;
};

const getNudgedPiece = (pieces: Piece[], piece: Piece): Piece => {
    let current = { ...piece };
    while (current.status !== 'finished') {
        const isOccupied = pieces.some(p =>
            p.id !== current.id &&
            p.color === current.color &&
            p.status === current.status &&
            p.position === current.position
        );
        if (!isOccupied) break;
        current = moveOneStep(current);
    }
    return current;
};

const movePieceLogic = (pieces: Piece[], pieceId: string, diceValue: number): Piece[] => {
    let newPieces = [...pieces];
    const pieceIndex = newPieces.findIndex(p => p.id === pieceId);
    if (pieceIndex === -1) return pieces;

    let piece = { ...newPieces[pieceIndex] };
    if (piece.status === 'base') {
        if (diceValue === 6) {
            piece.status = 'track';
            piece.position = START_OFFSETS[piece.color];
        }
    } else {
        const steps = diceValue;
        for (let i = 0; i < steps; i++) {
            piece = moveOneStep(piece);
            if (piece.status === 'finished') break;
        }
    }

    if (piece.status !== 'finished' && piece.status !== 'base') {
        piece = getNudgedPiece(newPieces, piece);
    }

    if (piece.status === 'track') {
        const targetPos = piece.position;
        const safeSquares = [1, 9, 14, 22, 27, 35, 40, 48];
        if (!safeSquares.includes(targetPos)) {
            newPieces = newPieces.map(p => {
                if (p.color !== piece.color && p.status === 'track' && p.position === targetPos) {
                    return { ...p, status: 'base', position: 0 };
                }
                return p;
            });
        }
    }

    newPieces[pieceIndex] = piece;
    return newPieces;
};

export const ludoMachine = createMachine({
    types: {} as {
        context: LudoContext;
        events: LudoEvent;
    },
    id: 'ludo',
    initial: 'waitingForPlayers',
    context: {
        players: [],
        currentPlayerIndex: 0,
        pieces: [],
        diceValue: null,
        isInitiator: false,
        winners: [],
        rollsInTurn: 0,
        lastRoll: null
    },
    states: {
        waitingForPlayers: {
            on: {
                SYNC_STATE: {
                    target: 'rolling',
                    actions: 'syncState'
                }
            }
        },
        rolling: {
            always: [
                { target: 'moving', guard: ({ context }) => context.diceValue !== null }
            ],
            on: {
                ROLL_DICE: {
                    target: 'moving',
                    actions: assign({
                        diceValue: ({ event }) => event.value,
                        lastRoll: ({ event }) => event.value,
                        rollsInTurn: ({ context }) => context.rollsInTurn + 1
                    })
                }
            }
        },
        moving: {
            always: [
                { target: 'rolling', guard: ({ context }) => context.diceValue === null },
                {
                    target: 'rolling',
                    guard: ({ context }) => {
                        const player = context.players[context.currentPlayerIndex];
                        const playerPieces = context.pieces.filter(p => p.color === player.color);
                        const allInBaseOrEnd = playerPieces.every(p => p.status === 'base' || p.status === 'finished');
                        const movable = getMovablePieces(context.pieces, player.color, context.diceValue!);

                        // Second roll rule: no pieces can move, all are in base/end, and it's the first roll of the turn (not a 6)
                        return movable.length === 0 && allInBaseOrEnd && context.rollsInTurn < 2 && context.diceValue !== 6;
                    },
                    actions: assign({ diceValue: () => null })
                },
                {
                    target: 'nextTurn',
                    guard: ({ context }) => {
                        if (context.diceValue === null) return false;
                        const movable = getMovablePieces(context.pieces, context.players[context.currentPlayerIndex].color, context.diceValue!);
                        return movable.length === 0;
                    }
                }
            ],
            on: {
                MOVE_PIECE: {
                    target: 'checkingResult',
                    actions: 'movePiece'
                }
            }
        },
        checkingResult: {
            always: [
                { target: 'won', guard: 'checkWin' },
                {
                    target: 'rolling',
                    guard: 'isRollSix',
                    actions: assign({ diceValue: () => null })
                },
                { target: 'nextTurn' }
            ]
        },
        nextTurn: {
            always: {
                target: 'rolling',
                actions: 'incrementTurn'
            }
        },
        won: {
            on: {
                RESET: {
                    target: 'rolling',
                    actions: 'resetGame'
                }
            }
        }
    },
    on: {
        SYNC_STATE: {
            actions: 'syncState'
        }
    }
}, {
    actions: {
        syncState: assign(({ event }) => {
            if (event.type !== 'SYNC_STATE') return {};
            return event.context;
        }),
        movePiece: assign(({ context, event }) => {
            if (event.type !== 'MOVE_PIECE') return {};
            const { pieceId } = event;
            const diceValue = context.diceValue!;
            const pieces = movePieceLogic(context.pieces, pieceId, diceValue);
            return { pieces };
        }),
        incrementTurn: assign(({ context }) => {
            let nextIndex = (context.currentPlayerIndex + 1) % context.players.length;

            // Skip finished players (up to players.length - 1 times to avoid infinite loop)
            for (let i = 0; i < context.players.length; i++) {
                const player = context.players[nextIndex];
                const playerPieces = context.pieces.filter(p => p.color === player.color);
                if (playerPieces.every(p => p.status === 'finished')) {
                    nextIndex = (nextIndex + 1) % context.players.length;
                } else {
                    break;
                }
            }

            return {
                currentPlayerIndex: nextIndex,
                diceValue: null,
                rollsInTurn: 0
            };
        }),
        resetGame: assign(({ context }) => ({
            pieces: createLudoPieces(context.players),
            currentPlayerIndex: 0,
            diceValue: null,
            winners: [],
            rollsInTurn: 0,
            lastRoll: null
        })),
        resetDice: assign({ diceValue: () => null })
    },
    guards: {
        checkWin: ({ context }) => {
            const playerColor = context.players[context.currentPlayerIndex].color;
            const playerPieces = context.pieces.filter(p => p.color === playerColor);
            return playerPieces.every(p => p.status === 'finished');
        },
        isRollSix: ({ context }) => context.diceValue === 6
    }
});

export function applyLedgerToLudoState(players: Player[], ledger: LedgerEntry[]): Partial<LudoContext> {
    let pieces = createLudoPieces(players);
    let currentPlayerIndex = 0;
    let diceValue: number | null = null;
    let lastRoll: number | null = null;
    let rollsInTurn = 0;

    ledger.forEach(entry => {
        const { type, payload } = entry.action;
        if (type === 'ROLL_DICE') {
            diceValue = payload.value;
            lastRoll = payload.value;
            rollsInTurn++;

            const player = players[currentPlayerIndex];
            const playerPieces = pieces.filter(p => p.color === player.color);
            const allInBaseOrEnd = playerPieces.every(p => p.status === 'base' || p.status === 'finished');
            const movable = getMovablePieces(pieces, player.color, diceValue!);

            if (movable.length === 0 && allInBaseOrEnd && rollsInTurn < 2 && diceValue !== 6) {
                diceValue = null;
            } else if (movable.length === 0) {
                // Skip turn
                currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

                // Skip finished players in ledger replay
                for (let i = 0; i < players.length; i++) {
                    const nextPlayer = players[currentPlayerIndex];
                    const nextPlayerPieces = pieces.filter(p => p.color === nextPlayer.color);
                    if (nextPlayerPieces.every(p => p.status === 'finished')) {
                        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
                    } else {
                        break;
                    }
                }

                diceValue = null;
                rollsInTurn = 0;
            }
        } else if (type === 'MOVE_PIECE') {
            const pieceId = payload.pieceId;
            const pieceIndex = pieces.findIndex(p => p.id === pieceId);
            if (pieceIndex !== -1 && diceValue !== null) {
                pieces = movePieceLogic(pieces, pieceId, diceValue);

                // Turn logic
                if (diceValue !== 6) {
                    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

                    // Skip finished players
                    for (let i = 0; i < players.length; i++) {
                        const nextPlayer = players[currentPlayerIndex];
                        const nextPlayerPieces = pieces.filter(p => p.color === nextPlayer.color);
                        if (nextPlayerPieces.every(p => p.status === 'finished')) {
                            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
                        } else {
                            break;
                        }
                    }

                    rollsInTurn = 0;
                }
                diceValue = null;
            }
        }
    });

    return { pieces, currentPlayerIndex, diceValue, players, rollsInTurn, lastRoll };
}

export const getMovablePieces = (pieces: Piece[], color: Color, diceValue: number): Piece[] => {
    return pieces.filter(p => {
        if (p.color !== color) return false;
        if (p.status === 'finished') return false;
        if (p.status === 'base') {
            const startPos = START_OFFSETS[color];
            const isStartOccupied = pieces.some(other => other.color === color && other.status === 'track' && other.position === startPos);
            return diceValue === 6 && !isStartOccupied;
        }
        if (p.status === 'homePath') return p.position + diceValue <= 5;
        return true; // Can always move on track (looping handled by logic)
    });
};
