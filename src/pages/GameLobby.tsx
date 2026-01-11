import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { useGameSession } from "../contexts/GameSessionContext";
import { getGameById } from "../lib/GameRegistry";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LobbyModeSelection } from "@/components/lobby/LobbyModeSelection";
import { LobbyManualMode } from "@/components/lobby/LobbyManualMode";
import { LobbyServerMode } from "@/components/lobby/LobbyServerMode";

export default function GameLobby() {
    const { gameId, boardId } = useParams();
    const game = useMemo(() => getGameById(gameId || ""), [gameId]);

    const {
        signalingMode,
        setSignalingMode,
        state,
        send,
        signalingClient,
        availableOffers,
        activeSessions,
        isServerConnecting,
        onHostAGame,
        connectWithOffer,
        onJoinFromList,
        onDeleteSession
    } = useGameSession();

    if (!game) {
        return <div className="p-10 text-center">Game not found</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto p-6 space-y-12">
                <Header />

                <h1 className="text-3xl font-black tracking-tighter uppercase text-white">
                    Lobby: <span className="text-gradient">{game.name}</span>
                </h1>

                <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                    {!signalingMode && (
                        <LobbyModeSelection
                            onSelectManual={() => {
                                send({ type: 'CLOSE_SESSION' });
                                setSignalingMode('manual');
                            }}
                            onSelectServer={() => {
                                send({ type: 'CLOSE_SESSION' });
                                setSignalingMode('server');
                                send({ type: 'GOTO_LOBBY' });
                            }}
                        />
                    )}

                    {signalingMode && (
                        <div className="space-y-8">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mb-4 text-white/30 hover:text-primary hover:bg-primary/5 transition-all group font-black uppercase tracking-widest text-[10px]"
                                onClick={() => setSignalingMode(null)}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                De-initialize Mode
                            </Button>

                            {signalingMode === 'manual' && (
                                <LobbyManualMode
                                    onHostAGame={onHostAGame}
                                    connectWithOffer={connectWithOffer}
                                    minPlayers={game.minPlayers}
                                    maxPlayers={game.maxPlayers}
                                />
                            )}

                            {signalingMode === 'server' && (
                                <LobbyServerMode
                                    isServerConnecting={isServerConnecting}
                                    availableOffers={availableOffers}
                                    signalingClient={signalingClient}
                                    onHostAGame={onHostAGame}
                                    onJoinFromList={onJoinFromList}
                                    minPlayers={game.minPlayers}
                                    maxPlayers={game.maxPlayers}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
