import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Clipboard, UserPlus, LogIn, CheckCircle2, UserMinus, ArrowLeft, MousePointer2, Globe, Search, History, ExternalLink, Trash2 } from "lucide-react";
import { ConnectionStatus, Connection } from "../lib/webrtc";
import { SignalingService } from "../lib/signaling";
import { GameSession } from "../lib/db";

export interface PlayerInfo {
    id: string;
    name: string;
    status: 'lobby' | 'game';
    isConnected: boolean;
    isLocal: boolean;
    isHost: boolean;
}

export function PlayerList({ players, onRemove }: { players: PlayerInfo[], onRemove?: (id: string) => void }) {
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

export function SignalingStep({ connection, onOfferChange, onAnswerChange, onCancel }: any) {
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

interface GameLobbyProps {
    signalingMode: 'manual' | 'server' | null;
    setSignalingMode: (mode: 'manual' | 'server' | null) => void;
    state: any;
    send: (event: any) => void;
    isInitiator: boolean;
    signalingClient: SignalingService | null;
    availableOffers: any[];
    activeSessions: GameSession[];
    isServerConnecting: boolean;
    addInitiatorConnection: () => void;
    connectWithOffer: () => void;
    onJoinFromList: (offer: any) => void;
    onDeleteSession: (id: string) => void;
    boardId?: string;
}

export function GameLobby({
    signalingMode,
    setSignalingMode,
    state,
    send,
    isInitiator,
    signalingClient,
    availableOffers,
    activeSessions,
    isServerConnecting,
    addInitiatorConnection,
    connectWithOffer,
    onJoinFromList,
    onDeleteSession,
    boardId
}: GameLobbyProps) {
    const navigate = useNavigate();
    return (
        <div className="space-y-8">
            {/* Setup Phase: Selection */}
            {!signalingMode && (
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
            {/* Actions Column */}
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

                    {/* Active Game Resume Prompt */}
                    {(state.context.connections.size > 0 || (isInitiator && boardId)) && !state.context.isGameFinished && (
                        <Card className="p-4 bg-primary/10 border-2 border-primary/20 rounded-2xl flex items-center justify-between mb-6 animate-in slide-in-from-top-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
                                    <div className="h-2 w-2 bg-white rounded-full animate-ping"></div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-primary">Game in progress</h3>
                                    <p className="text-[10px] text-primary/60">You have an active room open.</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => send({ type: 'RESUME' })}
                                className="bg-primary hover:bg-primary/90 text-white font-bold rounded-lg px-4"
                            >
                                Return to Game
                            </Button>
                        </Card>
                    )}

                    {state.matches('idle') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card className="p-8 flex flex-col items-center text-center space-y-4 hover:shadow-xl transition-all border-2 border-primary/5 hover:border-primary/20 group cursor-pointer" onClick={addInitiatorConnection}>
                                <div className="h-14 w-14 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <UserPlus className="w-7 h-7 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Host a Game</h2>
                                    <p className="text-xs text-slate-500 mt-1 max-w-[180px]">
                                        Start a new secure match and invite your friends.
                                    </p>
                                </div>
                                <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                                    Create Session
                                </Button>
                            </Card>

                            <Card className="p-8 flex flex-col items-center text-center space-y-4 hover:shadow-xl transition-all border-2 border-secondary/10 hover:border-secondary/30 group cursor-pointer" onClick={connectWithOffer}>
                                <div className="h-14 w-14 bg-secondary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <LogIn className="w-7 h-7 text-secondary-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Join a Game</h2>
                                    <p className="text-xs text-slate-500 mt-1 max-w-[180px]">
                                        Use a secure invite to connect to an existing match.
                                    </p>
                                </div>
                                <Button variant="secondary" className="w-full rounded-xl">
                                    Join Session
                                </Button>
                            </Card>
                        </div>
                    )}

                    {state.matches('lobby') && (
                        <div className="space-y-4">
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
                                                        navigate(`/games/${session.gameId}/${session.boardId}`);
                                                    } else {
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
                                                            <p className="font-bold text-slate-700">{session.gameName}</p>
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
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteSession(session.boardId);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                    <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    Active Game Rooms
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
                                <Card className="p-12 text-center border-dashed bg-white/50 border-2 rounded-2xl">
                                    <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm text-slate-400">No active lobbies found for this game.</p>
                                    <Button variant="link" size="sm" onClick={addInitiatorConnection} className="mt-2 text-primary font-bold">Be the first to host!</Button>
                                </Card>
                            ) : (
                                <div className="grid gap-3">
                                    {availableOffers.map((offer) => (
                                        <Card
                                            key={offer.connectionId}
                                            className="p-4 flex items-center justify-between hover:border-primary/40 hover:shadow-md transition-all bg-white border-2 border-slate-100 rounded-xl group cursor-pointer"
                                            onClick={() => onJoinFromList(offer)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary group-hover:scale-105 transition-transform">
                                                    {offer.peerName?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{offer.peerName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Accepting Players</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white border-none shadow-none font-bold px-4"
                                            >
                                                Join
                                            </Button>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
