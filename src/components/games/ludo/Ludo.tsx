import React, { useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMachine } from '@xstate/react';
import { ludoMachine, createLudoPieces, Color, Piece, Player, getMovablePieces, applyLedgerToLudoState } from './ludoMachine';
import { createGameMessage, isGameMessage } from '../../../lib/network';
import { GameProps } from '../../../lib/types';

const COLORS: Color[] = ['red', 'green', 'yellow', 'blue'];

const COLORS_HEX: Record<Color, string> = {
    yellow: '#facc15',
    green: '#22c55e',
    blue: '#3b82f6',
    red: '#ef4444'
};

const SAFE_INDICES = [1, 9, 14, 22, 27, 35, 40, 48];

export default function Ludo({ connections, playerNames, playerInfos, isInitiator, ledger, onAddLedger, onFinishGame }: GameProps) {
    const players = useMemo((): Player[] => {
        return playerInfos.slice(0, 4).map((info, i) => ({
            id: info.isLocal ? 'local' : info.id,
            name: info.name,
            color: (['yellow', 'green', 'red', 'blue'] as Color[])[i] // TL, TR, BR, BL order
        }));
    }, [playerInfos]);

    const [state, send] = useMachine(ludoMachine, {
        input: { isInitiator }
    });

    const { pieces, currentPlayerIndex, diceValue, lastRoll } = state.context;
    const currentPlayer = players[currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === 'local';

    useEffect(() => {
        if (state.matches('waitingForPlayers') && players.length >= 2) {
            send({
                type: 'SYNC_STATE',
                context: {
                    players,
                    pieces: createLudoPieces(players),
                    currentPlayerIndex: 0
                }
            });
        }
    }, [players, send, state.value]);

    useEffect(() => {
        const handleMessage = (data: string) => {
            try {
                const message = JSON.parse(data);
                if (!isGameMessage(message)) return;

                if (isInitiator) {
                    if (message.type === 'ROLL_DICE_REQUEST') {
                        const val = Math.floor(Math.random() * 6) + 1;
                        onAddLedger?.({ type: 'ROLL_DICE', payload: { value: val } });
                    } else if (message.type === 'MOVE_PIECE_REQUEST') {
                        onAddLedger?.({ type: 'MOVE_PIECE', payload: { pieceId: message.payload.pieceId } });
                    }
                }
            } catch (e) { }
        };

        connections.forEach(c => c.addMessageListener(handleMessage));
        return () => connections.forEach(c => c.removeMessageListener(handleMessage));
    }, [connections, isInitiator, onAddLedger]);

    useEffect(() => {
        if (!ledger || players.length < 2) return;
        const newContext = applyLedgerToLudoState(players, ledger);
        send({ type: 'SYNC_STATE', context: newContext });
    }, [ledger, players, send]);

    const handleRoll = () => {
        if (!isMyTurn || !state.matches('rolling') || diceValue !== null) return;
        if (isInitiator) {
            const val = Math.floor(Math.random() * 6) + 1;
            onAddLedger?.({ type: 'ROLL_DICE', payload: { value: val } });
        } else {
            connections.forEach(c => c.send(JSON.stringify(createGameMessage('ROLL_DICE_REQUEST'))));
        }
    };

    const handlePieceClick = (pieceId: string) => {
        if (!isMyTurn || !state.matches('moving')) return;
        const piece = pieces.find(p => p.id === pieceId);
        if (!piece || piece.color !== currentPlayer.color) return;

        const movable = getMovablePieces(pieces, piece.color, diceValue!);
        if (!movable.find(p => p.id === pieceId)) return;

        if (isInitiator) {
            onAddLedger?.({ type: 'MOVE_PIECE', payload: { pieceId } });
        } else {
            connections.forEach(c => c.send(JSON.stringify(createGameMessage('MOVE_PIECE_REQUEST', { pieceId }))));
        }
    };

    const boardSize = 600;
    const cellSize = boardSize / 15;

    return (
        <Card className="p-8 flex flex-col items-center space-y-6 bg-slate-50 border-0 shadow-none rounded-[40px] max-w-4xl mx-auto overflow-hidden">
            <div className="flex justify-between w-full items-center mb-4">
                <div className="flex flex-col">
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight">Ludo</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Multiplayer Board Engine</p>
                </div>
                <div className="flex items-center gap-3">
                    {players.map((p, i) => (
                        <div key={p.id} className={`flex items-center space-x-2 px-4 py-2 rounded-2xl transition-all duration-500 ${i === currentPlayerIndex ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-2 ring-primary/10' : 'opacity-40 grayscale'}`}>
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS_HEX[p.color] }} />
                            <span className="text-sm font-black text-slate-700">{p.name} {p.id === 'local' && '(You)'}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative p-6 bg-white rounded-[48px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] ring-1 ring-slate-100">
                <svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`} className="rounded-2xl transition-all duration-500">
                    <BoardLayout cellSize={cellSize} />
                    {pieces.map(p => (
                        <LudoPiece
                            key={p.id}
                            piece={p}
                            cellSize={cellSize}
                            onClick={() => handlePieceClick(p.id)}
                            isMovable={isMyTurn && state.matches('moving') && p.color === currentPlayer?.color && getMovablePieces(pieces, p.color, diceValue!).some(m => m.id === p.id)}
                        />
                    ))}
                </svg>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    {lastRoll && (
                        <div className="bg-white rounded-3xl p-6 shadow-2xl border-4 border-slate-50 animate-in zoom-in duration-300">
                            <span className="text-6xl font-black text-slate-800 tabular-nums">{lastRoll}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full flex justify-between items-center bg-white p-6 rounded-[32px] shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
                <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Move</p>
                    <p className="font-black text-xl text-slate-800">
                        {state.matches('rolling') ? (isMyTurn ? "Roll the dice" : `${currentPlayer?.name}'s turn`) :
                            state.matches('moving') ? (isMyTurn ? "Move your piece" : `${currentPlayer?.name} is moving...`) :
                                "Game Finished"}
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Result</p>
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-2xl text-slate-800">
                            {lastRoll || '-'}
                        </div>
                    </div>
                    <Button
                        size="lg"
                        onClick={handleRoll}
                        disabled={!isMyTurn || !state.matches('rolling')}
                        className="h-16 px-12 text-xl font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 enabled:hover:scale-[1.02] active:scale-95 bg-slate-900 text-white border-0"
                    >
                        Roll Dice 🎲
                    </Button>
                </div>
            </div>
        </Card>
    );
}

const Star = ({ cx, cy, r, fill, stroke }: { cx: number, cy: number, r: number, fill: string, stroke?: string }) => {
    const points = [];
    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r : r * 0.45;
        const angle = (i * 36 - 90) * (Math.PI / 180);
        points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
    }
    return <polygon points={points.join(' ')} fill={fill} stroke={stroke} strokeWidth="1" />;
};

