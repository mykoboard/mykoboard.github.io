import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMachine } from '@xstate/react';
import { ticTacToeMachine, calculateWinner, Player } from './ticTacToeMachine';
import {
    createGameMessage,
    isGameMessage,
    LedgerEntry,
    GameProps,
    SimpleConnection
} from '@mykoboard/integration';

export default function TicTacToe({ connections, playerNames, isInitiator, ledger, onAddLedger, onFinishGame }: GameProps) {
    const [state, send] = useMachine(ticTacToeMachine, {
        input: { isInitiator }
    });

    const { board, mySymbol } = state.context;

    // Sync connections to machine context
    useEffect(() => {
        send({ type: 'UPDATE_CONNECTIONS', connections });
    }, [connections, send]);

    // Handle incoming messages
    useEffect(() => {
        const handleMessage = (data: string) => {
            try {
                const message = JSON.parse(data);
                if (!isGameMessage(message)) return;

                if (message.type === 'MOVE_REQUEST') {
                    // Host receives move request and adds to ledger
                    if (isInitiator) {
                        onAddLedger?.({ type: 'MOVE', payload: { index: message.payload.index } });
                    }
                } else if (message.type === 'RESET_REQUEST') {
                    if (isInitiator) {
                        onAddLedger?.({ type: 'RESET', payload: {} });
                    }
                }
            } catch (e) { }
        };

        connections.forEach((c: SimpleConnection) => {
            c.addMessageListener(handleMessage);
        });

        return () => {
            connections.forEach((c: SimpleConnection) => {
                c.removeMessageListener(handleMessage);
            });
        };
    }, [connections, isInitiator, onAddLedger]);

    // Reconstruct state from ledger
    useEffect(() => {
        if (!ledger) return;

        const newBoard: (Player | null)[] = Array(9).fill(null);
        let movesCount = 0;

        ledger.forEach((entry: LedgerEntry) => {
            if (entry.action.type === 'MOVE') {
                // Determine whose move it was based on turn count
                // Player 1 (X) always starts
                const symbol: Player = movesCount % 2 === 0 ? 'X' : 'O';
                newBoard[entry.action.payload.index] = symbol;
                movesCount++;
            } else if (entry.action.type === 'RESET') {
                newBoard.fill(null);
                movesCount = 0;
            }
        });

        send({ type: 'SYNC_STATE', board: newBoard });

        // Check for finish
        const winner = calculateWinner(newBoard);
        const isDraw = !winner && newBoard.every(s => s !== null);
        if (winner || isDraw) {
            onFinishGame?.();
        }
    }, [ledger, send, onFinishGame]);

    const handleClick = (index: number) => {
        if (isInitiator) {
            onAddLedger?.({ type: 'MOVE', payload: { index } });
        } else {
            // Guest sends request to host
            connections.forEach((c: SimpleConnection) => {
                c.send(JSON.stringify(createGameMessage('MOVE_REQUEST', { index })));
            });
        }
    };

    const handleReset = () => {
        if (isInitiator) {
            onAddLedger?.({ type: 'RESET', payload: {} });
        } else {
            connections.forEach((c: SimpleConnection) => {
                c.send(JSON.stringify(createGameMessage('RESET_REQUEST')));
            });
        }
    };

    const isMyTurn = state.matches('playing.myTurn');
    const winner = calculateWinner(board);

    const status = state.matches('won')
        ? winner === mySymbol ? "You Won!" : "Opponent Won!"
        : state.matches('draw')
            ? "Draw!"
            : isMyTurn ? "Your Turn" : "Opponent's Turn";

    // Host is player 1, first guest to connect is player 2.
    // amIParticipant: index 0 (self) is initiator OR index 1 is someone else?
    // In playerNames = [local, ...remote], if I am initiator, I am player 1.
    // If I am not initiator, I am player 2 if I am the first guest.
    const amIParticipant = isInitiator || playerNames.length > 1;

    return (
        <Card className="p-8 flex flex-col items-center space-y-6 glass-dark border border-white/10 shadow-2xl rounded-[2.5rem] relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/20 blur-[80px] rounded-full" />

            <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
                TIC-TAC-TOE
            </div>

            <div className={`px-6 py-2 rounded-full text-sm font-bold tracking-wider uppercase transition-all duration-300 border
                ${isMyTurn && amIParticipant 
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(34,211,238,0.2)] animate-pulse' 
                    : 'bg-white/5 text-white/40 border-white/5'}`}>
                {status}
            </div>

            <div className="grid grid-cols-3 gap-4 p-2 bg-white/5 rounded-3xl border border-white/5">
                {board.map((square, i) => (
                    <button
                        key={i}
                        onClick={() => handleClick(i)}
                        disabled={!isMyTurn || !!square || state.matches('won') || state.matches('draw') || !amIParticipant}
                        className={`w-24 h-24 text-4xl font-black rounded-2xl transition-all duration-300 border-2 relative group
              ${square === 'X' 
                ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_20px_-5px_rgba(34,211,238,0.3)]' 
                : square === 'O' 
                  ? 'text-rose-400 border-rose-500/30 bg-rose-500/5 shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)]' 
                  : 'hover:bg-white/10 hover:border-white/20 border-white/5 bg-white/2'}
              ${(!isMyTurn || !!square || state.matches('won') || state.matches('draw') || !amIParticipant) ? 'opacity-40 cursor-not-allowed' : 'active:scale-90'}
              flex items-center justify-center shadow-inner`}
                    >
                        {square === 'X' && (
                            <span className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-in zoom-in duration-300">X</span>
                        )}
                        {square === 'O' && (
                            <span className="drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-in zoom-in duration-300">O</span>
                        )}
                        {!square && isMyTurn && amIParticipant && (
                            <span className="opacity-0 group-hover:opacity-20 transition-opacity text-white">
                                {mySymbol}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {(state.matches('won') || state.matches('draw')) && amIParticipant && !onFinishGame && (
                <Button 
                    onClick={handleReset} 
                    variant="outline" 
                    className="mt-6 px-8 py-6 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 hover:text-cyan-400 hover:border-cyan-500/40 transition-all duration-300 font-bold tracking-wide"
                >
                    Play Again
                </Button>
            )}
        </Card>
    );
}

