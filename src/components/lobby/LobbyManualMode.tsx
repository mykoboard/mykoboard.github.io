import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, LogIn } from "lucide-react";
import { PlayerCountSelector } from "./PlayerCountSelector";

interface LobbyManualModeProps {
    onHostAGame: (playerCount?: number) => void;
    connectWithOffer: () => void;
    minPlayers?: number;
    maxPlayers?: number;
}

export function LobbyManualMode({
    onHostAGame,
    connectWithOffer,
    minPlayers = 2,
    maxPlayers = 4
}: LobbyManualModeProps) {
    const navigate = useNavigate();
    const { gameId } = useParams();
    const [playerCount, setPlayerCount] = useState(maxPlayers);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 animate-in slide-in-from-bottom-6 duration-700 w-full">
            <div className="glass-dark p-10 flex flex-col items-center text-center space-y-8 border border-white/5 hover:border-primary/30 shadow-glass-dark hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] transition-all duration-500 rounded-[2.5rem] group cursor-pointer"
                onClick={() => onHostAGame(playerCount)}>
                <div className="h-20 w-20 bg-primary/5 rounded-[2rem] flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform shadow-neon-sm">
                    <UserPlus className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-3">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Host Instance</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black leading-relaxed max-w-[200px] mb-4">
                        Initialize a new node session and broadcast invite vector.
                    </p>
                    <PlayerCountSelector
                        value={playerCount}
                        onChange={setPlayerCount}
                        min={minPlayers}
                        max={maxPlayers}
                    />
                </div>
                <Button className="w-full h-14 rounded-2xl bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] font-black uppercase tracking-[0.3em] text-xs transition-all pointer-events-none">
                    Generate Session
                </Button>
            </div>

            <div className="glass-dark p-10 flex flex-col items-center text-center space-y-8 border border-white/5 hover:border-white/20 shadow-glass-dark transition-all duration-500 rounded-[2.5rem] group cursor-pointer"
                onClick={() => {
                    connectWithOffer();
                    navigate(`/games/${gameId}/manual`);
                }}>
                <div className="h-20 w-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <LogIn className="w-10 h-10 text-white/70" />
                </div>
                <div className="space-y-3">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Bridge Session</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black leading-relaxed max-w-[200px]">
                        Receive external node signal to enter existing match.
                    </p>
                </div>
                <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 text-white/70 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-xs transition-all pointer-events-none mt-auto">
                    Initialize Bridge
                </Button>
            </div>
        </div>
    );
}
