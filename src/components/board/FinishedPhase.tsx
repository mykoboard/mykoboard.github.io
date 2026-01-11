import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Connection } from "../../lib/webrtc";
import { PlayerInfo } from "@mykoboard/integration";

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
            <div className="glass-dark p-8 border border-white/5 shadow-glass-dark rounded-[2.5rem] animate-in slide-in-from-bottom-6 duration-700">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-neon">
                            <CheckCircle2 className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Match Finalized</h3>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">All cycles complete. Handshake terminated.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <Button
                            onClick={onBackToLobby}
                            className="w-full md:w-56 h-14 rounded-2xl bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] font-black uppercase tracking-[0.3em] text-xs transition-all"
                        >
                            Return to Discovery
                        </Button>
                    </div>
                </div>
            </div>
            <div className="text-center text-white/10 text-[9px] font-black uppercase tracking-[0.4em] italic pt-4">
                Node state captured. Verification record locked inside vault.
            </div>
        </div>
    );
}
