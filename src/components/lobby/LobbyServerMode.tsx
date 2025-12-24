import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Search } from "lucide-react";
import { SignalingService } from "../../lib/signaling";

interface LobbyServerModeProps {
    isServerConnecting: boolean;
    availableOffers: any[];
    signalingClient: SignalingService | null;
    onHostAGame: () => void;
    onJoinFromList: (offer: any) => void;
}

export function LobbyServerMode({
    isServerConnecting,
    availableOffers,
    signalingClient,
    onHostAGame,
    onJoinFromList
}: LobbyServerModeProps) {
    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Active Game Rooms
                </h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => signalingClient?.requestOffers()} className="h-7 text-[10px]">
                        Refresh List
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onHostAGame} className="h-7 text-[10px]">
                        Host My Own
                    </Button>
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
                    <Button variant="link" size="sm" onClick={onHostAGame} className="mt-2 text-primary font-bold">Be the first to host!</Button>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {availableOffers.map((offer) => (
                        <Card
                            key={offer.connectionId}
                            className="p-4 flex items-center justify-between hover:border-primary/40 hover:shadow-md transition-all bg-white border-2 border-slate-100 rounded-xl group cursor-pointer"
                            onClick={() => onJoinFromList(offer)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary group-hover:scale-105 transition-transform">
                                    {offer.peerName?.[0] || "?"}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{offer.peerName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Accepting Players</p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white border-none shadow-none font-bold px-4"
                            >
                                Join
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
