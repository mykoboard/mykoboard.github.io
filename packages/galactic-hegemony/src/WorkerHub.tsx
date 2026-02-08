import React, { useState } from 'react';
import {
    GalacticHegemonyContext,
    PlayerState,
    TechPath
} from './galacticHegemonyMachine';
import {
    Factory, Beaker, Globe, Ship as ShipIcon,
    UserCircle, Swords, Coins, FlaskConical
} from 'lucide-react';

interface WorkerHubProps {
    slots: GalacticHegemonyContext['slots'];
    players: PlayerState[];
    localPlayer: PlayerState | undefined;
    onPlaceWorker: (slotId: string, techPath?: TechPath, planetId?: string, shipType?: 'frigate' | 'dreadnought') => void;
}

export const WorkerHub: React.FC<WorkerHubProps> = ({ slots, players, localPlayer, onPlaceWorker }) => {
    const [selectedTechSlot, setSelectedTechSlot] = useState<string | null>(null);
    const [selectedShipSlot, setSelectedShipSlot] = useState<string | null>(null);
    const [selectedPlanetSlot, setSelectedPlanetSlot] = useState<string | null>(null);

    const handleSlotClick = (slot: typeof slots[0]) => {
        if (slot.occupantId) return;

        if (slot.actionType === 'TECH') {
            setSelectedTechSlot(slot.id);
            return;
        }
        if (slot.actionType === 'SHIP') {
            setSelectedShipSlot(slot.id);
            return;
        }
        if (slot.actionType === 'WARP') {
            setSelectedPlanetSlot(slot.id);
            return;
        }

        onPlaceWorker(slot.id);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in slide-in-from-top-4 duration-700">
            {slots.map(slot => {
                const occupant = players.find(p => p.id === slot.occupantId);
                const isMySlot = slot.occupantId === 'local';
                const canBump = !isMySlot && slot.occupantId && localPlayer &&
                    (localPlayer.ships.frigates + localPlayer.ships.dreadnoughts * 3) >
                    ((occupant?.ships.frigates ?? 0) + (occupant?.ships.dreadnoughts ?? 0) * 3);

                const isSelecting = selectedTechSlot === slot.id || selectedShipSlot === slot.id || selectedPlanetSlot === slot.id;

                return (
                    <div key={slot.id} className="relative group">
                        <button
                            onClick={() => handleSlotClick(slot)}
                            disabled={!!slot.occupantId && !canBump || isSelecting}
                            className={`w-full flex flex-col items-start p-4 rounded-[24px] border border-slate-700 transition-all duration-300 relative
                                ${slot.occupantId && !canBump
                                    ? 'bg-slate-900/50 opacity-60 cursor-not-allowed'
                                    : 'bg-slate-800/80 hover:bg-slate-800 hover:border-blue-500/50 hover:shadow-xl hover:-translate-y-0.5'}`}
                        >
                            {/* Compact Header Line: Title + Commander Slot */}
                            <div className="flex items-center justify-between w-full mb-3 gap-4">
                                <h3 className="font-black text-lg text-white tracking-tight truncate">{slot.name}</h3>

                                <div className="shrink-0">
                                    {!slot.occupantId && !isSelecting ? (
                                        <div className="w-12 h-10 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center group-hover:border-blue-500/30 group-hover:bg-blue-500/5 transition-all duration-300 shadow-inner bg-black/20 relative">
                                            <div className="opacity-40 group-hover:opacity-20">
                                                {slot.type === 'production' && <Factory className="w-5 h-5 text-orange-400" />}
                                                {slot.type === 'research' && <Beaker className="w-5 h-5 text-green-400" />}
                                                {slot.type === 'exploration' && <Globe className="w-5 h-5 text-blue-400" />}
                                                {slot.type === 'shipyard' && <ShipIcon className="w-5 h-5 text-purple-400" />}
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <UserCircle className="w-5 h-5 text-blue-400" />
                                            </div>
                                        </div>
                                    ) : occupant ? (
                                        <div className={`w-12 h-10 rounded-xl border-2 flex items-center justify-center shadow-2xl relative animate-in zoom-in-50 duration-300
                                            ${isMySlot ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400'}
                                        `}>
                                            <UserCircle className="w-6 h-6 text-white" />
                                            <div className="absolute -bottom-1 -right-1 bg-black/80 rounded p-1 border border-white/10 backdrop-blur-md">
                                                {slot.type === 'production' && <Factory className="w-3 h-3 text-orange-400" />}
                                                {slot.type === 'research' && <Beaker className="w-3 h-3 text-green-400" />}
                                                {slot.type === 'exploration' && <Globe className="w-3 h-3 text-blue-400" />}
                                                {slot.type === 'shipyard' && <ShipIcon className="w-3 h-3 text-purple-400" />}
                                            </div>
                                            {canBump && (
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full border border-white/20 uppercase tracking-tighter shadow-lg animate-pulse whitespace-nowrap">
                                                    Bumpable
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(slot.cost).map(([res, val]) => (
                                    <span key={res} className="px-2 py-0.5 bg-red-500/10 rounded text-[9px] font-black text-red-400 border border-red-500/10">
                                        -{val} {res}
                                    </span>
                                ))}
                                {Object.entries(slot.reward).map(([res, val]) => (
                                    <span key={res} className="px-2 py-0.5 bg-green-500/10 rounded text-[9px] font-black text-green-400 border border-green-500/10">
                                        +{val} {res}
                                    </span>
                                ))}
                            </div>
                        </button>

                        {/* Inline Selection Menus */}
                        {selectedTechSlot === slot.id && (
                            <div className="absolute inset-0 bg-slate-900/95 z-20 rounded-[32px] p-4 flex flex-col justify-center animate-in fade-in zoom-in-95">
                                <p className="text-[10px] font-black uppercase text-blue-400 mb-3 text-center tracking-widest">Select Tech Path</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['military', 'economic', 'science'] as TechPath[]).map(path => (
                                        <button
                                            key={path}
                                            onClick={() => {
                                                onPlaceWorker(slot.id, path);
                                                setSelectedTechSlot(null);
                                            }}
                                            className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all"
                                        >
                                            {path === 'military' && <Swords className="w-5 h-5 text-red-500" />}
                                            {path === 'economic' && <Coins className="w-5 h-5 text-green-500" />}
                                            {path === 'science' && <FlaskConical className="w-5 h-5 text-blue-500" />}
                                            <span className="text-[8px] font-black uppercase tracking-tighter">{path}</span>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setSelectedTechSlot(null)} className="mt-4 text-[10px] font-bold text-slate-500 hover:text-white uppercase transition-colors">Cancel</button>
                            </div>
                        )}

                        {selectedShipSlot === slot.id && (
                            <div className="absolute inset-0 bg-slate-900/95 z-20 rounded-[32px] p-4 flex flex-col justify-center animate-in fade-in zoom-in-95">
                                <p className="text-[10px] font-black uppercase text-purple-400 mb-3 text-center tracking-widest">Commission Ship</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            onPlaceWorker(slot.id, undefined, undefined, 'frigate');
                                            setSelectedShipSlot(null);
                                        }}
                                        className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-center"
                                    >
                                        <ShipIcon className="w-6 h-6 text-purple-400" />
                                        <div className="text-[8px] font-black uppercase tracking-tighter">Frigate</div>
                                        <div className="text-[10px] font-bold text-slate-500">2 🌑 2 💰</div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onPlaceWorker(slot.id, undefined, undefined, 'dreadnought');
                                            setSelectedShipSlot(null);
                                        }}
                                        className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-center"
                                    >
                                        <ShipIcon className="w-8 h-8 text-indigo-400" />
                                        <div className="text-[8px] font-black uppercase tracking-tighter">Dreadnought</div>
                                        <div className="text-[10px] font-bold text-slate-500">5 🌑 1 💾</div>
                                    </button>
                                </div>
                                <button onClick={() => setSelectedShipSlot(null)} className="mt-4 text-[10px] font-bold text-slate-500 hover:text-white uppercase transition-colors">Cancel</button>
                            </div>
                        )}

                        {selectedPlanetSlot === slot.id && localPlayer && (
                            <div className="absolute inset-0 bg-slate-900/95 z-20 rounded-[32px] p-4 flex flex-col animate-in fade-in zoom-in-95">
                                <p className="text-[10px] font-black uppercase text-blue-400 mb-3 text-center tracking-widest">Colonize System</p>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {localPlayer.planetsHand.map(planet => (
                                        <button
                                            key={planet.id}
                                            onClick={() => {
                                                onPlaceWorker(slot.id, undefined, planet.id);
                                                setSelectedPlanetSlot(null);
                                            }}
                                            className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full 
                                                    ${planet.type === 'volcanic' ? 'bg-red-500' :
                                                        planet.type === 'crystal' ? 'bg-blue-300' :
                                                            planet.type === 'gaia' ? 'bg-green-500' :
                                                                'bg-purple-500'}
                                                `} />
                                                <span className="text-[10px] font-black text-white">{planet.name}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-blue-400">{planet.influenceCost} ⚛️</span>
                                        </button>
                                    ))}
                                    {localPlayer.planetsHand.length === 0 && (
                                        <p className="text-[10px] text-slate-500 italic text-center py-4">No planets in hand...</p>
                                    )}
                                </div>
                                <button onClick={() => setSelectedPlanetSlot(null)} className="mt-2 text-[10px] font-bold text-slate-500 hover:text-white uppercase transition-colors shrink-0">Cancel</button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
