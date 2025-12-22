import { useState, Suspense, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Clipboard, UserPlus, LogIn, CheckCircle2, UserMinus } from "lucide-react";
import { Connection, ConnectionStatus } from "../lib/webrtc";
import { getGameById } from "../lib/GameRegistry";
import { Ledger } from "../lib/ledger";

function SignalingStep({ connection, onOfferChange, onAnswerChange, onCancel }: any) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {connection.status === ConnectionStatus.new && (
        <Card className="p-4 border-2 border-dashed border-primary/20 bg-primary/5 flex items-center justify-center space-x-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <p className="text-sm text-gray-500">Generating invite signal...</p>
        </Card>
      )}

      {connection.status === ConnectionStatus.readyToAccept && (
        <Card className="p-6 border-2 border-dashed border-primary/20 bg-primary/5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            Paste Join Offer
          </h3>
          <p className="text-sm text-gray-500 mb-4">Paste the offer string shared by your friend below.</p>
          <Input
            placeholder="Paste offer string here..."
            className="font-mono text-xs"
            onChange={(e) => onOfferChange(connection, e.target.value)}
          />
        </Card>
      )}

      {connection.status === ConnectionStatus.started && (
        <Card className="p-6 border-2 border-primary/20 bg-white shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-700">
            <UserPlus className="w-4 h-4 text-primary" />
            Active Invite
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 relative group min-h-[60px] flex items-center">
              {connection.signal ? (
                <>
                  <div className="text-[10px] font-mono break-all line-clamp-2 text-gray-500 pr-8">
                    {connection.signal.toString()}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(connection.signal.toString())}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clipboard className="w-3 h-3 text-gray-400" />}
                  </Button>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">Gathering connection details...</div>
              )}
            </div>
            <p className="text-xs text-gray-500">Share this invite with a friend. Once they join, their answer will appear here automatically.</p>
            <Input
              placeholder="Friend's answer will appear here..."
              className="font-mono text-[10px] h-8"
              onChange={(e) => onAnswerChange(connection, e.target.value)}
            />
          </div>
        </Card>
      )}

      {connection.status === ConnectionStatus.answered && (
        <Card className="p-6 border-2 border-primary/20 bg-white shadow-sm">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            Answer Generated
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 relative group min-h-[60px] flex items-center">
              {connection.signal ? (
                <>
                  <div className="text-[10px] font-mono break-all line-clamp-2 text-gray-500 pr-8">
                    {connection.signal.toString()}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7"
                    onClick={() => copyToClipboard(connection.signal.toString())}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clipboard className="w-3 h-3 text-gray-400" />}
                  </Button>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">Finalizing answer...</div>
              )}
            </div>
            <p className="text-xs text-green-600 font-medium">Send this answer back to your friend to complete the connection.</p>
          </div>
        </Card>
      )}

      {onCancel && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancel(connection)}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            Cancel Invite
          </Button>
        </div>
      )}
    </div>
  );
}

interface PlayerInfo {
  id: string;
  name: string;
  status: 'lobby' | 'game';
  isConnected: boolean;
  isLocal: boolean;
}

