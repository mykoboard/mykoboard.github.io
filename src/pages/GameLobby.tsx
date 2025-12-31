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
        <div className="min-h-screen bg-slate-50/50">
            <div className="max-w-7xl mx-auto p-6 space-y-8">
                <Header />
                <h1 className="text-2xl font-bold">{game.name}</h1>

                <div className="space-y-8">
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
                        <div className="space-y-6">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mb-4 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all group"
                                onClick={() => setSignalingMode(null)}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                Back to Mode Selection
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
