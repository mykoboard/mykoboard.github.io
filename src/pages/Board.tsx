import { useState, Suspense, useMemo, useEffect, useRef } from "react";
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
import { SecureWallet } from "../lib/wallet";
import { SignalingService } from "../lib/signaling";
import { SessionManager } from "../lib/sessions";
import { GameSession } from "../lib/db";
import { Globe, ArrowLeft, MousePointer2, ExternalLink, Search, History } from "lucide-react";

// ... (SignalingStep and PlayerList remain the same)

export default function Board() {
  const { gameId, boardId } = useParams();
  const game = useMemo(() => getGameById(gameId || ""), [gameId]);

  const [state, send] = useMachine(lobbyMachine, {
    input: {
      playerName: localStorage.getItem("playerName") || "Anonymous"
    }
  });

  const [signalingMode, setSignalingMode] = useState<'manual' | 'server' | null>(null);
  const [isServerConnecting, setIsServerConnecting] = useState(false);

  const { connections, isInitiator, isGameStarted } = state.context;
  const view = (state.matches('room.game') || state.matches('room.finished')) ? 'game' as const : 'lobby' as const;

  const connectionList = useMemo(() => Array.from(connections.values()), [connections]);
  const connectedPeers = useMemo(() => connectionList.filter(c => c.status === ConnectionStatus.connected), [connectionList]);
  const pendingSignaling = useMemo(() => connectionList.filter(c => c.status !== ConnectionStatus.connected && c.status !== ConnectionStatus.closed), [connectionList]);
  const isConnected = state.matches('room');

  const playerInfos = useMemo(() => [
    {
      id: 'local',
      name: state.context.playerName,
      status: view,
      isConnected: true,
      isLocal: true,
      isHost: isInitiator
    },
    ...connectionList.map(c => ({
      id: c.id,
      name: c.remotePlayerName || "Anonymous",
      status: state.context.playerStatuses.get(c.id) || 'lobby',
      isConnected: c.status === ConnectionStatus.connected,
      isLocal: false,
      isHost: false // For now assume only local can be host if they initiated. 
      // Actually in P2P initiator is host.
    }))
  ], [state.context.playerName, view, connectionList, state.context.playerStatuses, isInitiator]);

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
          // Verify signatures of new entries
          const verifyLedger = async () => {
            const entries = msg.payload as any[];
            for (const entry of entries) {
              if (entry.signature && entry.signerPublicKey) {
                const isValid = await SecureWallet.verify(entry.action, entry.signature, entry.signerPublicKey);
                if (!isValid) {
                  console.error("Invalid signature in ledger entry", entry);
                  return; // Reject bad ledger
                }
              }
            }
            send({ type: 'SYNC_LEDGER', ledger: msg.payload });
          };
          verifyLedger();
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

  const [signalingClient, setSignalingClient] = useState<SignalingService | null>(null);
  const [availableOffers, setAvailableOffers] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    const loadSessions = async () => {
      const sessions = await SessionManager.getSessions();
      setActiveSessions(sessions);
    };
    loadSessions();
  }, [state.value]);

  // Load existing session data for current board
  useEffect(() => {
    if (boardId) {
      const restoreSession = async () => {
        const session = await SessionManager.getSession(boardId);
        if (session && session.ledger.length > 0 && state.context.ledger.length === 0) {
          send({ type: 'LOAD_LEDGER', ledger: session.ledger });
        }
      };
      restoreSession();
    }
  }, [boardId]); // Only on mount/boardId change

  // Save session when entering room
  useEffect(() => {
    if (state.matches('room') && gameId && boardId) {
      SessionManager.saveSession({
        gameId,
        boardId,
        playerName: state.context.playerName,
        gameName: game.name,
        lastPlayed: Date.now(),
        status: (state.matches('room.finished') || state.matches('room.finished')) ? 'finished' : 'active',
        ledger: state.context.ledger,
        participants: playerInfos.map(p => ({
          name: p.name,
          isYou: p.isLocal,
          isHost: p.isHost
        }))
      });
    }
  }, [state.value, gameId, boardId, game.name, state.context.playerName, state.context.ledger, playerInfos]);

  // Sync ledger to DB on changes
  useEffect(() => {
    if (state.matches('room') && boardId && state.context.ledger.length > 0) {
      SessionManager.updateLedger(boardId, state.context.ledger);
    }
  }, [state.context.ledger, boardId, state.matches('room')]);

  // Ref to hold the latest connections and status for the signaling callback
  const signalingHandlerRef = useRef<(msg: any) => void>(undefined);

  useEffect(() => {
    signalingHandlerRef.current = (msg: any) => {
      console.log("Signaling message received (handler ref):", msg);
      if (msg.type === 'offerList') {
        setAvailableOffers(msg.offers || []);
      }
      if (msg.type === 'answer') {
        const connectionList = Array.from(state.context.connections.values());
        console.log("Processing answer via signaling. Active connections list size:", connectionList.length);
        const pendingConn = connectionList.find(c => c.status === ConnectionStatus.started);

        if (pendingConn) {
          // INTERCEPT for host approval
          if (signalingMode === 'server') {
            console.log("Host approval required for:", msg.peerName);
            send({
              type: 'REQUEST_JOIN',
              connectionId: msg.from,
              peerName: msg.peerName || "Anonymous Guest",
              answer: msg.answer,
              connection: pendingConn
            });
          } else {
            console.log("Manual mode: Accepting answer immediately.");
            pendingConn.acceptAnswer(msg.answer);
            updateConnection(pendingConn);
          }
        } else {
          console.warn("Received answer but no local connection is in 'started' status to receive it.");
        }
      }
    };
  }, [state.context.connections, state.context.playerName]);

  // Initialize Signaling Server (Delayed)
  useEffect(() => {
    // Only connect if we are in server mode AND we are in one of the active lobby states
    // IMPORTANT: Host MUST stay connected in 'room' state so they can deleteOffer when starting
    const isActiveLobby = state.matches('hosting') || state.matches('lobby') || state.matches('joining') || state.matches('approving');
    const isHostInRoom = state.matches('room') && isInitiator;
    const shouldConnect = signalingMode === 'server' && (isActiveLobby || isHostInRoom);

    if (shouldConnect && !signalingClient) {
      const initSignaling = async () => {
        setIsServerConnecting(true);
        try {
          const wallet = SecureWallet.getInstance();
          const identity = await wallet.getIdentity();
          if (!identity) return;

          const discoveryId = `lobby_${gameId}`;
          const client = new SignalingService(
            discoveryId,
            identity.name,
            (msg) => signalingHandlerRef.current?.(msg)
          );

          const challenge = `SIGN_IN:${identity.subscriptionToken}`;
          const signature = await wallet.sign(challenge);
          await client.connect(identity.subscriptionToken, identity.publicKey, signature);
          setSignalingClient(client);
          client.requestOffers(); // Initial fetch
        } catch (e) {
          console.error("Signaling connection failed", e);
        } finally {
          setIsServerConnecting(false);
        }
      };
      initSignaling();
    }

    // Disconnect only if we shouldn't be connected anymore
    if (!shouldConnect && signalingClient) {
      signalingClient.disconnect();
      setSignalingClient(null);
    }

    return () => {
      // Cleanup handled by the condition above or component unmount
    };
  }, [signalingMode, boardId, state.value]);

  const addInitiatorConnection = () => {
    send({ type: 'HOST' });
    const connection = new Connection(updateConnection);
    connection.onClose = () => send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
    connection.openDataChannel();
    connection.prepareOfferSignal(state.context.playerName);
    updateConnection(connection);

    // If in server mode, also broadcast the offer
    if (signalingMode === 'server' && signalingClient) {
      // Ensure we are registered first
      signalingClient.register();

      // We wait for the signal to be ready
      const checkSignal = setInterval(() => {
        if (connection.signal) {
          signalingClient.sendOffer(connection.signal);
          clearInterval(checkSignal);
        }
      }, 500);
    }
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
    console.log("Starting game. Cleanup signaling?", signalingMode === 'server', "Initiator?", isInitiator);
    if (signalingMode === 'server' && signalingClient && isInitiator) {
      signalingClient.deleteOffer();
    }
    send({ type: 'START_GAME' });
  };

  const backToLobby = () => {
    if (isInitiator && signalingMode === 'server' && signalingClient) {
      signalingClient.deleteOffer();
    }
    send({ type: 'BACK_TO_LOBBY' });
  };

  const playerNames = playerInfos.map(p => p.name);

  const closeSession = () => {
    send({ type: 'CLOSE_SESSION' });
  };

  const onFinishGame = () => {
    send({ type: 'FINISH_GAME' });
    if (boardId) {
      SessionManager.updateStatus(boardId, 'finished');
    }
  };

  const onAddLedger = async (action: { type: string, payload: any }) => {
    if (!isInitiator) return;

    const wallet = SecureWallet.getInstance();
    const identity = await wallet.getIdentity();
    if (!identity) return;

    // Sign the action
    const signature = await wallet.sign(action);

    const ledger = Ledger.fromEntries(state.context.ledger);
    const entry = await ledger.addEntry({
      ...action,
    });

    // Attach signature and public key to the entry
    entry.signature = signature;
    entry.signerPublicKey = identity.publicKey;

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
          <Header pageTitle={isConnected ? ((state.matches('room.game') || state.matches('room.finished')) ? game.name : "Room Lobby") : "Lobby Setup"} />
          {(state.matches('room.game') || state.matches('room.finished')) && (
            <Button
              variant="outline"
              size="sm"
              onClick={backToLobby}
            >
              Back to Lobby
            </Button>
          )}
        </div>

        {/* Setup Phase: Selection */}
        {!isConnected && !signalingMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95 duration-300">
            <Card className="p-8 flex flex-col items-center text-center space-y-6 hover:shadow-xl transition-all border-2 border-primary/5 group cursor-pointer" onClick={() => setSignalingMode('manual')}>
              <div className="h-20 w-20 bg-primary/5 rounded-3xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <MousePointer2 className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Manual Invite</h2>
                <p className="text-sm text-slate-500">Copy-paste signaling strings. 100% Private & Serverless.</p>
              </div>
              <Button variant="outline" className="w-full rounded-xl">Private Mode</Button>
            </Card>

            <Card
              className="p-8 flex flex-col items-center text-center space-y-6 hover:shadow-xl transition-all border-2 border-primary/5 group cursor-pointer relative overflow-hidden"
              onClick={() => {
                setSignalingMode('server');
                send({ type: 'GOTO_LOBBY' });
              }}
            >
              <div className="absolute top-3 right-3 px-2 py-0.5 bg-yellow-400 text-[10px] font-bold rounded-full uppercase tracking-tighter">Alpha</div>
              <div className="h-20 w-20 bg-blue-50 rounded-3xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Globe className="w-10 h-10 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Global Online</h2>
                <p className="text-sm text-slate-500">Seamless connection via global signaling server.</p>
              </div>
              <Button variant="outline" className="w-full rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50">Experimental Mode</Button>
            </Card>
          </div>
        )}

        {!isConnected && signalingMode && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start relative">
            {/* Host Approval Overlay */}
            {state.matches('approving') && state.context.pendingGuest && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <Card className="p-8 w-full max-w-md shadow-2xl border-2 border-primary/20 space-y-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserPlus className="w-8 h-8 text-primary animate-bounce" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Join Request</h2>
                      <p className="text-slate-500 mt-1">
                        <span className="font-bold text-primary">{state.context.pendingGuest.name}</span> wants to join your game.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => send({ type: 'REJECT_GUEST' })}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      Decline
                    </Button>
                    <Button
                      onClick={() => {
                        send({ type: 'ACCEPT_GUEST' });
                        // Update the connection view after acceptance
                        if (state.context.pendingGuest) {
                          updateConnection(state.context.pendingGuest.connection);
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Accept Player
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Left Column: Actions */}
            <div className="space-y-6 md:col-span-2">
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 text-slate-400 hover:text-slate-600"
                onClick={() => setSignalingMode(null)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Mode
              </Button>

              {state.matches('idle') && signalingMode === 'manual' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-6 flex flex-col items-center text-center space-y-4 hover:shadow-lg transition-all border-2 border-primary/10">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Host a Game</h2>
                      <p className="text-xs text-gray-500 mt-1">
                        {signalingMode === 'manual' ? "Start a session and share invite string." : "Posting lobby to global server..."}
                      </p>
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
                      <p className="text-xs text-gray-500 mt-1">
                        {signalingMode === 'manual' ? "Use an invite string from a friend." : "Join automatically via Board ID."}
                      </p>
                    </div>
                    <Button onClick={connectWithOffer} variant="secondary" className="w-full">
                      Join Session
                    </Button>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4">
                  {signalingMode === 'manual' ? (
                    <>
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
                    </>
                  ) : (
                    <div className="space-y-4">
                      {state.matches('hosting') || (state.matches('room') && isInitiator) ? (
                        <Card className="p-8 text-center space-y-4 bg-blue-50/30 border-2 border-dashed border-blue-200">
                          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                            <Globe className={`w-6 h-6 text-blue-500 animate-pulse`} />
                          </div>
                          <div>
                            <h3 className="font-bold">Broadcasting Lobby...</h3>
                            <p className="text-sm text-slate-500">Other players can now see your game in the discovery list.</p>
                            {!signalingClient?.isConnected && <p className="text-[10px] text-red-500 mt-2">Signaling Server Offline</p>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={backToLobby}>
                            Cancel & Back to Discovery
                          </Button>
                        </Card>
                      ) : state.matches('joining') ? (
                        <Card className="p-8 text-center space-y-4 bg-secondary/10 border-2 border-dashed">
                          <div className="h-12 w-12 bg-secondary/20 rounded-full flex items-center justify-center mx-auto animate-spin">
                            <LogIn className="w-6 h-6 text-secondary-foreground" />
                          </div>
                          <div>
                            <h3 className="font-bold">Joining Game...</h3>
                            <p className="text-sm text-slate-500">Establishing WebRTC connection with host.</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => send({ type: 'BACK_TO_LOBBY' })}>
                            Cancel
                          </Button>
                        </Card>
                      ) : (
                        <div className="grid gap-3">
                          {/* Active Sessions Section */}
                          {activeSessions.length > 0 && (
                            <div className="space-y-3 mb-6">
                              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <History className="w-3 h-3" />
                                Your Recent Matches
                              </h3>
                              <div className="grid gap-2">
                                {activeSessions.map((session) => (
                                  <Card
                                    key={session.boardId}
                                    className={`p-3 border-l-4 ${session.boardId === boardId ? 'border-l-primary' : 'border-l-slate-200'} ${session.status === 'finished' ? 'opacity-75' : ''} hover:border-l-primary transition-all cursor-pointer group flex items-center justify-between bg-white shadow-sm`}
                                    onClick={() => {
                                      if (session.boardId !== boardId) {
                                        window.location.href = `/games/lobby/${session.gameId}/${session.boardId}`;
                                      } else {
                                        // If already on this board, just resume the UI state
                                        send({ type: 'RESUME' });
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`h-8 w-8 ${session.status === 'finished' ? 'bg-green-50' : 'bg-slate-100'} rounded-lg flex items-center justify-center`}>
                                        {session.status === 'finished' ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                          <History className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-bold text-slate-700">{session.gameName}</p>
                                          {session.status === 'finished' && (
                                            <span className="text-[8px] bg-green-100 text-green-600 px-1 rounded uppercase font-bold">Finished</span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {session.participants?.map((p, i) => (
                                            <span key={i} className={`text-[8px] px-1 rounded-sm border ${p.isYou ? 'bg-primary/10 border-primary/20 text-primary font-bold' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                              {p.isYou ? 'You' : p.name}{p.isHost && ' 👑'}
                                            </span>
                                          ))}
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-1">Board: {session.boardId.slice(0, 8)}... • {new Date(session.lastPlayed).toLocaleTimeString()}</p>
                                      </div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              Available Lobbies
                            </h3>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => signalingClient?.requestOffers()} className="h-7 text-[10px]">
                                Refresh List
                              </Button>
                              <Button variant="secondary" size="sm" onClick={addInitiatorConnection} className="h-7 text-[10px]">
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
                            <Card className="p-12 text-center border-dashed bg-white/50">
                              <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-6 h-6 text-slate-300" />
                              </div>
                              <p className="text-sm text-slate-400">No active lobbies found for this game.</p>
                              <Button variant="link" size="sm" onClick={addInitiatorConnection} className="mt-2 text-primary">Be the first to host!</Button>
                            </Card>
                          ) : (
                            availableOffers.map((offer) => (
                              <Card key={offer.connectionId} className="p-4 flex items-center justify-between hover:border-primary/50 transition-colors bg-white shadow-sm border-2">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary">
                                    {offer.peerName?.[0] || "?"}
                                  </div>
                                  <div>
                                    <p className="font-bold">{offer.peerName}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">Status: Waiting for Peers</p>
                                  </div>
                                </div>
                                <Button size="sm" onClick={async () => {
                                  send({ type: 'JOIN' });
                                  const conn = new Connection(updateConnection);
                                  conn.setDataChannelCallback();
                                  await conn.acceptOffer(offer.offer, state.context.playerName);
                                  updateConnection(conn);

                                  const checkSignal = setInterval(() => {
                                    if (conn.signal) {
                                      signalingClient?.sendAnswer(offer.connectionId, conn.signal);
                                      clearInterval(checkSignal);
                                    }
                                  }, 500);
                                }}>Join Game</Button>
                              </Card>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                onFinishGame={onFinishGame}
              />
            </Suspense>

            <PlayerList
              players={playerInfos}
              onRemove={(id) => send({ type: 'REMOVE_PLAYER', playerId: id })}
            />
          </div>
        )}
      </div>
    </div >
  );
}

