import { useState } from "react";
import { PlayerInfo } from "@mykoboard/integration";
import { Connection, ConnectionStatus } from "../../lib/webrtc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Globe, LogIn, CheckCircle2, Clipboard } from "lucide-react";
import { toast } from "sonner";

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
                <div className="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark flex items-center justify-center space-x-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <p className="text-sm text-white/50 font-bold uppercase tracking-widest">Generating invite signal...</p>
                </div>
            )}

            {connection.status === ConnectionStatus.readyToAccept && (
                <div className="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                        <LogIn className="w-5 h-5 text-primary" />
                        Paste Join Offer
                    </h3>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4">External node signal required for connection.</p>
                    <Input
                        placeholder="Paste offer string here..."
                        className="h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono text-xs placeholder:text-white/20"
                        onChange={(e) => onOfferChange(connection, e.target.value)}
                    />
                </div>
            )}

            {connection.status === ConnectionStatus.started && (
                <div className="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-primary">
                        <UserPlus className="w-4 h-4" />
                        Active Invite Vector
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 relative group min-h-[64px] flex items-center group-hover:neon-border transition-all duration-500">
                            {connection.signal ? (
                                <>
                                    <div className="text-[10px] font-mono break-all line-clamp-2 text-white/40 pr-8">
                                        {connection.signal.toString()}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 text-primary hover:bg-primary/10 transition-colors"
                                        onClick={() => copyToClipboard(connection.signal.toString())}
                                    >
                                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                                    </Button>
                                </>
                            ) : (
                                <div className="text-[10px] text-white/20 italic tracking-wider">Gathering node connection details...</div>
                            )}
                        </div>
                        <p className="text-[10px] text-white/30 uppercase font-medium leading-relaxed tracking-wider">
                            Transmit this vector to a peer node. Their response will be synthesized automatically.
                        </p>
                        <Input
                            placeholder="Awaiting peer response vector..."
                            className="h-10 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono text-[10px] placeholder:text-white/20"
                            onChange={(e) => onAnswerChange(connection, e.target.value)}
                        />
                    </div>
                </div>
            )}

            {connection.status === ConnectionStatus.answered && (
                <div className="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-primary">
                        <CheckCircle2 className="w-4 h-4" />
                        Signal Response Synthesized
                    </h3>
                    <div className="space-y-3">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 relative group min-h-[64px] flex items-center group-hover:neon-border transition-all duration-500">
                            {connection.signal ? (
                                <>
                                    <div className="text-[10px] font-mono break-all line-clamp-2 text-white/40 pr-8">
                                        {connection.signal.toString()}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 text-primary hover:bg-primary/10 transition-colors"
                                        onClick={() => copyToClipboard(connection.signal.toString())}
                                    >
                                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                                    </Button>
                                </>
                            ) : (
                                <div className="text-[10px] text-white/20 italic tracking-wider">Finalizing response...</div>
                            )}
                        </div>
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">Transmit this payload back to peer to complete handshake.</p>
                    </div>
                </div>
            )}

            {onCancel && (
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(connection)}
                        className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-rose-500 transition-colors"
                    >
                        De-initialize Link
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
    onCancelSignaling: (connection: Connection) => void;
    onRemovePlayer: (id: string) => void;
    playerCount: number;
    maxPlayers: number;
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
    onRemovePlayer,
    onCancelSignaling,
    playerCount,
    maxPlayers
}: PreparationPhaseProps) {
    const isRoom = state.matches('room');
    const isHosting = state.matches('hosting');
    const isJoining = state.matches('joining');
    const isApproving = state.matches('approving');

    return (
        <div className="space-y-8">
            {/* Host Approval Overlay */}
            {isApproving && state.context.pendingGuest && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0A]/80 backdrop-blur-xl animate-in fade-in duration-500 p-6">
                    <div className="glass-dark p-10 w-full max-w-md shadow-2xl border border-white/10 rounded-[2.5rem] space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="h-20 w-20 bg-primary/10 rounded-[1.5rem] flex items-center justify-center border border-primary/20 shadow-neon">
                                <UserPlus className="w-10 h-10 text-primary animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Handshake Request</h2>
                                <p className="text-white/40 uppercase tracking-widest text-[10px] font-medium leading-relaxed">
                                    Entity <span className="font-black text-primary px-1">{state.context.pendingGuest.name}</span> attempts to bridge into session.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                onClick={onRejectGuest}
                                className="h-14 rounded-2xl border-white/10 text-white/60 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 font-black uppercase tracking-widest text-xs"
                            >
                                De-authorize
                            </Button>
                            <Button
                                onClick={onAcceptGuest}
                                className="h-14 rounded-2xl bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] font-black uppercase tracking-widest text-xs"
                            >
                                Grant Access
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Connection States */}
            {(isHosting || isJoining || isRoom) && (
                <div className="glass-dark p-10 text-center space-y-8 border border-white/5 shadow-glass-dark rounded-[3rem] animate-in zoom-in-95 duration-500">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-neon transform -translate-y-2">
                            {isHosting ? "Broadcasting Session" : isJoining ? "Initializing Node" : "Command Lobby Active"}
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
                            {isRoom ? "Game Room" : isHosting ? "Link Establishment" : "Connecting..."}
                        </h2>
                        <p className="text-xs text-white/30 uppercase font-black tracking-widest leading-relaxed max-w-lg mx-auto">
                            {isRoom
                                ? (isInitiator ? `Authorize peer nodes or launch protocol when ready (${playerCount}/${maxPlayers}).` : "Waiting for initiator to launch protocol.")
                                : "Synthesizing direct P2P mesh link to session nodes."}
                        </p>
                    </div>

                    {isInitiator ? (
                        <div className="flex flex-col items-center gap-6">
                            {isRoom && (
                                <Button
                                    onClick={onStartGame}
                                    size="lg"
                                    className="w-full max-w-sm h-16 text-sm font-black uppercase tracking-[0.5em] rounded-2xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98]"
                                >
                                    Launch Protocol
                                </Button>
                            )}

                            <Button
                                onClick={onCloseSession}
                                variant="ghost"
                                className="px-4 h-12 rounded-xl text-white/20 hover:text-rose-500 font-black uppercase tracking-widest text-[10px]"
                            >
                                Terminate
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-8 py-6">
                            {!isRoom && (
                                <div className="relative">
                                    <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary/5 border-t-primary shadow-neon"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-3 w-3 bg-primary rounded-full animate-pulse shadow-neon"></div>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-3">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                    {isRoom ? "Node Synced" : "Bridging Connections"}
                                </h3>
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] max-w-xs mx-auto font-medium leading-relaxed">
                                    {isRoom ? "Identity verified. Awaiting initiator's launch command." : "Establishing secure encrypted tunnel to host node."}
                                </p>
                            </div>
                            <Button
                                onClick={onBackToLobby}
                                variant="ghost"
                                className="h-10 text-white/20 hover:text-rose-500 font-black uppercase tracking-widest text-[10px]"
                            >
                                Sever Connection
                            </Button>
                        </div>
                    )}

                    {/* Signaling UI for Manual/Server Modes */}
                    {isInitiator && (
                        <div className="pt-8 border-t border-white/5 space-y-6">
                            {signalingMode === 'server' && (
                                <div className="p-8 text-center space-y-4 bg-primary/5 border border-primary/20 rounded-3xl shadow-neon-sm animate-pulse-glow">
                                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20">
                                        <Globe className={`w-6 h-6 text-primary ${!isServerConnecting ? 'animate-pulse' : ''}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-black text-primary text-xs uppercase tracking-widest">Active Discovery Broadcast</h3>
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Lobby is visible on global discovery mesh.</p>
                                        {!signalingClient?.isConnected && !isServerConnecting && (
                                            <p className="text-[10px] text-rose-500 mt-2 font-black uppercase tracking-widest">Link Lost: Discovery Offline</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {signalingMode === 'manual' && pendingSignaling.length > 0 && (
                                <div className="space-y-4 text-left">
                                    <h3 className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] px-1">Pending Link Authentications</h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        {pendingSignaling.map((conn) => (
                                            <SignalingStep
                                                key={conn.id}
                                                connection={conn}
                                                onOfferChange={onUpdateOffer}
                                                onAnswerChange={onUpdateAnswer}
                                                onCancel={onCancelSignaling}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Guest Manual Signaling UI */}
                    {!isInitiator && isJoining && signalingMode === 'manual' && pendingSignaling.length > 0 && (
                        <div className="pt-8 border-t border-white/5 text-left">
                            <SignalingStep
                                connection={pendingSignaling[0]}
                                onOfferChange={onUpdateOffer}
                                onAnswerChange={onUpdateAnswer}
                                onCancel={onCancelSignaling}
                            />
                        </div>
                    )}
                </div>
            )
            }

            {
                !isHosting && !isJoining && !isRoom && (
                    <div className="py-24 flex flex-col items-center justify-center space-y-6 border border-white/5 bg-white/5 rounded-[3rem] backdrop-blur-sm animate-in fade-in duration-700">
                        <div className="relative">
                            <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center transition-transform hover:scale-110 duration-500">
                                <div className="h-4 w-4 bg-white/10 rounded-full animate-ping"></div>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="text-xs font-black uppercase tracking-[0.5em] text-white/30">Null Reference: No Active Session</div>
                            <p className="text-[10px] text-white/20 uppercase tracking-widest px-10 leading-relaxed font-medium">Session data not found on current node. Return to discovery mesh.</p>
                        </div>
                        <Button
                            onClick={onBackToLobby}
                            variant="outline"
                            className="h-12 px-8 rounded-xl border-white/10 text-white/70 hover:text-primary hover:border-primary/40 font-black uppercase tracking-widest text-[10px]"
                        >
                            Return to Discovery
                        </Button>
                    </div>
                )
            }
        </div >
    );
}
