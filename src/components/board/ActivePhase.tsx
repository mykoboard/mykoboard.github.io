import { Suspense } from "react";
import { Connection } from "../../lib/webrtc";
import { PlayerInfo } from "@mykoboard/integration";

interface ActivePhaseProps {
    GameComponent: any;
    connectedPeers: Connection[];
    playerInfos: PlayerInfo[];
    isInitiator: boolean;
    ledger: any[];
    onAddLedger: (action: { type: string, payload: any }) => void;
    onFinishGame: () => void;
}

export function ActivePhase({
    GameComponent,
    connectedPeers,
    playerInfos,
    isInitiator,
    ledger,
    onAddLedger,
    onFinishGame
}: ActivePhaseProps) {
    return (
        <Suspense fallback={<div className="text-center p-20 animate-pulse">Loading Game...</div>}>
            <div className="animate-in fade-in zoom-in-95 duration-500">
                <GameComponent
                    connections={connectedPeers}
                    playerNames={playerInfos.map(p => p.name)}
                    playerInfos={playerInfos}
                    isInitiator={isInitiator}
                    ledger={ledger}
                    onAddLedger={onAddLedger}
                    onFinishGame={onFinishGame}
                />
            </div>
        </Suspense>
    );
}
