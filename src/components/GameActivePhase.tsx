import { Suspense } from "react";
import { Connection } from "../lib/webrtc";
import { PlayerInfo } from "./Players";

interface GameActivePhaseProps {
    GameComponent: any;
    connectedPeers: Connection[];
    playerInfos: PlayerInfo[];
    isInitiator: boolean;
    ledger: any[];
    onAddLedger: (action: { type: string, payload: any }) => void;
    onFinishGame: () => void;
}

export function GameActivePhase({
    GameComponent,
    connectedPeers,
    playerInfos,
    isInitiator,
    ledger,
    onAddLedger,
    onFinishGame
}: GameActivePhaseProps) {
    return (
        <Suspense fallback={<div className="text-center p-20 animate-pulse">Loading Game...</div>}>
            <div className="animate-in fade-in zoom-in-95 duration-500">
                <GameComponent
                    connections={connectedPeers}
                    playerNames={playerInfos.map(p => p.name)}
                    isInitiator={isInitiator}
                    ledger={ledger}
                    onAddLedger={onAddLedger}
                    onFinishGame={onFinishGame}
                />
            </div>
        </Suspense>
    );
}
