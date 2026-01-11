import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { getGameById } from "../lib/GameRegistry";
import { useGameSession } from "../contexts/GameSessionContext";
import { PreparationPhase } from "../components/board/PreparationPhase";
import { ActivePhase } from "../components/board/ActivePhase";
import { FinishedPhase } from "../components/board/FinishedPhase";
import { PlayerList } from "../components/board/Players";

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

  const isFinished = state.matches('room.finished');

  if (!game) {
    return <div className="p-10 text-center">Game not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-12">
        <h1 className="text-3xl font-black tracking-tighter uppercase text-white">
          Lobby: <span className="text-gradient">{game.name}</span>
        </h1>

        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          {isFinished ? (
            <FinishedPhase
              GameComponent={game.component}
              connectedPeers={connectedPeers}
              playerInfos={playerInfos}
              isInitiator={isInitiator}
              ledger={state.context.ledger}
              onBackToLobby={onBackToDiscovery}
            />
          ) : isGameStarted ? (
            <ActivePhase
              GameComponent={game.component}
              connectedPeers={connectedPeers}
              playerInfos={playerInfos}
              isInitiator={isInitiator}
              ledger={state.context.ledger}
              onAddLedger={onAddLedger}
              onFinishGame={onFinishGame}
            />
          ) : (
            <PreparationPhase
              state={state}
              isInitiator={isInitiator}
              signalingMode={signalingMode}
              isServerConnecting={isServerConnecting}
              signalingClient={signalingClient}
              pendingSignaling={pendingSignaling}
              onStartGame={startGame}
              onHostAGame={onHostAGame}
              onUpdateOffer={updateOffer}
              onUpdateAnswer={updateAnswer}
              onCloseSession={onBackToGames}
              onBackToLobby={onBackToDiscovery}
              onAcceptGuest={onAcceptGuest}
              onRejectGuest={onRejectGuest}
              onRemovePlayer={(id) => send({ type: 'REMOVE_PLAYER', playerId: id })}
              playerCount={playerInfos.length}
              maxPlayers={state.context.maxPlayers}
              boardId={boardId}
            />
          )}

          <div className="mt-12 max-w-2xl">
            <PlayerList
              players={playerInfos}
              onRemove={isInitiator ? (id) => send({ type: 'REMOVE_PLAYER', playerId: id }) : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
