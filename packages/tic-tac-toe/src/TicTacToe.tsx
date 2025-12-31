import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Connection } from '@/lib/webrtc';
import { useMachine } from '@xstate/react';
import { ticTacToeMachine, calculateWinner, Player } from './ticTacToeMachine';
import { createGameMessage, isGameMessage } from '@/lib/network';
import { LedgerEntry } from '@/lib/ledger';

import { GameProps } from '@/lib/types';

export default function TicTacToe({ connections, playerNames, playerInfos, isInitiator, ledger, onAddLedger, onFinishGame }: GameProps) {
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

        connections.forEach(c => {
            c.addMessageListener(handleMessage);
        });

        return () => {
            connections.forEach(c => {
                c.removeMessageListener(handleMessage);
            });
        };
    }, [connections, isInitiator, onAddLedger]);

    // Reconstruct state from ledger
    useEffect(() => {
        if (!ledger) return;

        const newBoard: (Player | null)[] = Array(9).fill(null);
        let movesCount = 0;

        ledger.forEach(entry => {
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
            connections.forEach(c => {
                c.send(JSON.stringify(createGameMessage('MOVE_REQUEST', { index })));
            });
        }
    };

    const handleReset = () => {
        if (isInitiator) {
            onAddLedger?.({ type: 'RESET', payload: {} });
        } else {
            connections.forEach(c => {
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
        <Card className="p-6 flex flex-col items-center space-y-4 bg-white/50 backdrop-blur-sm border-2 border-primary/20 shadow-xl rounded-2xl">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Tic-Tac-Toe
            </div>
            <div className={`text-lg font-medium ${isMyTurn && amIParticipant ? 'text-green-600 animate-pulse' : 'text-gray-500'}`}>
                {status}
            </div>
            <div className="grid grid-cols-3 gap-3">
                {board.map((square, i) => (
                    <button
                        key={i}
                        onClick={() => handleClick(i)}
                        disabled={!isMyTurn || !!square || state.matches('won') || state.matches('draw') || !amIParticipant}
                        className={`w-20 h-20 text-3xl font-black rounded-xl transition-all duration-200 border-2 
              ${square === 'X' ? 'text-blue-600 border-blue-200 bg-blue-50' : square === 'O' ? 'text-rose-600 border-rose-200 bg-rose-50' : 'hover:bg-primary/5 hover:border-primary/30 border-gray-100 bg-white'}
              ${(!isMyTurn || !!square || state.matches('won') || state.matches('draw') || !amIParticipant) ? 'opacity-50 cursor-not-allowed' : ''}
              flex items-center justify-center shadow-sm hover:shadow-md active:scale-95`}
                    >
                        {square}
                    </button>
                ))}
            </div>
            {(state.matches('won') || state.matches('draw')) && amIParticipant && !onFinishGame && (
                <Button onClick={handleReset} variant="outline" className="mt-4 hover:bg-primary hover:text-white transition-colors">
                    Play Again
                </Button>
            )}
        </Card>
    );
}