function BoardLayout({ cellSize }: { cellSize: number }) {
    const renderTrackCell = (x: number, y: number, color?: Color, isStar?: boolean) => (
        <g key={`${x}-${y}`}>
            <rect x={x * cellSize} y={y * cellSize} width={cellSize} height={cellSize} fill={color ? COLORS_HEX[color] : 'white'} stroke="#f1f5f9" strokeWidth="1" />
            {isStar && (
                <Star cx={x * cellSize + cellSize / 2} cy={y * cellSize + cellSize / 2} r={cellSize * 0.35} fill="white" />
            )}
        </g>
    );

    const cells: React.ReactNode[] = [];
    // Render the perimeter and home paths accurately
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            const isBase = (i < 6 && j < 6) || (i > 8 && j < 6) || (i > 8 && j > 8) || (i < 6 && j > 8);
            const isCenter = i >= 6 && i <= 8 && j >= 6 && j <= 8;
            if (!isBase && !isCenter) {
                let cellColor: Color | undefined;
                let isStar = false;

                // Color specific start and home path cells
                if (i === 1 && j === 7) cellColor = 'yellow'; // Home path Yellow
                if (i === 7 && j === 1) cellColor = 'green';  // Home path Green
                if (i === 13 && j === 7) cellColor = 'red';   // Home path Red
                if (i === 7 && j === 13) cellColor = 'blue';  // Home path Blue

                // Entrance and path coloring
                if (i > 0 && i < 6 && j === 7) cellColor = 'yellow';
                if (i === 7 && j > 0 && j < 6) cellColor = 'green';
                if (i > 8 && i < 14 && j === 7) cellColor = 'red';
                if (i === 7 && j > 8 && j < 14) cellColor = 'blue';

                // Start cells
                if (i === 1 && j === 6) cellColor = 'yellow';
                if (i === 8 && j === 1) cellColor = 'green';
                if (i === 13 && j === 8) cellColor = 'red';
                if (i === 6 && j === 13) cellColor = 'blue';

                // Stars
                if ((i === 1 && j === 6) || (i === 8 && j === 1) || (i === 13 && j === 8) || (i === 6 && j === 13)) isStar = true;

                cells.push(renderTrackCell(i, j, cellColor, isStar));
            }
        }
    }

    return (
        <g>
            <rect width={cellSize * 15} height={cellSize * 15} fill="#f8fafc" />

            {/* Bases */}
            <Base x={0} y={0} color="yellow" size={6 * cellSize} />
            <Base x={9 * cellSize} y={0} color="green" size={6 * cellSize} />
            <Base x={9 * cellSize} y={9 * cellSize} color="red" size={6 * cellSize} />
            <Base x={0} y={9 * cellSize} color="blue" size={6 * cellSize} />

            {/* Path Cells */}
            {cells}

            {/* Center Area */}
            <g transform={`translate(${6 * cellSize}, ${6 * cellSize})`}>
                <polygon points={`0,0 ${3 * cellSize},0 ${1.5 * cellSize},1.5*cellSize`} fill={COLORS_HEX.green} />
                <polygon points={`${3 * cellSize},0 ${3 * cellSize},${3 * cellSize} ${1.5 * cellSize},1.5*cellSize`} fill={COLORS_HEX.red} />
                <polygon points={`${3 * cellSize},${3 * cellSize} 0,${3 * cellSize} ${1.5 * cellSize},1.5*cellSize`} fill={COLORS_HEX.blue} />
                <polygon points={`0,${3 * cellSize} 0,0 ${1.5 * cellSize},1.5*cellSize`} fill={COLORS_HEX.yellow} />
            </g>
        </g>
    );
}

