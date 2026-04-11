import React from 'react';

const GameInfo: React.FC = () => {
    return (
        <div className="text-white p-8 glass-dark rounded-[2rem] border border-white/5 shadow-2xl transform transition-all hover:scale-[1.01] duration-300 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 blur-[40px] rounded-full" />
            <div className="space-y-6 relative z-10">
                <h3 className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    How to Play
                </h3>
                <ul className="space-y-4 text-white/80 font-medium">
                    <li className="flex items-start gap-3">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] flex-shrink-0" />
                        <span>The game is played on a classic <span className="text-white font-bold">3x3 grid</span>.</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] flex-shrink-0" />
                        <span>Players take turns placing their marks (<span className="text-cyan-400 font-bold">X</span> and <span className="text-rose-400 font-bold">O</span>).</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] flex-shrink-0" />
                        <span>Get <span className="text-white font-bold">3 in a row</span> (horizontally, vertically, or diagonally) to win!</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] flex-shrink-0" />
                        <span>If all squares are filled without a winner, the game is a <span className="text-white font-bold">tie</span>.</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default GameInfo;
