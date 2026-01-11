import React, { useState, useEffect, useMemo } from 'react';
import GalacticHegemony from './GalacticHegemony';
import { PlayerInfo } from '@mykoboard/integration';
import { MockConnection } from './MockConnection';

export const StandaloneGalacticHegemony: React.FC = () => {
    const [ledger, setLedger] = useState<any[]>([]);

    // Define 2 players for testing
    const playerInfos: PlayerInfo[] = useMemo(() => [
        { id: 'player1', name: 'Alpha Commander', isLocal: true, status: 'game', isConnected: true, isHost: true },
        { id: 'player2', name: 'Beta Hegemon', isLocal: false, status: 'game', isConnected: true, isHost: false },
    ], []);

    // Create a mock connection for the second player
    const connections = useMemo(() => [
        new MockConnection('player2')
    ], []);

    const handleAddLedger = (action: { type: string, payload: any }) => {
        console.log('[Standalone] Adding to Ledger:', action);
        // In a real app, this would be wrapped in a LedgerEntry with hash, etc.
        // But for testing the game component, we just need the action list.
        const mockEntry = {
            index: ledger.length,
            timestamp: Date.now(),
            action,
            prevHash: '0',
            hash: '0'
        };
        setLedger(prev => [...prev, mockEntry]);
    };

    // Auto-respond to requests from the host (simulating remote player actions)
    // In a real standalone test, we might want a UI to trigger these
    // but for now, let's just allow the user to control the local player.

    return (
        <div className="w-full h-screen bg-[#020617] overflow-auto">
            <div className="max-w-[1600px] mx-auto">
                <GalacticHegemony
                    connections={connections}
                    playerInfos={playerInfos}
                    playerNames={playerInfos.map(p => p.name)}
                    isInitiator={true}
                    ledger={ledger}
                    onAddLedger={handleAddLedger}
                    onFinishGame={() => console.log('Game Finished!')}
                />
            </div>

            {/* Debug Panel */}
            <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl z-[100] max-w-xs">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Debug Panel</h4>
                <div className="space-y-2">
                    <button
                        onClick={() => {
                            // Simulate player 2 placing a worker
                            connections[0].receive(JSON.stringify({
                                type: 'PLACE_WORKER_REQUEST',
                                payload: {
                                    slotId: 'sector-1',
                                    playerId: 'player2'
                                }
                            }));
                        }}
                        className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded uppercase transition-colors"
                    >
                        Simulate P2 Action
                    </button>
                    <button
                        onClick={() => setLedger([])}
                        className="w-full px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-[10px] font-bold rounded uppercase transition-colors border border-red-900/50"
                    >
                        Reset Ledger
                    </button>
                    <div className="mt-2 pt-2 border-t border-slate-800">
                        <p className="text-[10px] text-slate-500">Actions in Ledger: {ledger.length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
