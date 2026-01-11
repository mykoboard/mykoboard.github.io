import React, { useMemo, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMachine } from '@xstate/react';
import {
    galacticHegemonyMachine,
    applyLedgerToGalacticState,
    PlayerState
} from './galacticHegemonyMachine';
import {
    createGameMessage,
    isGameMessage,
    GameProps,
    PlayerInfo,
    SimpleConnection
} from '@mykoboard/integration';
import {
    Rocket, Factory, Beaker, Globe,
    ChevronRight,
    ShieldAlert,
    Zap,
} from 'lucide-react';
import { PlayerBoard } from './PlayerBoard';
import { WorkerHub } from './WorkerHub';

export default function GalacticHegemony({
    connections,
    playerInfos,
    isInitiator,
    ledger,
    onAddLedger
}: GameProps) {
    const players = useMemo((): PlayerState[] => {
        return playerInfos.map((info) => ({
            id: info.isLocal ? 'local' : info.id,
            name: info.name,
            resources: { credits: 10, matter: 0, data: 0, influence: 5 },
            workers: 3,
            availableWorkers: 3,
            unlockedCommanders: 0,
            ships: { frigates: 0, dreadnoughts: 0 },
            techLevels: { military: 0, economic: 0, science: 0 },
            planetsHand: [],
            colonizedPlanets: []
        }));
    }, [playerInfos]);

    const [state, send] = useMachine(galacticHegemonyMachine, {
        input: { isInitiator }
    });

    const { slots, round, gamePhase } = state.context;
    const localPlayer = players.find(p => p.id === 'local');
    const otherPlayers = players.filter(p => p.id !== 'local');

    // Sync state from ledger
    useEffect(() => {
        if (!ledger || players.length < 2) return;
        const newContext = applyLedgerToGalacticState(players, ledger);
        send({ type: 'SYNC_STATE', context: newContext });
    }, [ledger, players, send]);

    // Handle networking
    useEffect(() => {
        const handleMessage = (data: string) => {
            try {
                const message = JSON.parse(data);
                if (!isGameMessage(message)) return;

                if (isInitiator && message.type === 'CONTRIBUTE_REQUEST') {
                    onAddLedger?.({
                        type: 'CONTRIBUTE',
                        payload: {
                            playerId: message.payload.playerId,
                            resources: message.payload.resources
                        }
                    });
                }

                if (isInitiator && message.type === 'PLACE_WORKER_REQUEST') {
                    onAddLedger?.({
                        type: 'PLACE_WORKER',
                        payload: {
                            slotId: message.payload.slotId,
                            playerId: message.payload.playerId,
                            techPath: message.payload.techPath,
                            planetId: message.payload.planetId,
                            shipType: message.payload.shipType
                        }
                    });
                }
            } catch (e) { }
        };

        connections.forEach((c: SimpleConnection) => c.addMessageListener(handleMessage));
        return () => connections.forEach((c: SimpleConnection) => c.removeMessageListener(handleMessage));
    }, [connections, isInitiator, onAddLedger]);

    type ResourceType = 'credits' | 'matter' | 'data' | 'influence';
    type TechPath = 'military' | 'economic' | 'science';

    const handlePlaceWorker = (slotId: string, techPath?: TechPath, planetId?: string, shipType?: 'frigate' | 'dreadnought') => {
        if (isInitiator) {
            onAddLedger?.({
                type: 'PLACE_WORKER',
                payload: { slotId, playerId: 'local', techPath, planetId, shipType }
            });
        } else {
            connections.forEach((c: SimpleConnection) => {
                c.send(JSON.stringify(createGameMessage('PLACE_WORKER_REQUEST', { slotId, playerId: 'local', techPath, planetId, shipType })));
            });
        }
    };

    const handleContribute = (resources: { matter?: number; data?: number }) => {
        if (!localPlayer) return;
        if (isInitiator) {
            onAddLedger?.({ type: 'CONTRIBUTE', payload: { playerId: 'local', resources } });
        } else {
            connections.forEach((c: SimpleConnection) => {
                c.send(JSON.stringify(createGameMessage('CONTRIBUTE_REQUEST', { playerId: 'local', resources })));
            });
        }
    };

    return (
        <Card className="min-h-screen p-8 flex flex-col space-y-12 bg-[#020617] text-slate-100 border-0 rounded-none overflow-x-hidden relative">
            {/* Ambient Background Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.1),transparent)] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center relative z-10">
                <div className="flex flex-col">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                            <Rocket className="w-8 h-8 text-blue-400 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-5xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
                                GALACTIC HEGEMONY
                            </h2>
                            <p className="text-[10px] font-black text-blue-400/60 uppercase tracking-[0.4em] mt-1 ml-1">Universal Expansion Protocol</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 bg-white/5 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-inner">
                    {/* Row 1: Stellar Epoch */}
                    <div className="flex items-center gap-8">
                        <div className="w-32">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Stellar Epoch</p>
                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Epoch Cycle 1-5</p>
                        </div>
                        <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map((e) => (
                                <div key={e} className="relative group/epoch">
                                    <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500
                                        ${round === e
                                            ? 'bg-blue-500/20 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                            : 'bg-black/40 border-white/5 group-hover/epoch:border-white/10'}`}
                                    >
                                        <span className={`text-[10px] font-black transition-colors ${round === e ? 'text-blue-400' : 'text-slate-600'}`}>{e}</span>
                                        {round === e && (
                                            <div className="absolute -top-1 -right-1 animate-in zoom-in-50 duration-500">
                                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/5" />

                    {/* Row 2: Protocol Phase Track */}
                    <div className="flex items-center gap-8">
                        <div className="w-32">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Protocol Phase</p>
                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Execution Sequence</p>
                        </div>
                        <div className="flex gap-4">
                            {[
                                { id: 'event', label: 'Event', desc: 'Cosmic Resolution' },
                                { id: 'protocol', label: 'Protocol', desc: 'Political State' },
                                { id: 'placement', label: 'Placement', desc: 'Commander Deployment' },
                                { id: 'recall', label: 'Recall', desc: 'System Reset' }
                            ].map((p, idx, arr) => (
                                <div key={p.id} className="flex items-center gap-4">
                                    <div className={`flex flex-col p-3 rounded-2xl border-2 transition-all duration-500 min-w-[140px] relative
                                        ${gamePhase === p.id
                                            ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                                            : 'bg-black/40 border-white/5 opacity-40'}
                                    `}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${gamePhase === p.id ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${gamePhase === p.id ? 'text-orange-400' : 'text-slate-500'}`}>
                                                {p.label}
                                            </span>
                                        </div>
                                        <span className="text-[8px] font-bold text-slate-600 uppercase mt-1 ml-4">{p.desc}</span>
                                        {gamePhase === p.id && (
                                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 animate-in slide-in-from-left-2 duration-500">
                                                <div className="w-1 h-8 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                            </div>
                                        )}
                                    </div>
                                    {idx < arr.length - 1 && <div className="w-4 h-px bg-white/10" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 relative z-10 h-full">
                {/* Left Side: Worker Hub (Game Board) */}
                <div className="flex-1 space-y-8">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <div className="w-1 h-3 bg-blue-500 rounded-full" />
                            Sector Hub (Active Conflicts)
                        </h3>
                        <div className="flex gap-2">
                            {otherPlayers.map(p => (
                                <div key={p.id} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full" title={p.name}>
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <WorkerHub
                        slots={slots}
                        players={players}
                        localPlayer={localPlayer}
                        onPlaceWorker={handlePlaceWorker}
                    />
                </div>

                {/* Right Side: Player Board (Personal Ledger) */}
                <div className="w-full lg:w-[450px] shrink-0">
                    <div className="sticky top-8 space-y-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <div className="w-1 h-3 bg-blue-500 rounded-full" />
                            Imperial Estate (Your Board)
                        </h3>
                        {localPlayer && (
                            <PlayerBoard
                                player={localPlayer}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Dyson Dilemma - Keeps as high-level overlay as it blocks all play */}
            {state.matches('event') && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020617]/90 backdrop-blur-3xl p-4 animate-in fade-in duration-500">
                    <Card className="bg-slate-900 border-yellow-500/50 p-12 rounded-[3rem] max-w-2xl w-full shadow-[0_0_100px_rgba(234,179,8,0.1)] ring-1 ring-yellow-500/20 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                        <div className="mx-auto w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-8 border border-yellow-500/20 shadow-inner">
                            <ShieldAlert className="w-12 h-12 text-yellow-500 animate-pulse" />
                        </div>
                        <h2 className="text-5xl font-black text-white mb-4 tracking-tighter">DYSON DILEMMA</h2>
                        <p className="text-slate-400 text-lg mb-10 font-bold leading-relaxed max-w-md mx-auto">
                            The central star is destabilizing. Your contributions will determine the fate of the Hegemony.
                        </p>

                        <div className="grid grid-cols-2 gap-8 mb-10 text-left">
                            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 shadow-inner">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Stability Progress</p>
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-3xl font-black text-white">45%</span>
                                    <span className="text-[10px] font-black text-slate-400">TARGET: 20</span>
                                </div>
                                <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden p-0.5">
                                    <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full w-[45%] shadow-[0_0_10px_rgba(234,179,8,0.4)]" />
                                </div>
                            </div>
                            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 shadow-inner">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Primary Sponsor</p>
                                <p className="text-2xl font-black text-blue-400 truncate">
                                    {Object.entries(state.context.eventContext.contributions).sort((a, b) => (b[1].matter + b[1].data) - (a[1].matter + a[1].data))[0]?.[0] || 'NONE'}
                                </p>
                                <p className="text-[10px] font-black text-yellow-500/60 mt-2 uppercase tracking-widest">Award: +10 Credits</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={() => handleContribute({ matter: 5 })}
                                disabled={!localPlayer || localPlayer.resources.matter < 5}
                                className="flex-1 h-20 rounded-[1.5rem] bg-orange-600 hover:bg-orange-500 text-white font-black text-lg gap-3 shadow-lg transition-all active:scale-95"
                            >
                                <Zap className="w-6 h-6 fill-white" />
                                5 Matter
                            </Button>
                            <Button
                                onClick={() => handleContribute({ data: 5 })}
                                disabled={!localPlayer || localPlayer.resources.data < 5}
                                className="flex-1 h-20 rounded-[1.5rem] bg-blue-600 hover:bg-blue-500 text-white font-black text-lg gap-3 shadow-lg transition-all active:scale-95"
                            >
                                <Beaker className="w-6 h-6 fill-white" />
                                5 Data
                            </Button>
                        </div>

                        {isInitiator && (
                            <Button
                                onClick={() => onAddLedger?.({ type: 'NEXT_PHASE', payload: {} })}
                                className="mt-10 w-full h-16 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-[0.3em] border border-white/5 transition-all"
                            >
                                Seal Resolution
                            </Button>
                        )}
                        {!isInitiator && (
                            <p className="mt-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic animate-pulse">Waiting for Consensus...</p>
                        )}
                    </Card>
                </div>
            )}

            <div className="mt-auto w-full flex justify-between items-center pt-12 border-t border-white/5 relative z-10">
                <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.4em]">
                        HEGEMONY-OS // NODE_CONNECTED
                    </p>
                </div>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.4em]">
                    Build revision 2026.01.02
                </p>
            </div>
        </Card>
    );
}
