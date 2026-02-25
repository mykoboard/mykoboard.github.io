import React from 'react';

const GameInfo: React.FC = () => {
    return (
        <div className="text-white p-6 glass-dark rounded-2xl transform transition-transform hover:scale-[1.01] duration-300">
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-primary">Rules</h3>
                <ul className="list-disc list-inside space-y-2 text-white/70">
                    <li>The game is played on a grid that's 3 squares by 3 squares.</li>
                    <li>You are X, your friend is O. Players take turns putting their marks in empty squares.</li>
                    <li>The first player to get 3 of her marks in a row (up, down, across, or diagonally) is the winner.</li>
                    <li>When all 9 squares are full, the game is over. If no player has 3 marks in a row, the game ends in a tie.</li>
                </ul>
            </div>
        </div>
    );
};

export default GameInfo;
