import React from 'react';

const GameInfo: React.FC = () => {
    return (
        <div className="text-white p-6 glass-dark rounded-2xl transform transition-transform hover:scale-[1.01] duration-300">
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-primary">Rules</h3>
                <ul className="list-disc list-inside space-y-2 text-white/70">
                    <li>Build your fleet and expand your empire across the galaxy.</li>
                    <li>Manage resources to upgrade your ships and technology.</li>
                    <li>Engage in strategic turn-based battles against other players.</li>
                    <li>The first player to conquer the core sectors or reach the victory point threshold wins.</li>
                </ul>
            </div>
        </div>
    );
};

export default GameInfo;
