import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Connection } from "../../lib/webrtc";
import { PlayerInfo } from "../../lib/types";

interface FinishedPhaseProps {
    GameComponent: any;
    connectedPeers: Connection[];
    playerInfos: PlayerInfo[];
    isInitiator: boolean;
    ledger: any[];
    onBackToLobby: () => void;
}

export function FinishedPhase({
    GameComponent,
    connectedPeers,
    playerInfos,
    isInitiator,
    ledger,
    onBackToLobby
}: FinishedPhaseProps) {
    return (
        <div className="space-y-6">
            <Suspense fallback={<div className="text-center p-20 animate-pulse">Finalizing Results...</div>}>
                <div className="opacity-80 pointer-events-none grayscale-[0.2]">
                    <GameComponent
                        connections={connectedPeers}
                        playerNames={playerInfos.map(p => p.name)}
                        playerInfos={playerInfos}
                        isInitiator={isInitiator}
                        ledger={ledger}
                        onAddLedger={() => { }} // Disabled in finished phase
                        onFinishGame={() => { }} // Already finished
                    />
                </div>
            </Suspense>
            <Card className="p-6 border-2 border-primary/20 bg-primary/5 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Match Finished</h3>
                            <p className="text-xs text-slate-500">The game has concluded. What's next?</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button onClick={onBackToLobby} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-bold">
                            Leave Room
                        </Button>
                    </div>
                </div>
            </Card>
            <div className="text-center text-slate-400 text-xs italic">
                You can review the game board above. Click "Leave Room" to start a new match.
            </div>
        </div>
    );
}
