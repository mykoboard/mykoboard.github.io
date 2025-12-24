import { PlayerInfo } from "./Players";
import { SignalingStep } from "./GameLobbyView";
import { Connection } from "../lib/webrtc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Globe, LogIn } from "lucide-react";

interface GamePreparationPhaseProps {
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

export function GamePreparationPhase({
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
}: GamePreparationPhaseProps) {
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
