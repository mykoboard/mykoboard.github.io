import { useState, Suspense, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Clipboard, UserPlus, LogIn, CheckCircle2 } from "lucide-react";
import { Connection, ConnectionStatus } from "../lib/webrtc";
import { getGameById } from "../lib/GameRegistry";

function SignalingStep({ connection, onOfferChange, onAnswerChange }: any) {
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
    </div>
  );
}

function PlayerList({ players }: { players: string[] }) {
  return (
    <Card className="p-6 bg-white shadow-sm border-primary/10">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
        <UserPlus className="w-4 h-4" />
        Connected Players ({players.length})
      </h3>
      <div className="space-y-3">
        {players.map((name, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-left-2 transition-all">
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            <span className="text-sm font-medium text-slate-700">{name}</span>
            {i === 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-auto">You</span>}
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-4">Waiting for players to join...</p>
        )}
      </div>
    </Card>
  );
}

export default function Board() {
  const { gameId, boardId } = useParams();
  const game = useMemo(() => getGameById(gameId || ""), [gameId]);

  const [connections, setConnections] = useState(new Map());
  const [isInitiator, setIsInitiator] = useState(false);

  const updateConnection = (connection: Connection) => {
    setConnections(new Map(connections.set(connection.id, connection)));
  };

  const addInitiatorConnection = () => {
    setIsInitiator(true);
    const connection = new Connection(updateConnection);
    connection.openDataChannel();
    connection.prepareOfferSignal(localStorage.getItem("playerName") || "Host");
    updateConnection(connection);
  };

  const connectWithOffer = () => {
    setIsInitiator(false);
    const connection = new Connection(updateConnection);
    connection.status = ConnectionStatus.readyToAccept;
    connection.setDataChannelCallback();
    updateConnection(connection);
  };

  const updateOffer = async (connection: Connection, offer: string) => {
    if (!(connection instanceof Connection) || !offer) return;
    try {
      await connection.acceptOffer(offer, localStorage.getItem("playerName") || "Guest");
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

  const connectionList = Array.from(connections.values());
  const connectedPeers = connectionList.filter(c => c.status === ConnectionStatus.connected);
  const pendingSignaling = connectionList.filter(c => c.status !== ConnectionStatus.connected);
  const isConnected = connectedPeers.length > 0;

  const playerNames = [
    localStorage.getItem("playerName") || "Host",
    ...connectedPeers.map(c => c.remotePlayerName || "Anonymous")
  ];

  const leaveGame = () => {
    connectionList.forEach(c => c.close());
    setConnections(new Map());
    setIsInitiator(false);
  };

  if (!game) {
    return <div className="p-10 text-center">Game not found</div>;
  }

  const GameComponent = game.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Header pageTitle={isConnected ? game.name : "Lobby"} />
          {connectionList.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveGame}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              Leave Game
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
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Player List */}
            <PlayerList players={playerNames} />
          </div>
        )}

        {isConnected && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-700 space-y-8">
            <Suspense fallback={<div className="text-center p-20 animate-pulse">Loading Game...</div>}>
              <GameComponent
                connection={connectedPeers[0]} // Still passing first for now
                isInitiator={isInitiator}
              />
            </Suspense>

            <PlayerList players={playerNames} />
          </div>
        )}
      </div>
    </div>
  );
}