function PlayerList({ players, onRemove }: { players: PlayerInfo[], onRemove?: (id: string) => void }) {
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

import { useMachine } from "@xstate/react";
import { lobbyMachine } from "../machines/lobbyMachine";
import { createLobbyMessage, isLobbyMessage } from "../lib/network";

// ... (SignalingStep and PlayerList remain the same)

export default function Board() {
  const { gameId, boardId } = useParams();
  const game = useMemo(() => getGameById(gameId || ""), [gameId]);

  const [state, send] = useMachine(lobbyMachine, {
    input: {
      playerName: localStorage.getItem("playerName") || "Anonymous"
    }
  });

  const { connections, isInitiator, isGameStarted } = state.context;
  const view = state.matches('room.game') ? 'game' as const : 'lobby' as const;

  const updateConnection = (connection: Connection) => {
    // Use multi-listener pattern for room lifecycle
    const handleLobbyMessage = (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (!isLobbyMessage(msg)) return;

        if (msg.type === 'START_GAME') send({ type: 'START_GAME' });
        if (msg.type === 'GAME_STARTED') send({ type: 'GAME_STARTED' });
        if (msg.type === 'SYNC_PLAYER_STATUS') {
          send({ type: 'SET_PLAYER_STATUS', playerId: connection.id, status: msg.payload });
        }
        if (msg.type === 'SYNC_LEDGER') {
          send({ type: 'SYNC_LEDGER', ledger: msg.payload });
        }
      } catch (e) { }
    };

    connection.addMessageListener(handleLobbyMessage);

    // If already connected, sync our status immediately
    if (connection.status === ConnectionStatus.connected) {
      connection.send(JSON.stringify(createLobbyMessage('SYNC_PLAYER_STATUS', view)));
    }

    send({ type: 'UPDATE_CONNECTION', connection });
  };

  const addInitiatorConnection = () => {
    send({ type: 'HOST' });
    const connection = new Connection(updateConnection);
    connection.onClose = () => send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
    connection.openDataChannel();
    connection.prepareOfferSignal(state.context.playerName);
    updateConnection(connection);
  };

  const connectWithOffer = () => {
    send({ type: 'JOIN' });
    const connection = new Connection(updateConnection);
    connection.onClose = () => send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
    connection.status = ConnectionStatus.readyToAccept;
    connection.setDataChannelCallback();
    updateConnection(connection);
  };

  const updateOffer = async (connection: Connection, offer: string) => {
    if (!(connection instanceof Connection) || !offer) return;
    try {
      await connection.acceptOffer(offer, state.context.playerName);
    } catch (e) {
      console.error("Failed to accept offer", e);
    }
  };

  const updateAnswer = (connection: Connection, answer: string) => {
    if (!(connection instanceof Connection) || !answer) return;
    try {
      connection.acceptAnswer(answer);
      updateConnection(connection);
    } catch (e) {
      console.error("Failed to accept answer", e);
    }
  };

  const startGame = () => {
    send({ type: 'START_GAME' });
  };

  const backToLobby = () => {
    send({ type: 'BACK_TO_LOBBY' });
  };

  const connectionList = Array.from(connections.values());
  const connectedPeers = connectionList.filter(c => c.status === ConnectionStatus.connected);
  const pendingSignaling = connectionList.filter(c => c.status !== ConnectionStatus.connected && c.status !== ConnectionStatus.closed);
  const isConnected = state.matches('room');

  // Broadcast local status when view changes
  useEffect(() => {
    if (isConnected) {
      connectedPeers.forEach(c => {
        c.send(JSON.stringify(createLobbyMessage('SYNC_PLAYER_STATUS', view)));
      });
    }
  }, [view, isConnected, connectedPeers.length]);

  const playerInfos: PlayerInfo[] = [
    {
      id: 'local',
      name: state.context.playerName,
      status: view,
      isConnected: true,
      isLocal: true
    },
    ...connectionList.map(c => ({
      id: c.id,
      name: c.remotePlayerName || "Anonymous",
      status: state.context.playerStatuses.get(c.id) || 'lobby',
      isConnected: c.status === ConnectionStatus.connected,
      isLocal: false
    }))
  ];

  const playerNames = [
    state.context.playerName,
    ...connectedPeers.map(c => c.remotePlayerName || "Anonymous")
  ];

  const closeSession = () => {
    send({ type: 'CLOSE_SESSION' });
  };

  const onAddLedger = async (action: { type: string, payload: any }) => {
    if (!isInitiator) return;
    const ledger = Ledger.fromEntries(state.context.ledger);
    await ledger.addEntry(action);
    const updatedLedger = ledger.getEntries();

    send({ type: 'SYNC_LEDGER', ledger: updatedLedger });

    connectedPeers.forEach(c => {
      c.send(JSON.stringify(createLobbyMessage('SYNC_LEDGER', updatedLedger)));
    });
  };

  if (!game) {
    return <div className="p-10 text-center">Game not found</div>;
  }

  const GameComponent = game.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Header pageTitle={isConnected ? (view === 'game' ? game.name : "Room Lobby") : "Lobby Setup"} />
          {connectionList.length > 0 && view === 'game' && (
            <Button
              variant="outline"
              size="sm"
              onClick={backToLobby}
            >
              Back to Lobby
            </Button>
          )}
        </div>

        {!isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Left Column: Actions */}
            <div className="space-y-6 md:col-span-2">
              {!connectionList.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-6 flex flex-col items-center text-center space-y-4 hover:shadow-lg transition-all border-2 border-primary/10">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Host a Game</h2>
                      <p className="text-xs text-gray-500 mt-1">Start a session and invite friends.</p>
                    </div>
                    <Button onClick={addInitiatorConnection} className="w-full">
                      Create Session
                    </Button>
                  </Card>

                  <Card className="p-6 flex flex-col items-center text-center space-y-4 hover:shadow-lg transition-all border-2 border-primary/10">
                    <div className="h-12 w-12 bg-secondary/20 rounded-full flex items-center justify-center">
                      <LogIn className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Join a Game</h2>
                      <p className="text-xs text-gray-500 mt-1">Use an invite string from a friend.</p>
                    </div>
                    <Button onClick={connectWithOffer} variant="secondary" className="w-full">
                      Join Session
                    </Button>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Host can generate more invites */}
                  {isInitiator && (
                    <Button
                      onClick={addInitiatorConnection}
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Generate Another Invite
                    </Button>
                  )}

                  {pendingSignaling.map((conn) => (
                    <SignalingStep
                      key={conn.id}
                      connection={conn}
                      onOfferChange={updateOffer}
                      onAnswerChange={updateAnswer}
                      onCancel={(c) => c.close()}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Player List */}
            <PlayerList
              players={playerInfos}
              onRemove={(id) => send({ type: 'REMOVE_PLAYER', playerId: id })}
            />
          </div>
        )}

        {isConnected && view === 'lobby' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card className="p-8 text-center space-y-6 border-2 border-primary/10 bg-white/50 backdrop-blur-sm">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-800">Room Lobby</h2>
                  <p className="text-slate-500">Wait for all players to join before starting the game.</p>
                </div>

                {isInitiator ? (
                  <Button
                    onClick={startGame}
                    size="lg"
                    className={`w-full max-w-xs h-12 text-lg shadow-lg transition-all ${isGameStarted
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200"
                      : "hover:shadow-primary/20"
                      }`}
                  >
                    {isGameStarted ? "Return to Game" : "Start Game"}
                  </Button>
                ) : (
                  isGameStarted ? (
                    <Button
                      onClick={() => send({ type: 'GAME_STARTED' })}
                      size="lg"
                      className="w-full max-w-xs h-12 text-lg shadow-lg bg-green-600 hover:bg-green-700 text-white shadow-green-200"
                    >
                      Return to Game
                    </Button>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <p className="text-sm font-medium text-slate-600 animate-pulse text-primary">Waiting for Host to start...</p>
                    </div>
                  )
                )}
              </Card>

              {/* Still allow hosting more players from the lobby */}
              {isInitiator && (
                <div className="space-y-4">
                  <Button
                    onClick={addInitiatorConnection}
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite More Players
                  </Button>

                  {pendingSignaling.map((conn) => (
                    <SignalingStep
                      key={conn.id}
                      connection={conn}
                      onOfferChange={updateOffer}
                      onAnswerChange={updateAnswer}
                      onCancel={(c) => c.close()}
                    />
                  ))}
                </div>
              )}
            </div>
            <PlayerList
              players={playerInfos}
              onRemove={(id) => send({ type: 'REMOVE_PLAYER', playerId: id })}
            />
          </div>
        )}

        {isConnected && view === 'game' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-700 space-y-8">
            <Suspense fallback={<div className="text-center p-20 animate-pulse">Loading Game...</div>}>
              <GameComponent
                connections={connectedPeers}
                playerNames={playerInfos.map(p => p.name)}
                isInitiator={isInitiator}
                ledger={state.context.ledger}
                onAddLedger={onAddLedger}
              />
            </Suspense>

            <PlayerList
              players={playerInfos}
              onRemove={(id) => send({ type: 'REMOVE_PLAYER', playerId: id })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

