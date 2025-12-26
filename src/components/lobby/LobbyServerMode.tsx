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
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Active Game Rooms
                </h3>
                <div className="flex items-center gap-4">
                    <PlayerCountSelector
                        value={playerCount}
                        onChange={setPlayerCount}
                        min={minPlayers}
                        max={maxPlayers}
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => signalingClient?.requestOffers()} className="h-7 text-[10px]">
                            Refresh List
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onHostAGame(playerCount)}
                            className="h-7 text-[10px]"
                        >
                            Host My Own
                        </Button>
                    </div>
                </div>
            </div>

            {isServerConnecting && (
                <div className="text-center py-4 space-y-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-[10px] text-slate-400 font-mono">Searching network...</p>
                </div>
            )}

            {!isServerConnecting && availableOffers.length === 0 ? (
                <Card className="p-12 text-center border-dashed bg-white/50 border-2 rounded-2xl">
                    <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">No active lobbies found for this game.</p>
                    <Button variant="link" size="sm" onClick={() => onHostAGame(playerCount)} className="mt-2 text-primary font-bold">Be the first to host!</Button>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {availableOffers.map((session) => (
                        <Card
                            key={session.boardId}
                            className="p-5 flex items-center justify-between bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center font-bold text-primary text-xl">
                                    {session.peerName?.[0] || "?"}
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-800 text-lg leading-none">{session.peerName}'s Lobby</p>
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                                        <p className="text-xs text-slate-400 font-medium tracking-tight">
                                            {session.slots?.filter(s => s.status === 'open').length} slots available
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                {session.slots?.map((slot, idx) => (
                                    <div
                                        key={slot.connectionId}
                                        onClick={() => slot.status === 'open' && onJoinFromList(session, slot)}
                                        className={`
                                            h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                            ${slot.status === 'open'
                                                ? 'border-primary/40 border-dashed cursor-pointer hover:border-primary hover:bg-primary/5 hover:scale-105 shadow-sm bg-white'
                                                : 'border-slate-200 bg-slate-200/50 cursor-not-allowed opacity-60'}
                                        `}
                                        title={slot.status === 'open' ? 'Join Game' : `Taken by ${slot.peerName || 'Player'}`}
                                    >
                                        {slot.status === 'open' ? (
                                            <span className="text-[10px] font-bold text-primary/40">JOIN</span>
                                        ) : (
                                            <div className="h-5 w-5 bg-slate-300 rounded-full flex items-center justify-center text-[8px] font-bold text-white uppercase overflow-hidden">
                                                {slot.peerName?.[0] || 'P'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
