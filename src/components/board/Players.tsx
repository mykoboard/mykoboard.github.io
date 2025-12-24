import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserPlus, UserMinus } from "lucide-react";

export interface PlayerInfo {
    id: string;
    name: string;
    status: 'lobby' | 'game';
    isConnected: boolean;
    isLocal: boolean;
    isHost: boolean;
}

export function PlayerList({ players, onRemove }: { players: PlayerInfo[], onRemove?: (id: string) => void }) {
    return (
        <Card className="p-6 bg-white shadow-sm border-primary/10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Players ({players.length})
            </h3>
            <div className="space-y-3">
                {players.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-left-2 transition-all">
                        <div className={`h-2 w-2 rounded-full ${player.isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{player.name} {player.isLocal && "(You)"}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{player.status}</span>
                        </div>
                        {!player.isConnected && (
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-[10px] text-rose-500 font-bold">Offline</span>
                                {onRemove && !player.isLocal && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                        onClick={() => onRemove(player.id)}
                                        title="Remove player"
                                    >
                                        <UserMinus className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {players.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">Waiting for players to join...</p>
                )}
            </div>
        </Card>
    );
}
