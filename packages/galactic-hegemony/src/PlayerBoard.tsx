import React from 'react';
import { Card } from "@/components/ui/card";
import { PlayerState, TechPath } from './galacticHegemonyMachine';
import {
    Coins, Zap, Beaker, Globe,
    UserCircle, LayoutGrid
} from 'lucide-react';

interface PlayerBoardProps {
    player: PlayerState;
}

export const PlayerBoard: React.FC<PlayerBoardProps> = ({ player }) => {
    const resourceTypes: { key: keyof typeof player.resources; icon: any; color: string; label: string }[] = [
        { key: 'credits', icon: Coins, color: 'text-yellow-400', label: 'Credits' },
        { key: 'matter', icon: Zap, color: 'text-orange-400', label: 'Matter' },
        { key: 'data', icon: Beaker, color: 'text-green-400', label: 'Data' },
        { key: 'influence', icon: Globe, color: 'text-blue-400', label: 'Influence' },
    ];

    return (
        <div className="flex flex-col gap-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Resource Tracks - Tabletop Style */}
            <Card className="bg-slate-900/80 border-white/5 backdrop-blur-xl p-6 rounded-[2rem] shadow-inner ring-1 ring-white/10">
                <div className="space-y-4">
                    {resourceTypes.map(({ key, icon: Icon, color, label }) => (
                        <div key={key} className="flex flex-col gap-2">
                            <div className="flex justify-between items-center px-2">
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${color}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                                </div>
                                <span className="text-xs font-black text-white">{player.resources[key]}</span>
                            </div>
                            <div className="flex gap-1 items-center bg-black/40 p-1.5 rounded-xl border border-white/5">
                                {Array.from({ length: 15 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 h-6 rounded-md flex items-center justify-center text-[8px] font-bold transition-all duration-500
                                            ${player.resources[key] === i
                                                ? `${color.replace('text', 'bg')} shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-110 z-10 text-slate-900`
                                                : 'bg-white/5 text-slate-600 border border-white/5'}
                                        `}
                                    >
                                        {i}
                                    </div>
                                ))}
                                <div className="ml-1 px-2 text-[10px] font-black text-slate-500 italic">+</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tech Tree - Physical Slots */}
                <Card className="bg-slate-900/80 border-white/5 backdrop-blur-xl p-6 rounded-[2rem] ring-1 ring-white/10">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 mb-6 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        Technological Infrastructure
                    </h3>
                    <div className="space-y-4">
                        {(['military', 'economic', 'science'] as TechPath[]).map(path => (
                            <div key={path} className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 capitalize">{path}</span>
                                    <span className="text-[10px] font-bold text-slate-500">Tier {player.techLevels[path]}</span>
                                </div>
                                <div className="flex gap-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 h-3 rounded-full border transition-all duration-700
                                                ${player.techLevels[path] > i
                                                    ? (path === 'military' ? 'bg-red-500 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                                                        path === 'economic' ? 'bg-green-500 border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                                                            'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]')
                                                    : 'bg-white/5 border-white/5'}
                                            `}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Commander Barracks & Planets */}
                <div className="flex flex-col gap-6">
                    <Card className="bg-slate-900/80 border-white/5 backdrop-blur-xl p-6 rounded-[2rem] ring-1 ring-white/10 flex-1">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 mb-6 flex items-center gap-2">
                            <UserCircle className="w-4 h-4" />
                            Commander Barracks
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {Array.from({ length: player.workers }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-500
                                        ${i < player.availableWorkers
                                            ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                            : 'bg-slate-800 border-slate-700 text-slate-600'}
                                    `}
                                >
                                    <UserCircle className="w-6 h-6" />
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="bg-slate-900/80 border-white/5 backdrop-blur-xl p-6 rounded-[2rem] ring-1 ring-white/10">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 mb-6 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Planetary Tableau
                        </h3>
                        <div className="flex gap-2 min-h-[40px] flex-wrap">
                            {player.colonizedPlanets.map(planet => (
                                <div
                                    key={planet.id}
                                    className={`w-10 h-10 rounded-full border-2 p-1 group relative
                                        ${planet.type === 'volcanic' ? 'bg-red-500/20 border-red-500/50' :
                                            planet.type === 'crystal' ? 'bg-blue-500/20 border-blue-500/50' :
                                                planet.type === 'gaia' ? 'bg-green-500/20 border-green-500/50' :
                                                    'bg-purple-500/20 border-purple-500/50'}
                                    `}
                                >
                                    <div className={`w-full h-full rounded-full 
                                        ${planet.type === 'volcanic' ? 'bg-red-500' :
                                            planet.type === 'crystal' ? 'bg-blue-300' :
                                                planet.type === 'gaia' ? 'bg-green-500' :
                                                    'bg-purple-500'}
                                    `} />
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 hidden group-hover:block z-50 animate-in fade-in zoom-in-95">
                                        <Card className="bg-slate-900 border-white/10 p-2 text-[10px] font-bold text-white shadow-2xl">
                                            <p className="border-b border-white/5 pb-1 mb-1">{planet.name}</p>
                                            <p className="text-slate-400 text-[8px] uppercase tracking-widest">{planet.perk}</p>
                                        </Card>
                                    </div>
                                </div>
                            ))}
                            {player.colonizedPlanets.length === 0 && (
                                <div className="text-[10px] font-bold text-slate-600 italic">No colonies established...</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
