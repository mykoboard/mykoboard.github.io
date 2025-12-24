import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { getGameById } from "../lib/GameRegistry";
import { useGameSession } from "../contexts/GameSessionContext";
import { GameView } from "@/components/GameView";

export default function Board() {
  const { gameId, boardId } = useParams();
  const game = useMemo(() => getGameById(gameId || ""), [gameId]);

  const {
    state,
    send,
    signalingMode,
    signalingClient,
    isServerConnecting,
    playerInfos,
    connectedPeers,
    pendingSignaling,
    isInitiator,
    isGameStarted,
    onHostAGame,
    connectWithOffer,
    updateOffer,
    updateAnswer,
    startGame,
    onFinishGame,
    onAddLedger,
    handlePlayAgain,
    onAcceptGuest,
    onRejectGuest,
    onBackToGames,
    onBackToDiscovery
  } = useGameSession();

  if (!game) {
    return <div className="p-10 text-center">Game not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">{game.name}</h1>
        <GameView
          GameComponent={game.component}
          connectedPeers={connectedPeers}
          playerInfos={playerInfos}
          isInitiator={isInitiator}
          isGameStarted={isGameStarted}
          pendingSignaling={pendingSignaling}
          signalingMode={signalingMode}
          signalingClient={signalingClient}
          isServerConnecting={isServerConnecting}
          ledger={state.context.ledger}
          onAddLedger={onAddLedger}
          onFinishGame={onFinishGame}
          onRemovePlayer={(id) => send({ type: 'REMOVE_PLAYER', playerId: id })}
          onStartGame={startGame}
          onHostAGame={onHostAGame}
          onConnectWithOffer={connectWithOffer}
          onUpdateOffer={updateOffer}
          onUpdateAnswer={updateAnswer}
          onBackToLobby={onBackToDiscovery}
          onCloseSession={onBackToGames}
          onResetGame={handlePlayAgain}
          onAcceptGuest={onAcceptGuest}
          onRejectGuest={onRejectGuest}
          state={state}
          boardId={boardId} />
      </div>
    </div>
  );
}
