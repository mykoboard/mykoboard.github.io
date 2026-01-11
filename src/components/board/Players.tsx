import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserPlus, UserMinus } from "lucide-react";
import { PlayerInfo } from "@mykoboard/integration";

export function PlayerList({ players, onRemove }: { players: PlayerInfo[], onRemove?: (id: string) => void }) {
    return (
        <div className="glass-dark p-8 rounded-[2rem] border border-white/5 shadow-glass-dark">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-primary" />
                Dwellers In Lobby ({players.length})
            </h3>
            <div className="space-y-4">
                {players.map((player) => (
                    <div key={player.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:neon-border transition-all duration-500 animate-in fade-in slide-in-from-left-4">
                        <div className="relative">
                            <div className={`h-3 w-3 rounded-full ${player.isConnected ? 'bg-primary shadow-neon' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'}`}></div>
                            {player.isConnected && <div className="absolute inset-0 h-3 w-3 bg-primary rounded-full animate-ping opacity-50"></div>}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-white uppercase tracking-tight">{player.name} {player.isLocal && <span className="text-primary font-black ml-1">(LOCAL)</span>}</span>
                            <span className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">{player.status}</span>
                        </div>
                        {!player.isConnected && (
                            <div className="ml-auto flex items-center gap-3">
                                <span className="text-[9px] text-rose-500 font-black uppercase tracking-widest">Node Disconnected</span>
                                {onRemove && !player.isLocal && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                        onClick={() => onRemove(player.id)}
                                        title="Sever entry"
                                    >
                                        <UserMinus className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                        {player.isConnected && player.isLocal && (
                            <div className="ml-auto">
                                <span className="text-[9px] text-primary font-black uppercase tracking-widest px-2 py-0.5 border border-primary/20 rounded-md">Authorized</span>
                            </div>
                        )}
                    </div>
                ))}
                {players.length === 0 && (
                    <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.3em] text-center py-6 animate-pulse">Scanning for incoming nodes...</p>
                )}
            </div>
        </div>
    );
}
