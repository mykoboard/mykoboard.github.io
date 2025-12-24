import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, LogIn } from "lucide-react";

interface LobbyManualModeProps {
    onHostAGame: () => void;
    connectWithOffer: () => void;
}

export function LobbyManualMode({ onHostAGame, connectWithOffer }: LobbyManualModeProps) {
    const navigate = useNavigate();
    const { gameId } = useParams();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            <Card className="p-8 flex flex-col items-center text-center space-y-4 hover:shadow-xl transition-all border-2 border-primary/5 hover:border-primary/20 group cursor-pointer"
                onClick={onHostAGame}>
                <div className="h-14 w-14 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus className="w-7 h-7 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Host a Game</h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-[180px]">
                        Start a new secure match and invite your friends.
                    </p>
                </div>
                <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                    Create Session
                </Button>
            </Card>

            <Card className="p-8 flex flex-col items-center text-center space-y-4 hover:shadow-xl transition-all border-2 border-secondary/10 hover:border-secondary/30 group cursor-pointer"
                onClick={() => {
                    connectWithOffer();
                    navigate(`/games/${gameId}/manual`);
                }}>
                <div className="h-14 w-14 bg-secondary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LogIn className="w-7 h-7 text-secondary-foreground" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Join a Game</h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-[180px]">
                        Use a secure invite to connect to an existing match.
                    </p>
                </div>
                <Button variant="secondary" className="w-full rounded-xl">
                    Join Session
                </Button>
            </Card>
        </div>
    );
}
