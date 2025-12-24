import { useState, Suspense, useMemo, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Connection, ConnectionStatus } from "../lib/webrtc";
import { getGameById } from "../lib/GameRegistry";
import { Ledger } from "../lib/ledger";
import { useMachine } from "@xstate/react";
import { lobbyMachine } from "../machines/lobbyMachine";
import { createLobbyMessage, isLobbyMessage } from "../lib/network";
import { SecureWallet, PlayerIdentity } from "../lib/wallet";
import { SignalingService } from "../lib/signaling";
import { SessionManager } from "../lib/sessions";
import { GameSession } from "../lib/db";
import { GameLobby, PlayerInfo } from "@/components/GameLobby";
import { GameView } from "@/components/GameView";

export default function Board() {
  const { gameId, boardId } = useParams();
  const navigate = useNavigate();
  const game = useMemo(() => getGameById(gameId || ""), [gameId]);

  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);

  useEffect(() => {
    const loadIdentity = async () => {
      const wallet = SecureWallet.getInstance();
      const id = await wallet.getIdentity();
      setIdentity(id);
    };
    loadIdentity();
  }, []);

  const [state, send] = useMachine(lobbyMachine, {
    input: {
      playerName: identity?.name || "Anonymous"
    }
  });

  const [signalingMode, setSignalingMode] = useState<'manual' | 'server' | null>(null);
  const [isServerConnecting, setIsServerConnecting] = useState(false);

  const { connections, isInitiator, isGameStarted } = state.context;
  const view = (state.matches('idle') || state.matches('lobby'))
    ? 'lobby' as const
    : 'game' as const;

  const connectionList = useMemo(() => Array.from(connections.values()), [connections]);
  const connectedPeers = useMemo(() => connectionList.filter(c => c.status === ConnectionStatus.connected), [connectionList]);
  const pendingSignaling = useMemo(() => connectionList.filter(c => c.status !== ConnectionStatus.connected && c.status !== ConnectionStatus.closed), [connectionList]);
  const isConnected = state.matches('room');

  const playerInfos = useMemo((): PlayerInfo[] => [
    {
      id: 'local',
      name: state.context.playerName,
      status: isGameStarted ? 'game' : 'lobby',
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
      isHost: false
    }))
  ], [state.context.playerName, isGameStarted, connectionList, state.context.playerStatuses, isInitiator]);

  const updateConnection = (connection: Connection) => {
    const handleLobbyMessage = (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (!isLobbyMessage(msg)) return;

        if (msg.type === 'START_GAME') send({ type: 'START_GAME' });
        if (msg.type === 'GAME_STARTED') send({ type: 'GAME_STARTED' });
        if (msg.type === 'GAME_RESET') send({ type: 'GAME_RESET' });
        if (msg.type === 'NEW_BOARD') navigate(`/games/${gameId}/${msg.payload}`);
        if (msg.type === 'SYNC_PLAYER_STATUS') {
          send({ type: 'SET_PLAYER_STATUS', playerId: connection.id, status: msg.payload });
        }
        if (msg.type === 'SYNC_LEDGER') {
          const verifyLedger = async () => {
            const entries = msg.payload as any[];
            for (const entry of entries) {
              if (entry.signature && entry.signerPublicKey) {
                const isValid = await SecureWallet.verify(entry.action, entry.signature, entry.signerPublicKey);
                if (!isValid) {
                  console.error("Invalid signature in ledger entry", entry);
                  return;
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
    if (connection.status === ConnectionStatus.connected) {
      connection.send(JSON.stringify(createLobbyMessage('SYNC_PLAYER_STATUS', view)));
    }
    send({ type: 'UPDATE_CONNECTION', connection });
  };

  // Broadcast player status changes
  useEffect(() => {
    if (isConnected || isInitiator) {
      const currentStatus = isGameStarted ? 'game' : 'lobby';
      connectedPeers.forEach(c => {
        if (c.status === ConnectionStatus.connected) {
          c.send(JSON.stringify(createLobbyMessage('SYNC_PLAYER_STATUS', currentStatus)));
        }
      });
    }
  }, [isGameStarted, isConnected, isInitiator, connectedPeers]);

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

  useEffect(() => {
    if (boardId && (state.matches('idle') || state.matches('lobby'))) {
      const restoreSession = async () => {
        const session = await SessionManager.getSession(boardId);
        if (session && session.ledger.length > 0 && (state.context.ledger.length === 0 || state.context.isGameStarted === false)) {
          send({ type: 'LOAD_LEDGER', ledger: session.ledger });
          send({ type: 'RESUME' });
          if (session.status === 'finished') {
            setTimeout(() => send({ type: 'FINISH_GAME' }), 0);
          }
        }
      };
      restoreSession();
    }
  }, [boardId, state.value]);

  useEffect(() => {
    if (state.matches('room') && gameId && boardId) {
      SessionManager.saveSession({
        gameId,
        boardId,
        playerName: state.context.playerName,
        gameName: game?.name || "Unknown Game",
        lastPlayed: Date.now(),
        status: state.matches('room.finished') ? 'finished' : 'active',
        ledger: state.context.ledger,
        participants: playerInfos.map(p => ({
          name: p.name,
          isYou: p.isLocal,
          isHost: p.isHost
        }))
      });
    }
  }, [state.value, gameId, boardId, game?.name, state.context.playerName, state.context.ledger, playerInfos]);

  useEffect(() => {
    if (state.matches('room') && boardId && state.context.ledger.length > 0) {
      SessionManager.updateLedger(boardId, state.context.ledger);
    }
  }, [state.context.ledger, boardId, state.matches('room')]);

  const signalingHandlerRef = useRef<(msg: any) => void>(undefined);

  useEffect(() => {
    signalingHandlerRef.current = (msg: any) => {
      if (msg.type === 'offerList') {
        setAvailableOffers(msg.offers || []);
      }
      if (msg.type === 'answer') {
        const connectionList = Array.from(state.context.connections.values());
        const pendingConn = connectionList.find(c => c.status === ConnectionStatus.started);

        if (pendingConn) {
          if (signalingMode === 'server') {
            send({
              type: 'REQUEST_JOIN',
              connectionId: msg.from,
              peerName: msg.peerName || "Anonymous Guest",
              answer: msg.answer,
              connection: pendingConn
            });
          } else {
            pendingConn.acceptAnswer(msg.answer);
            updateConnection(pendingConn);
          }
        }
      }
    };
  }, [state.context.connections, signalingMode, send]);

  useEffect(() => {
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

          const lobbyId = `lobby_${gameId}`;
          const client = new SignalingService(
            gameId || "default",
            boardId || lobbyId,
            identity.name,
            (msg) => signalingHandlerRef.current?.(msg)
          );

          const challenge = `SIGN_IN:${identity.subscriptionToken}`;
          const signature = await wallet.sign(challenge);
          await client.connect(identity.subscriptionToken, identity.publicKey, signature);
          setSignalingClient(client);
          client.requestOffers();
        } catch (e) {
          console.error("Signaling connection failed", e);
        } finally {
          setIsServerConnecting(false);
        }
      };
      initSignaling();
    }

    if (!shouldConnect && signalingClient) {
      signalingClient.disconnect();
      setSignalingClient(null);
    }
  }, [signalingMode, state.value, gameId, isInitiator, signalingClient]);

  const addInitiatorConnection = () => {
    const newBoardId = boardId || uuidv4();
    if (!boardId) {
      navigate(`/games/${gameId}/${newBoardId}`, { replace: true });
    }

    send({ type: 'HOST' });
    const connection = new Connection(updateConnection);
    connection.onClose = () => send({ type: 'PEER_DISCONNECTED', connectionId: connection.id });
    connection.openDataChannel();
    connection.prepareOfferSignal(state.context.playerName);
    updateConnection(connection);

    if (signalingMode === 'server' && signalingClient) {
      signalingClient.register(newBoardId);
      const checkSignal = setInterval(() => {
        if (connection.signal) {
          signalingClient.sendOffer(connection.signal, newBoardId);
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

    const signature = await wallet.sign(action);
    const ledger = Ledger.fromEntries(state.context.ledger);
    const entry = await ledger.addEntry({ ...action });
    entry.signature = signature;
    entry.signerPublicKey = identity.publicKey;

    const updatedLedger = ledger.getEntries();
    send({ type: 'SYNC_LEDGER', ledger: updatedLedger });
    connectedPeers.forEach(c => {
      c.send(JSON.stringify(createLobbyMessage('SYNC_LEDGER', updatedLedger)));
    });
  };

  const onJoinFromList = async (offer: any) => {
    send({ type: 'JOIN' });
    const conn = new Connection(updateConnection);
    conn.setDataChannelCallback();
    await conn.acceptOffer(offer.offer, state.context.playerName);
    updateConnection(conn);

    const checkSignal = setInterval(() => {
      if (conn.signal) {
        signalingClient?.sendAnswer(offer.connectionId, conn.signal);
        clearInterval(checkSignal);

        // When joining from list, ensure we are on the session path
        const targetBoardId = offer.sessionBoardId || offer.boardId;
        if (!boardId && targetBoardId) {
          navigate(`/games/${gameId}/${targetBoardId}`, { replace: true });
        }
      }
    }, 500);
  };

  const handlePlayAgain = () => {
    const newBoardId = uuidv4();
    connectedPeers.forEach(c => {
      if (c.status === ConnectionStatus.connected) {
        c.send(JSON.stringify(createLobbyMessage('NEW_BOARD', newBoardId)));
      }
    });

    signalingClient?.deleteOffer();
    send({ type: 'CLOSE_SESSION' });
    send({ type: 'HOST' });
    navigate(`/games/${gameId}/${newBoardId}`);
  };
  const onDeleteSession = async (id: string) => {
    await SessionManager.removeSession(id);
    const sessions = await SessionManager.getSessions();
    setActiveSessions(sessions);
  };

  const onAcceptGuest = () => {
    const guest = state.context.pendingGuest;
    send({ type: 'ACCEPT_GUEST' });
    if (guest) {
      updateConnection(guest.connection);
    }
  };

  const onRejectGuest = () => {
    send({ type: 'REJECT_GUEST' });
  };

  const onBackToGames = () => {
    signalingClient?.deleteOffer();
    send({ type: 'CLOSE_SESSION' });
    navigate(`/games/${gameId}`);
  };

  const onExitToMarket = () => {
    signalingClient?.deleteOffer();
    send({ type: 'CLOSE_SESSION' });
    navigate('/games');
  };

  const onBackToDiscovery = () => {
    send({ type: 'BACK_TO_LOBBY' });
    navigate(`/games/${gameId}`);
  };

  if (!game) {
    return <div className="p-10 text-center">Game not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50">

      {view === 'game' ? (
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
            onAddInitiatorConnection={addInitiatorConnection}
            onUpdateOffer={updateOffer}
            onUpdateAnswer={updateAnswer}
            onBackToLobby={onBackToDiscovery}
            onCloseSession={onBackToGames}
            onResetGame={handlePlayAgain}
            onAcceptGuest={onAcceptGuest}
            onRejectGuest={onRejectGuest}
            state={state} />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          <Header />
          <h1 className="text-2xl font-bold">{game.name}</h1>
          <GameLobby
            signalingMode={signalingMode}
            setSignalingMode={setSignalingMode}
            state={state}
            send={send}
            isInitiator={isInitiator}
            signalingClient={signalingClient}
            availableOffers={availableOffers}
            activeSessions={activeSessions}
            isServerConnecting={isServerConnecting}
            addInitiatorConnection={addInitiatorConnection}
            connectWithOffer={connectWithOffer}
            onJoinFromList={onJoinFromList}
            onDeleteSession={onDeleteSession}
            boardId={boardId}
          />
        </div>
      )}
    </div>
  );
}

