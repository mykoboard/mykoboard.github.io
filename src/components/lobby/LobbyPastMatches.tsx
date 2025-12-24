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
    onResume: () => void;
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
        <div className="space-y-3 mb-6 animate-in slide-in-from-top-4 duration-500">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <History className="w-3 h-3" />
                Past Matches
            </h3>
            <div className="grid gap-2">
                {finishedSessions.map((session) => (
                    <Card
                        key={session.boardId}
                        className="p-3 border-l-4 border-l-slate-200 bg-white opacity-75 hover:border-l-primary hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                        onClick={() => {
                            if (session.boardId !== boardId) {
                                navigate(`/games/${session.gameId}/${session.boardId}`);
                            } else {
                                onResume();
                            }
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-green-50 rounded-lg flex items-center justify-center transition-colors">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-slate-700">{session.gameName}</p>
                                    <span className="text-[8px] bg-green-100 text-green-600 px-1 rounded uppercase font-bold">Finished</span>
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
    );
}
