import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Connection } from '../../lib/webrtc';

interface TicTacToeProps {
    connection: Connection | null;
    isInitiator: boolean;
}

type Player = 'X' | 'O' | null;

export default function TicTacToe({ connection, isInitiator }: TicTacToeProps) {
    const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
    const [isMyTurn, setIsMyTurn] = useState(isInitiator);
    const mySymbol: Player = isInitiator ? 'X' : 'O';
    const opponentSymbol: Player = isInitiator ? 'O' : 'X';

    useEffect(() => {
        if (!connection) return;

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'MOVE') {
                    const newBoard = [...board];
                    newBoard[data.index] = opponentSymbol;
                    setBoard(newBoard);
                    setIsMyTurn(true);
                } else if (data.type === 'RESET') {
                    setBoard(Array(9).fill(null));
                    setIsMyTurn(isInitiator);
                }
            } catch (e) {
                console.error("Error parsing message", e);
            }
        };

        if (connection.dataChannel) {
            connection.dataChannel.addEventListener('message', handleMessage);
        }

        return () => {
            if (connection.dataChannel) {
                connection.dataChannel.removeEventListener('message', handleMessage);
            }
        };
    }, [connection, board, isMyTurn]);

    const handleClick = (index: number) => {
        if (!isMyTurn || board[index] || calculateWinner(board)) return;

        const newBoard = [...board];
        newBoard[index] = mySymbol;
        setBoard(newBoard);
        setIsMyTurn(false);

        if (connection && connection.dataChannel && connection.dataChannel.readyState === 'open') {
            connection.send(JSON.stringify({ type: 'MOVE', index }));
        }
    };

    const handleReset = () => {
        setBoard(Array(9).fill(null));
        setIsMyTurn(isInitiator);
        if (connection && connection.dataChannel && connection.dataChannel.readyState === 'open') {
            connection.send(JSON.stringify({ type: 'RESET' }));
        }
    };

    const winner = calculateWinner(board);
    const status = winner
        ? winner === mySymbol ? "You Won!" : "Opponent Won!"
        : board.every(Boolean)
            ? "Draw!"
            : isMyTurn ? "Your Turn" : "Opponent's Turn";

    return (
        <Card className="p-6 flex flex-col items-center space-y-4 bg-white/50 backdrop-blur-sm border-2 border-primary/20 shadow-xl rounded-2xl">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Tic-Tac-Toe
            </div>
            <div className={`text-lg font-medium ${isMyTurn ? 'text-green-600 animate-pulse' : 'text-gray-500'}`}>
                {status}
            </div>
            <div className="grid grid-cols-3 gap-3">
                {board.map((square, i) => (
                    <button
                        key={i}
                        onClick={() => handleClick(i)}
                        disabled={!isMyTurn || !!square || !!winner}
                        className={`w-20 h-20 text-3xl font-black rounded-xl transition-all duration-200 border-2 
              ${square === 'X' ? 'text-blue-600 border-blue-200 bg-blue-50' : square === 'O' ? 'text-rose-600 border-rose-200 bg-rose-50' : 'hover:bg-primary/5 hover:border-primary/30 border-gray-100 bg-white'}
              ${!isMyTurn && !square ? 'opacity-50 cursor-not-allowed' : ''}
              flex items-center justify-center shadow-sm hover:shadow-md active:scale-95`}
                    >
                        {square}
                    </button>
                ))}
            </div>
            {(winner || board.every(Boolean)) && (
                <Button onClick={handleReset} variant="outline" className="mt-4 hover:bg-primary hover:text-white transition-colors">
                    Play Again
                </Button>
            )}
        </Card>
    );
}

function calculateWinner(squares: Player[]): Player {
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
