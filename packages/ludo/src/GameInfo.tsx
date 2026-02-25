import React from 'react';

const GameInfo: React.FC = () => {
    return (
        <div className="text-white p-6 glass-dark rounded-2xl transform transition-transform hover:scale-[1.01] duration-300">
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-primary">Rules</h3>
                <ul className="list-disc list-inside space-y-2 text-white/70">
                    <li>Each player has 4 pieces. The goal is to move all 4 pieces to the center home track.</li>
                    <li>A piece can only leave the base when a 6 is rolled.</li>
                    <li>Landing on an opponent's piece sends it back to their base.</li>
                    <li>Move exactly the number of spaces shown on the die to enter the home finish.</li>
                </ul>
            </div>
        </div>
    );
};

export default GameInfo;
