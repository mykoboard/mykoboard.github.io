import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Search } from "lucide-react";
import { SignalingService, SignalingSlot } from "../../lib/signaling";
import { PlayerCountSelector } from "./PlayerCountSelector";

interface LobbyServerModeProps {
    isServerConnecting: boolean;
    availableOffers: any[];
    signalingClient: SignalingService | null;
    onHostAGame: (playerCount?: number) => void;
    onJoinFromList: (session: any, slot: any) => void;
    minPlayers?: number;
    maxPlayers?: number;
}

export function LobbyServerMode({
    isServerConnecting,
    availableOffers,
    signalingClient,
    onHostAGame,
    onJoinFromList,
    minPlayers = 2,
    maxPlayers = 4
}: LobbyServerModeProps) {
    const [playerCount, setPlayerCount] = useState(maxPlayers);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700 w-full">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-3">
                    <Globe className="w-5 h-5 text-blue-400" />
                    Discovery Mesh: Active Rooms
                </h3>
                <div className="flex items-center gap-6">
                    <PlayerCountSelector
                        value={playerCount}
                        onChange={setPlayerCount}
                        min={minPlayers}
                        max={maxPlayers}
                    />
                    <div className="flex gap-3">
                        <Button variant="ghost" size="sm" onClick={() => signalingClient?.requestOffers()} className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl">
                            Rescan Network
                        </Button>
                        <Button
                            onClick={() => onHostAGame(playerCount)}
                            className="h-10 px-4 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] rounded-xl"
                        >
                            Initialize Host
                        </Button>
                    </div>
                </div>
            </div>

            {isServerConnecting && (
                <div className="text-center py-12 space-y-4 glass-dark rounded-[2rem] border border-white/5">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
                    <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] animate-pulse">Synchronizing with global mesh...</p>
                </div>
            )}

            {!isServerConnecting && availableOffers.length === 0 ? (
                <div className="p-20 text-center border border-white/5 bg-white/5 rounded-[3rem] backdrop-blur-sm">
                    <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 group-hover:scale-110 transition-transform">
                        <Search className="w-10 h-10 text-white/20" />
                    </div>
                    <p className="text-xs text-white/30 uppercase font-black tracking-[0.2em]">Null Results: No active nodes found</p>
                    <Button variant="link" size="sm" onClick={() => onHostAGame(playerCount)} className="mt-4 text-primary font-black uppercase tracking-widest text-[10px] hover:text-primary/70">Broadcasting first signal...</Button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {availableOffers.map((session) => (
                        <div
                            key={session.boardId}
                            className="glass-dark p-8 flex items-center justify-between border border-white/5 rounded-[2.5rem] shadow-glass-dark hover:border-primary/20 transition-all duration-500 group"
                        >
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center font-black text-primary text-2xl border border-white/10 shadow-neon-sm">
                                    {session.peerName?.[0] || "?"}
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-white text-xl uppercase tracking-tight">{session.peerName}'s Instance</p>
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-2 w-2 rounded-full bg-primary shadow-neon animate-pulse"></span>
                                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">
                                            {session.slots?.filter(s => s.status === 'open').length} Vectors Available
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-[2rem] border border-white/10">
                                {session.slots?.map((slot, idx) => (
                                    <div
                                        key={slot.connectionId}
                                        onClick={() => slot.status === 'open' && onJoinFromList(session, slot)}
                                        className={`
                                            h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-500
                                            ${slot.status === 'open'
                                                ? 'border-primary/20 border-dashed cursor-pointer hover:border-primary hover:bg-primary/10 hover:shadow-neon-sm bg-primary/5'
                                                : 'border-white/5 bg-white/5 cursor-not-allowed opacity-30'}
                                        `}
                                        title={slot.status === 'open' ? 'Join Game' : `Occupied by ${slot.peerName || 'Entity'}`}
                                    >
                                        {slot.status === 'open' ? (
                                            <span className="text-[9px] font-black text-primary uppercase tracking-tighter">JOIN</span>
                                        ) : (
                                            <div className="h-6 w-6 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-black text-white/50 uppercase overflow-hidden border border-white/10">
                                                {slot.peerName?.[0] || 'P'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
