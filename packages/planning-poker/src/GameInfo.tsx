import React from 'react';

const GameInfo: React.FC = () => {
    return (
        <div className="text-white p-6 glass-dark rounded-2xl transform transition-transform hover:scale-[1.01] duration-300">
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-primary">How to Use</h3>
                <ul className="list-disc list-inside space-y-2 text-white/70">
                    <li>The host presents a user story or task to be estimated.</li>
                    <li>Each team member privately selects a card representing their estimate.</li>
                    <li>Once everyone has voted, the host reveals all votes simultaneously.</li>
                    <li>If estimates differ significantly, the team discusses the reasons.</li>
                    <li>The process repeats until a rough consensus is reached.</li>
                </ul>
            </div>
        </div>
    );
};

export default GameInfo;