function Base({ x, y, color, size }: { x: number, y: number, color: Color, size: number }) {
    const dotSize = size * 0.18;
    return (
        <g transform={`translate(${x}, ${y})`}>
            <rect width={size} height={size} fill={COLORS_HEX[color]} opacity="0.1" rx="24" />
            <rect x={size * 0.1} y={size * 0.1} width={size * 0.8} height={size * 0.8} fill="white" rx="16" />
            <circle cx={size * 0.3} cy={size * 0.3} r={dotSize} fill={COLORS_HEX[color]} opacity="0.2" />
            <circle cx={size * 0.7} cy={size * 0.3} r={dotSize} fill={COLORS_HEX[color]} opacity="0.2" />
            <circle cx={size * 0.3} cy={size * 0.7} r={dotSize} fill={COLORS_HEX[color]} opacity="0.2" />
            <circle cx={size * 0.7} cy={size * 0.7} r={dotSize} fill={COLORS_HEX[color]} opacity="0.2" />
        </g>
    );
}

function LudoPiece({ piece, cellSize, onClick, isMovable }: { piece: Piece, cellSize: number, onClick: () => void, isMovable: boolean }) {
    const finalCoords = useMemo(() => {
        if (piece.status === 'base') {
            const baseX = piece.color === 'yellow' || piece.color === 'blue' ? 0 : 9;
            const baseY = piece.color === 'yellow' || piece.color === 'green' ? 0 : 9;
            const subX = piece.id.endsWith('0') || piece.id.endsWith('2') ? 1.8 : 4.2;
            const subY = piece.id.endsWith('0') || piece.id.endsWith('1') ? 1.8 : 4.2;
            return { x: (baseX + subX) * cellSize, y: (baseY + subY) * cellSize };
        }

        if (piece.status === 'track') {
            const path = [
                { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
                { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
                { x: 14, y: 7 },
                { x: 14, y: 8 }, { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
                { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
                { x: 7, y: 14 },
                { x: 6, y: 14 }, { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
                { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
                { x: 0, y: 7 },
                { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
                { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
                { x: 7, y: 0 }
            ];
            const p = path[piece.position % 52];
            return { x: (p.x + 0.5) * cellSize, y: (p.y + 0.5) * cellSize };
        }

        if (piece.status === 'homePath') {
            const hPaths: Record<Color, any[]> = {
                green: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
                red: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }],
                blue: [{ x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }],
                yellow: [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }]
            };
            const p = hPaths[piece.color][piece.position];
            return { x: (p.x + 0.5) * cellSize, y: (p.y + 0.5) * cellSize };
        }

        const centers: Record<Color, any> = {
            green: { x: 7.5, y: 6.8 },
            red: { x: 8.2, y: 7.5 },
            blue: { x: 7.5, y: 8.2 },
            yellow: { x: 6.8, y: 7.5 }
        };
        const p = centers[piece.color] || { x: 7.5, y: 7.5 };
        return { x: (p.x) * cellSize, y: (p.y) * cellSize };
    }, [piece, cellSize]);

    return (
        <g
            onClick={onClick}
            transform={`translate(${finalCoords.x}, ${finalCoords.y})`}
            className={`cursor-pointer transition-all duration-500 ${isMovable ? 'filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.2)]' : ''}`}
        >
            <circle r={cellSize * 0.4} fill={COLORS_HEX[piece.color]} stroke="white" strokeWidth="2.5" />
            <circle r={cellSize * 0.18} fill="white" fillOpacity="0.4" />
            {isMovable && (
                <circle r={cellSize * 0.48} fill="none" stroke={COLORS_HEX[piece.color]} strokeWidth="2.5" strokeDasharray="6 3" className="animate-spin-slow" style={{ transformOrigin: 'center', transformBox: 'fill-box' }} />
            )}
        </g>
    );
}
