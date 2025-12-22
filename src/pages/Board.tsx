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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {connection.status === ConnectionStatus.new && (
        <Card className="p-6 border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center space-y-4 py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <Card className="p-6 border-2 border-primary/20 bg-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Share this Invite
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative group min-h-[80px] flex items-center">
              {connection.signal ? (
                <>
                  <div className="text-xs font-mono break-all line-clamp-3 text-gray-600 pr-10">
                    {connection.signal.toString()}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(connection.signal.toString())}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
                  </Button>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">Gathering connection details...</div>
              )}
            </div>
            <p className="text-sm text-gray-500">Wait for your friend to paste this invite and provide their answer below.</p>
            <Input
              placeholder="Paste friend's answer here..."
              className="font-mono text-xs"
              onChange={(e) => onAnswerChange(connection, e.target.value)}
            />
          </div>
        </Card>
      )}

      {connection.status === ConnectionStatus.answered && (
        <Card className="p-6 border-2 border-primary/20 bg-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Answer Generated
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative group min-h-[80px] flex items-center">
              {connection.signal ? (
                <>
                  <div className="text-xs font-mono break-all line-clamp-3 text-gray-600 pr-10">
                    {connection.signal.toString()}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(connection.signal.toString())}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
                  </Button>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">Finalizing answer...</div>
              )}
            </div>
            <p className="text-sm text-green-600">Send this answer back to your friend to complete the connection.</p>
          </div>
        </Card>
      )}
    </div>
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

  const activeConnection = Array.from(connections.values())[0];
  const isConnected = activeConnection?.status === ConnectionStatus.connected;

  if (!game) {
    return <div className="p-10 text-center">Game not found</div>;
  }

  const GameComponent = game.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Header pageTitle={isConnected ? game.name : "Lobby"} />

        {!activeConnection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 animate-in fade-in zoom-in duration-500">
            <Card className="p-8 flex flex-col items-center text-center space-y-6 hover:shadow-xl transition-shadow border-2 border-primary/10">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Host a Game</h2>
                <p className="text-gray-500 mt-2">Create a new session and invite a friend.</p>
              </div>
              <Button onClick={addInitiatorConnection} size="lg" className="w-full">
                Create Session
              </Button>
            </Card>

            <Card className="p-8 flex flex-col items-center text-center space-y-6 hover:shadow-xl transition-shadow border-2 border-primary/10">
              <div className="h-16 w-16 bg-secondary/20 rounded-full flex items-center justify-center">
                <LogIn className="w-8 h-8 text-secondary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Join a Game</h2>
                <p className="text-gray-500 mt-2">Paste an invite string to enter a friend's session.</p>
              </div>
              <Button onClick={connectWithOffer} size="lg" variant="secondary" className="w-full">
                Join Session
              </Button>
            </Card>
          </div>
        )}

        {activeConnection && !isConnected && (
          <SignalingStep
            connection={activeConnection}
            onOfferChange={updateOffer}
            onAnswerChange={updateAnswer}
          />
        )}

        {isConnected && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            <Suspense fallback={<div className="text-center p-20 animate-pulse">Loading Game...</div>}>
              <GameComponent
                connection={activeConnection}
                isInitiator={isInitiator}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}

