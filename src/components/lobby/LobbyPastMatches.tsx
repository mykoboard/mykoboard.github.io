import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, CheckCircle2, Trash2, ExternalLink } from "lucide-react";
import { GameSession } from "../../lib/db";

interface LobbyPastMatchesProps {
    activeSessions: GameSession[];
    boardId?: string;
    onDeleteSession: (id: string) => void;
    onResume?: () => void;
}

export function LobbyPastMatches({ activeSessions, boardId, onDeleteSession, onResume }: LobbyPastMatchesProps) {
    const navigate = useNavigate();
    const finishedSessions = useMemo(() => {
        return activeSessions
            .filter(s => s.status === 'finished')
            .sort((a, b) => b.lastPlayed - a.lastPlayed);
    }, [activeSessions]);

    if (finishedSessions.length === 0) return null;

    return (
        <div className="space-y-4 mb-10 animate-in slide-in-from-top-4 duration-500">
            <div className="grid gap-4">
                {finishedSessions.map((session) => (
                    <div
                        key={session.boardId}
                        className="p-5 glass-dark rounded-2xl border border-white/5 hover:border-primary/20 hover:shadow-glass-dark transition-all duration-300 cursor-pointer group flex items-center justify-between"
                        onClick={() => {
                            if (session.boardId !== boardId) {
                                navigate(`/games/${session.gameId}/${session.boardId}`);
                            } else if (onResume) {
                                onResume();
                            }
                        }}
                    >
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-neon">
                                <CheckCircle2 className="w-6 h-6 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <p className="font-bold text-lg text-white tracking-tight uppercase">{session.gameName}</p>
                                    <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/30 uppercase font-black tracking-tighter shadow-neon">Verified</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {session.participants?.map((p, i) => (
                                        <span key={i} className={`text-[9px] px-2 py-0.5 rounded-md border uppercase font-bold tracking-tight ${p.isYou ? 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                            {p.isYou ? 'Identity Match' : p.name}{p.isHost && ' 👑'}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-white/20 font-mono tracking-widest uppercase">
                                    Sector: {session.boardId.slice(0, 8)} • {new Date(session.lastPlayed).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all rounded-xl border border-transparent hover:border-rose-500/30"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSession(session.boardId);
                                }}
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:neon-border transition-all duration-500">
                                <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
