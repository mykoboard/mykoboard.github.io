import { useMemo, useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMachine } from '@xstate/react';
import {
    planningPokerMachine,
    applyLedgerToPokerState
} from './planningPokerMachine';
import {
    createGameMessage,
    isGameMessage,
    GameProps,
    SimpleConnection
} from '@mykoboard/integration';
import {
    Eye,
    RotateCcw,
    User,
    CheckCircle2,
    Clock,
    Sparkles,
    Coffee,
    HelpCircle,
    FileText,
    History,
    Check
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const FIBONACCI = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];

export default function PlanningPoker({
    connections,
    playerInfos,
    isInitiator,
    ledger,
    onAddLedger
}: GameProps) {
    const [state, send] = useMachine(planningPokerMachine, {
        input: { isInitiator }
    });

    const { votes, votedPlayers, isRevealed, description, history } = state.context;

    // Host-only store for the real values until reveal
    const hostVotesRef = useRef<Record<string, string>>({});

    // Track local player's vote for immediate UI feedback (especially for guests)
    const [localVote, setLocalVote] = useState<string | null>(null);

    // Sync state from ledger
    useEffect(() => {
        if (!ledger) return;
        const newContext = applyLedgerToPokerState(playerInfos, ledger);

        // Merge local votedPlayers with ledger votedPlayers to preserve optimistic updates
        const mergedVotedPlayers = new Set([...state.context.votedPlayers, ...newContext.votedPlayers]);

        send({ type: 'SYNC_STATE', context: { ...newContext, votedPlayers: mergedVotedPlayers } });

        if (newContext.isRevealed && state.matches('voting')) {
            setLocalVote(null); // Clear pending vote when revealed
            send({ type: 'REVEAL', payload: { votes: newContext.votes } });
        } else if (!newContext.isRevealed && state.matches('revealed')) {
            setLocalVote(null); // Clear local vote on reset
            send({ type: 'RESET' });
        }
    }, [ledger, playerInfos, send]);

    // Handle networking
    useEffect(() => {
        const handleMessage = (data: string, fromId: string) => {
            try {
                const message = JSON.parse(data);
                if (!isGameMessage(message)) return;

                if (isInitiator && message.type === 'VOTE_REQUEST') {
                    const { value } = message.payload;

                    // Host stores the value privately, indexed by the guest's unique ID
                    hostVotesRef.current[fromId] = value;

                    // Host commits that the player has voted to the ledger
                    onAddLedger?.({
                        type: 'COMMIT',
                        payload: { playerId: fromId }
                    });
                }
            } catch (e) { }
        };

        connections.forEach((c: SimpleConnection) => {
            const listener = (data: string) => handleMessage(data, c.id);
            c.addMessageListener(listener);
            (c as any)._pokerListener = listener;
        });

        return () => {
            connections.forEach((c: SimpleConnection) => {
                const listener = (c as any)._pokerListener;
                if (listener) {
                    c.removeMessageListener(listener);
                }
            });
        };
    }, [connections, isInitiator, onAddLedger]);

    const handleVote = (value: string) => {
        const localPlayer = playerInfos.find(p => p.isLocal);
        if (!localPlayer) return;

        // Immediate UI feedback
        setLocalVote(value);

        if (isInitiator) {
            hostVotesRef.current[localPlayer.id] = value;
            onAddLedger?.({
                type: 'COMMIT',
                payload: { playerId: localPlayer.id }
            });
        } else {
            hostVotesRef.current[localPlayer.id] = value;
            // Immediately mark as voted for UI feedback
            send({
                type: 'SYNC_STATE',
                context: {
                    ...state.context,
                    votedPlayers: new Set([...state.context.votedPlayers, localPlayer.id])
                }
            });
            connections.forEach((c: SimpleConnection) => {
                c.send(JSON.stringify(createGameMessage('VOTE_REQUEST', {
                    playerId: localPlayer.id,
                    value
                })));
            });
        }
    };

    const handleReveal = () => {
        if (!isInitiator) return;
        // Host reveals all collected votes at once
        onAddLedger?.({
            type: 'REVEAL',
            payload: { votes: { ...hostVotesRef.current } }
        });
    };

    const handleReset = () => {
        if (!isInitiator) return;
        hostVotesRef.current = {};
        onAddLedger?.({ type: 'RESET', payload: {} });
    };

    const handleSetDescription = (val: string) => {
        if (!isInitiator) return;
        onAddLedger?.({
            type: 'SET_DESCRIPTION',
            payload: { description: val }
        });
    };

    const handleAcceptEstimation = (estimate: string) => {
        if (!isInitiator) return;
        hostVotesRef.current = {};
        onAddLedger?.({
            type: 'ACCEPT_ESTIMATION',
            payload: { description: state.context.description, estimate }
        });
    };

    const localPlayer = playerInfos.find(p => p.isLocal);
    // For local player, show their local vote or the confirmed vote from host
    const myDisplayVote = localPlayer
        ? (localVote || hostVotesRef.current[localPlayer.id])
        : null;

    const allVoted = playerInfos.length > 0 && playerInfos.every(p => votedPlayers.has(p.id));

    const consensus = useMemo(() => {
        if (!isRevealed || Object.keys(votes).length === 0) return null;

        const voteValues = Object.values(votes);
        const uniqueVotes = Array.from(new Set(voteValues));

        if (voteValues.includes("☕")) {
            return {
                label: "COFFEE BREAK",
                color: "text-amber-400",
                description: "Break needed or requested.",
                glow: "shadow-[0_0_30px_rgba(251,191,36,0.2)]"
            };
        }

        if (uniqueVotes.length === 1) {
            return {
                label: "UNANIMOUS",
                color: "text-primary",
                description: "Perfect synchronization achieved.",
                glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            };
        }

        // Numerical indices for Fibonacci check
        const fibIndices = uniqueVotes
            .map(v => FIBONACCI.indexOf(v))
            .filter(i => i !== -1 && FIBONACCI[i] !== "?" && FIBONACCI[i] !== "☕")
            .sort((a, b) => a - b);

        if (fibIndices.length === 0) return {
            label: "INCONCLUSIVE",
            color: "text-slate-400",
            description: "Awaiting clear numerical consensus.",
            glow: ""
        };

        const spread = fibIndices[fibIndices.length - 1] - fibIndices[0];

        if (spread <= 1) {
            return {
                label: "HARMONIOUS",
                color: "text-blue-400",
                description: "Team is converging. Almost there.",
                glow: ""
            };
        }

        return {
            label: "DIVERGENT",
            color: "text-rose-500",
            description: "High variance detected. Discussion needed.",
            glow: ""
        };
    }, [isRevealed, votes]);

    return (
        <Card className={cn(
            "min-h-screen p-8 flex flex-col space-y-12 bg-[#020617] text-slate-100 border-0 rounded-none overflow-x-hidden relative transition-colors duration-1000",
            consensus?.label === "UNANIMOUS" && "bg-[#020815]"
        )}>
            <div className={cn(
                "absolute inset-0 transition-opacity duration-1000 pointer-events-none",
                consensus?.label === "UNANIMOUS"
                    ? "bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent)] opacity-100"
                    : "bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent)]"
            )} />

            {/* Header */}
            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-neon transition-all duration-500",
                        consensus?.label === "UNANIMOUS" && "scale-110 rotate-12 bg-primary/20"
                    )}>
                        <Sparkles className={cn(
                            "w-8 h-8 text-primary animate-pulse",
                            consensus?.label === "UNANIMOUS" && "animate-bounce"
                        )} />
                    </div>
                    <div>
                        <h2 className="text-5xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
                            PLANNING POKER
                        </h2>
                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.4em] mt-1 ml-1">Subspace Estimation Protocol</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    {isInitiator && (
                        <>
                            {isRevealed && !consensus?.label.includes("INCONCLUSIVE") && !consensus?.label.includes("COFFEE") && (
                                <Button
                                    onClick={() => {
                                        // Pick the most common vote or first if tied
                                        const voteValues = Object.values(votes);
                                        const counts = voteValues.reduce((acc, v) => ({ ...acc, [v]: (acc[v] || 0) + 1 }), {} as any);
                                        const sorted = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]);
                                        const bestEstimate = sorted[0][0];
                                        handleAcceptEstimation(bestEstimate);
                                    }}
                                    className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-95"
                                >
                                    <Check className="w-5 h-5 mr-3" />
                                    Accept Result
                                </Button>
                            )}
                            <Button
                                onClick={handleReveal}
                                disabled={isRevealed || votedPlayers.size === 0}
                                className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-neon transition-all active:scale-95 disabled:opacity-20"
                            >
                                <Eye className="w-5 h-5 mr-3" />
                                Reveal All
                            </Button>
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                <RotateCcw className="w-5 h-5 mr-3" />
                                Reset Round
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Ticket Description Area */}
            <div className="relative z-10 w-full max-w-4xl mx-auto">
                {isInitiator ? (
                    <div className="relative group">
                        <FileText className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="WHAT ARE WE ESTIMATING? (E.G. USER AUTHENTICATION REFACTOR)"
                            value={description}
                            onChange={(e) => handleSetDescription(e.target.value.toUpperCase())}
                            className="h-20 pl-16 pr-8 rounded-[2rem] bg-white/5 border-white/5 focus:border-primary/30 focus:bg-white/10 text-xl font-black tracking-tight placeholder:text-slate-700 transition-all uppercase"
                        />
                    </div>
                ) : (
                    <div className="h-20 flex items-center gap-6 px-10 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-sm">
                        <FileText className="w-6 h-6 text-primary animate-pulse" />
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Active Objective</p>
                            <p className="text-xl font-black text-white tracking-tight uppercase">
                                {description || "AWAITING MISSION DATA..."}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-12 relative z-10 h-full">
                {/* Left Side: Grid */}
                <div className="flex-1 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <div className="w-1 h-3 bg-primary rounded-full" />
                            Estimation Matrix
                        </h3>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            {allVoted ? "CONSENSUS READY" : "AWAITING TRANSMISSIONS"}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-6">
                        {FIBONACCI.map((value) => {
                            const isSelected = myDisplayVote === value;
                            return (
                                <button
                                    key={value}
                                    onClick={() => handleVote(value)}
                                    disabled={isRevealed}
                                    className={cn(
                                        "aspect-[2/3] rounded-[1.5rem] border-2 flex flex-col items-center justify-center transition-all duration-300 relative group",
                                        isSelected
                                            ? "bg-primary/20 border-primary shadow-neon -translate-y-2"
                                            : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5",
                                        isRevealed && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="text-4xl font-black tracking-tighter">
                                        {value === "☕" ? <Coffee className="w-10 h-10" /> :
                                            value === "?" ? <HelpCircle className="w-10 h-10" /> : value}
                                    </div>

                                    {isSelected && (
                                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-4 border-[#020617] animate-in zoom-in duration-300">
                                            <CheckCircle2 className="w-4 h-4 text-[#020617]" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Players */}
                <div className="w-full lg:w-[350px] shrink-0">
                    <div className="sticky top-8 space-y-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <div className="w-1 h-3 bg-primary rounded-full" />
                            Mission Crew
                        </h3>

                        <div className="space-y-4">
                            {playerInfos.map((player) => (
                                <div
                                    key={player.id}
                                    className={cn(
                                        "p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between",
                                        votedPlayers.has(player.id)
                                            ? "bg-primary/5 border-primary/20"
                                            : "bg-white/5 border-white/5 opacity-60"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden">
                                                <User className="w-5 h-5 text-slate-500" />
                                            </div>
                                            {votedPlayers.has(player.id) && (
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-[#020617] flex items-center justify-center">
                                                    <CheckCircle2 className="w-2 h-2 text-[#020617]" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase text-white tracking-wide">{player.name}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                {player.isLocal ? "Neural Link" : "Remote Node"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        {isRevealed ? (
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-black animate-in zoom-in duration-500",
                                                consensus?.label === "UNANIMOUS" && "shadow-neon scale-110"
                                            )}>
                                                {votes[player.id] || "—"}
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                                {votedPlayers.has(player.id) ? (
                                                    <Clock className="w-4 h-4 text-slate-600 animate-spin-slow" />
                                                ) : (
                                                    <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        {isRevealed && consensus && (
                            <div className={cn(
                                "p-8 rounded-[2rem] bg-gradient-to-br from-primary/10 to-transparent border border-primary/10 shadow-glass-dark animate-in fade-in slide-in-from-bottom-4 duration-500",
                                consensus.glow
                            )}>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Consensus Analysis</p>
                                <div className="space-y-6">
                                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Team Status</p>
                                        <p className={cn("text-3xl font-black tracking-tighter", consensus.color)}>
                                            {consensus.label}
                                        </p>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider text-center px-2">
                                        {consensus.description}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Section */}
            {history.length > 0 && (
                <div className="mt-12 space-y-8 relative z-10 border-t border-white/5 pt-12">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Archived Estimations
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[...history].reverse().map((item, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimation Entry</p>
                                    <p className="text-sm font-black text-white uppercase tracking-tight">{item.description}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shadow-neon group-hover:scale-110 transition-transform">
                                    {item.estimate}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-auto w-full flex justify-between items-center pt-8 border-t border-white/5 relative z-10">
                <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.4em]">
                        POKER-OS // NODE_CONNECTED
                    </p>
                </div>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.4em]">
                    Build revision 2026.01.12
                </p>
            </div>
        </Card>
    );
}
