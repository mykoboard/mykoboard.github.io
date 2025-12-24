import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { GameLobbyView } from "@/components/GameLobbyView";
import { useGameSession } from "../contexts/GameSessionContext";
import { getGameById } from "../lib/GameRegistry";
import { useMemo } from "react";

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
                <GameLobbyView
                    signalingMode={signalingMode}
                    setSignalingMode={setSignalingMode}
                    state={state}
                    send={send}
                    signalingClient={signalingClient}
                    availableOffers={availableOffers}
                    activeSessions={activeSessions}
                    isServerConnecting={isServerConnecting}
                    onHostAGame={onHostAGame}
                    connectWithOffer={connectWithOffer}
                    onJoinFromList={onJoinFromList}
                    onDeleteSession={onDeleteSession}
                    boardId={boardId}
                />
            </div>
        </div>
    );
}
