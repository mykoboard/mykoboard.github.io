import { useState } from "react";
import { PlayerInfo } from "./Players";
import { Connection, ConnectionStatus } from "../../lib/webrtc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Globe, LogIn, CheckCircle2, Clipboard } from "lucide-react";

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

interface PreparationPhaseProps {
    state: any;
    isInitiator: boolean;
    signalingMode: 'manual' | 'server' | null;
    isServerConnecting: boolean;
    signalingClient: any;
    pendingSignaling: Connection[];
    onStartGame: () => void;
    onHostAGame: () => void;
    onUpdateOffer: (connection: Connection, offer: string) => void;
    onUpdateAnswer: (connection: Connection, answer: string) => void;
    onCloseSession: () => void;
    onBackToLobby: () => void;
    onAcceptGuest: () => void;
    onRejectGuest: () => void;
    onRemovePlayer: (id: string) => void;
    boardId?: string;
}

export function PreparationPhase({
    state,
    isInitiator,
    signalingMode,
    isServerConnecting,
    signalingClient,
    pendingSignaling,
    onStartGame,
    onHostAGame,
    onUpdateOffer,
    onUpdateAnswer,
    onCloseSession,
    onBackToLobby,
    onAcceptGuest,
    onRejectGuest,
    onRemovePlayer
}: PreparationPhaseProps) {
    const isRoom = state.matches('room');
    const isHosting = state.matches('hosting');
    const isJoining = state.matches('joining');
    const isApproving = state.matches('approving');

    return (
        <div className="space-y-8">
            {/* Host Approval Overlay */}
            {isApproving && state.context.pendingGuest && (
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
                                onClick={onRejectGuest}
                                className="border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                                Decline
                            </Button>
                            <Button
                                onClick={onAcceptGuest}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                Accept Player
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Session Connection States */}
            {(isHosting || isJoining || isRoom) && (
                <Card className="p-8 text-center space-y-6 border-2 border-primary/20 bg-white shadow-xl rounded-2xl animate-in zoom-in-95 duration-500">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-2">
                            {isHosting ? "Hosting Session" : isJoining ? "Joining Session" : "Room Lobby"}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {isRoom ? "Game Room" : isHosting ? "Creating Session..." : "Connecting..."}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {isRoom
                                ? (isInitiator ? "Invite more players or start the game when everyone is ready." : "Waiting for the host to launch the game.")
                                : "Establishing secure P2P connection with peers."}
                        </p>
                    </div>

                    {isInitiator ? (
                        <div className="flex flex-col items-center gap-4">
                            {isRoom && (
                                <Button
                                    onClick={onStartGame}
                                    size="lg"
                                    className="w-full max-w-xs h-12 text-lg shadow-lg bg-green-600 hover:bg-green-700 text-white shadow-green-100 transition-all active:scale-95 font-bold"
                                >
                                    Start The Game
                                </Button>
                            )}

                            <div className="flex gap-4 w-full max-w-xs">
                                <Button
                                    onClick={onHostAGame}
                                    variant="outline"
                                    size="sm"
                                    className="flex-3 text-slate-600 font-medium"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Invite
                                </Button>
                                {signalingMode === 'server' && (
                                    <Button
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="px-3"
                                        title="Copy Link"
                                    >
                                        <Globe className="w-4 h-4 text-blue-500" />
                                    </Button>
                                )}
                                <Button
                                    onClick={onCloseSession}
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 text-slate-400 hover:text-rose-500 px-2"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-4">
                            {!isRoom && (
                                <div className="relative">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/10 border-t-primary"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-slate-800">
                                    {isRoom ? "Locked In!" : "Establishing Connection"}
                                </h3>
                                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                    {isRoom ? "You're in the lobby. Waiting for the host to launch the game." : "Please wait while we establish a secure direct link to the host."}
                                </p>
                            </div>
                            <Button
                                onClick={onBackToLobby}
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-rose-500 mt-2 font-medium"
                            >
                                Leave Room
                            </Button>
                        </div>
                    )}

                    {/* Signaling UI for Manual/Server Modes */}
                    {isInitiator && (
                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            {signalingMode === 'server' && (
                                <div className="p-6 text-center space-y-3 bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-xl">
                                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                        <Globe className={`w-5 h-5 text-blue-500 ${!isServerConnecting ? 'animate-pulse' : ''}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-blue-900 text-sm">Broadcasting Lobby...</h3>
                                        <p className="text-[10px] text-blue-600/70">Your game is visible in the public discovery list.</p>
                                        {!signalingClient?.isConnected && !isServerConnecting && (
                                            <p className="text-[9px] text-red-500 mt-1 font-bold">Signaling Server Offline</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {signalingMode === 'manual' && pendingSignaling.length > 0 && (
                                <div className="space-y-4 text-left">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Pending Invites</h3>
                                    <div className="space-y-4">
                                        {pendingSignaling.map((conn) => (
                                            <SignalingStep
                                                key={conn.id}
                                                connection={conn}
                                                onOfferChange={onUpdateOffer}
                                                onAnswerChange={onUpdateAnswer}
                                                onCancel={(c: any) => c.close()}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Guest Manual Signaling UI */}
                    {!isInitiator && isJoining && signalingMode === 'manual' && pendingSignaling.length > 0 && (
                        <div className="pt-6 border-t border-slate-100 text-left">
                            <SignalingStep
                                connection={pendingSignaling[0]}
                                onOfferChange={onUpdateOffer}
                                onAnswerChange={onUpdateAnswer}
                                onCancel={(c: any) => c.close()}
                            />
                        </div>
                    )}
                </Card>
            )}

            {!isHosting && !isJoining && !isRoom && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200/50 rounded-3xl bg-white/30 backdrop-blur-sm">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110 duration-500">
                        <div className="h-3 w-3 bg-slate-200 rounded-full animate-ping"></div>
                    </div>
                    <div className="text-sm font-bold uppercase tracking-widest text-slate-400">No Active Session</div>
                    <div className="text-xs text-slate-400 mt-1 italic">Please return to the lobby to start or join a game.</div>
                    <Button variant="outline" size="sm" onClick={onBackToLobby} className="mt-4">
                        Back to Lobby
                    </Button>
                </div>
            )}
        </div>
    );
}
