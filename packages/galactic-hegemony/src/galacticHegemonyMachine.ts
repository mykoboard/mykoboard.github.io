import { createMachine, assign } from 'xstate';
import { LedgerEntry } from '@mykoboard/integration';

export type ResourceType = 'credits' | 'matter' | 'data' | 'influence';
export type TechPath = 'military' | 'economic' | 'science';

export interface PlayerState {
    id: string;
    name: string;
    resources: Record<ResourceType, number>;
    workers: number;
    availableWorkers: number;
    unlockedCommanders: number;
    ships: {
        frigates: number;
        dreadnoughts: number;
    };
    techLevels: Record<TechPath, number>;
    planetsHand: Planet[];
    colonizedPlanets: Planet[];
}

export interface Planet {
    id: string;
    name: string;
    type: 'volcanic' | 'crystal' | 'gaia' | 'ancient';
    influenceCost: number;
    vp: number;
    discoveryBonus?: Partial<Record<ResourceType, number>>;
    perk: string;
}

export interface GalacticHegemonyContext {
    players: PlayerState[];
    currentPlayerIndex: number;
    gamePhase: 'setup' | 'event' | 'protocol' | 'placement' | 'recall' | 'finished';
    round: number;
    isInitiator: boolean;
    ledger?: LedgerEntry[];
    // Board state
    slots: {
        id: string;
        name: string;
        type: 'production' | 'research' | 'exploration' | 'shipyard';
        occupantId: string | null;
        reward: Partial<Record<ResourceType, number>>;
        cost: Partial<Record<ResourceType, number>>;
        actionType: 'MINE' | 'TAX' | 'RECRUIT' | 'DATA' | 'TECH' | 'SCAN' | 'WARP' | 'SHIP' | 'TRADE';
    }[];
    planetDeck: Planet[];
    eventContext: {
        type: 'dyson_dilemma' | null;
        contributions: Record<string, { matter: number; data: number }>;
        target: number;
    };
}

export type GalacticHegemonyEvent =
    | { type: 'PLACE_WORKER'; slotId: string; playerId: string; techPath?: TechPath; planetId?: string; shipType?: 'frigate' | 'dreadnought' }
    | { type: 'CONTRIBUTE'; playerId: string; resources: { matter?: number; data?: number } }
    | { type: 'SYNC_STATE'; context: Partial<GalacticHegemonyContext> }
    | { type: 'NEXT_PHASE' }
    | { type: 'RESET' };

// Initial state constants
export const INITIAL_SLOTS: GalacticHegemonyContext['slots'] = [
    { id: 'mine-1', name: 'Asteroid Mining', type: 'production', occupantId: null, reward: { matter: 3 }, cost: {}, actionType: 'MINE' },
    { id: 'tax-1', name: 'Tax Colony', type: 'production', occupantId: null, reward: { credits: 4 }, cost: {}, actionType: 'TAX' },
    { id: 'recruit-1', name: 'Recruitment Hub', type: 'production', occupantId: null, reward: {}, cost: { credits: 5 }, actionType: 'RECRUIT' },
    { id: 'data-1', name: 'Data Siphon', type: 'research', occupantId: null, reward: { data: 2 }, cost: {}, actionType: 'DATA' },
    { id: 'tech-1', name: 'Tech Breakthrough', type: 'research', occupantId: null, reward: {}, cost: { data: 2 }, actionType: 'TECH' },
    { id: 'scan-1', name: 'Deep Space Scan', type: 'exploration', occupantId: null, reward: {}, cost: {}, actionType: 'SCAN' },
    { id: 'warp-1', name: 'Warp Gate', type: 'exploration', occupantId: null, reward: {}, cost: {}, actionType: 'WARP' },
    { id: 'shipyard-1', name: 'Imperial Shipyard', type: 'shipyard', occupantId: null, reward: {}, cost: {}, actionType: 'SHIP' },
];

export const INITIAL_PLANETS: Planet[] = [
    { id: 'v1', name: 'Magma Prime', type: 'volcanic', influenceCost: 2, vp: 2, discoveryBonus: { matter: 4 }, perk: 'ships -1 matter' },
    { id: 'c1', name: 'Glacial Array', type: 'crystal', influenceCost: 3, vp: 3, perk: 'research -1 data' },
    { id: 'g1', name: 'Eden Prime', type: 'gaia', influenceCost: 4, vp: 4, discoveryBonus: { influence: 3 }, perk: 'extra slot' },
    { id: 'a1', name: 'Forerunner Monolith', type: 'ancient', influenceCost: 6, vp: 6, perk: 'skip tech tier' },
];

export const galacticHegemonyMachine = createMachine({
    types: {} as {
        context: GalacticHegemonyContext;
        events: GalacticHegemonyEvent;
    },
    id: 'galactic-hegemony',
    initial: 'setup',
    context: {
        players: [],
        currentPlayerIndex: 0,
        gamePhase: 'setup',
        round: 1,
        isInitiator: false,
        slots: INITIAL_SLOTS,
        planetDeck: INITIAL_PLANETS,
        eventContext: {
            type: null,
            contributions: {},
            target: 0
        }
    },
    states: {
        setup: {
            on: {
                SYNC_STATE: {
                    target: 'event',
                    actions: 'syncState'
                }
            }
        },
        event: {
            entry: assign({ gamePhase: 'event' }),
            always: [
                {
                    target: 'protocol',
                    guard: ({ context }) => !context.eventContext.type
                }
            ],
            on: {
                CONTRIBUTE: {
                    actions: 'contributeToEvent'
                },
                NEXT_PHASE: {
                    target: 'protocol',
                    actions: 'resolveEvent'
                }
            }
        },
        protocol: {
            entry: assign({ gamePhase: 'protocol' }),
            on: {
                NEXT_PHASE: 'placement'
            }
        },
        placement: {
            entry: assign({ gamePhase: 'placement' }),
            on: {
                PLACE_WORKER: {
                    actions: 'placeWorker'
                },
                NEXT_PHASE: 'recall'
            }
        },
        recall: {
            entry: assign({ gamePhase: 'recall' }),
            on: {
                NEXT_PHASE: {
                    target: 'event',
                    actions: 'resetRound'
                }
            }
        },
        finished: {
            type: 'final'
        }
    }
}, {
    actions: {
        syncState: assign(({ event }) => {
            if (event.type !== 'SYNC_STATE') return {};
            return event.context;
        }),
        placeWorker: assign(({ context, event }) => {
            if (event.type !== 'PLACE_WORKER') return {};
            const { slotId, playerId } = event;
            const slot = context.slots.find(s => s.id === slotId);
            if (!slot) return {};

            const currentPlayer = context.players.find(p => p.id === playerId);
            if (!currentPlayer || currentPlayer.availableWorkers <= 0) return {};

            // Check if bumping is needed
            const occupantId = slot.occupantId;
            let isBumping = false;
            if (occupantId) {
                if (occupantId === playerId) return {}; // Can't bump yourself

                const occupant = context.players.find(p => p.id === occupantId);
                // Bumping Rule: More ships in Home Sector (simplified to total ships for now)
                const myShips = currentPlayer.ships.frigates + (currentPlayer.ships.dreadnoughts * 3);
                const theirShips = occupant ? (occupant.ships.frigates + (occupant.ships.dreadnoughts * 3)) : 0;

                if (myShips <= theirShips) return {}; // Not enough power to bump
                if (currentPlayer.resources.credits < 1) return {}; // Need 1 credit for bribe
                isBumping = true;
            }

            // Pay cost and bribe
            const players = context.players.map(p => {
                if (p.id === playerId) {
                    const newResources = { ...p.resources };
                    const newTechLevels = { ...p.techLevels };
                    let newPlanetsHand = [...p.planetsHand];
                    let newColonizedPlanets = [...p.colonizedPlanets];

                    // Handle special actions
                    if (slot.actionType === 'TECH' && event.techPath) {
                        const nextLevel = newTechLevels[event.techPath] + 1;
                        if (nextLevel > 4) return p;
                        const costs = [0, 2, 4, 7, 10];
                        const techCost = costs[nextLevel];
                        if (newResources.data < techCost) return p;
                        if (nextLevel === 4 && newResources.influence < 5) return p;
                        newResources.data -= techCost;
                        if (nextLevel === 4) newResources.influence -= 5;
                        newTechLevels[event.techPath] = nextLevel;
                    } else if (slot.actionType === 'SCAN') {
                        // Drawing from deck would ideally be deterministic with a seed, 
                        // for now we just take the first from deck (deck is synced)
                        const drawnPlanet = context.planetDeck[0];
                        if (drawnPlanet) {
                            newPlanetsHand.push(drawnPlanet);
                        }
                    } else if (slot.actionType === 'WARP' && event.planetId) {
                        const planet = newPlanetsHand.find(pl => pl.id === event.planetId);
                        if (planet && newResources.influence >= planet.influenceCost) {
                            newResources.influence -= planet.influenceCost;
                            newPlanetsHand = newPlanetsHand.filter(pl => pl.id !== event.planetId);
                            newColonizedPlanets.push(planet);
                            // Apply discovery bonus
                            if (planet.discoveryBonus) {
                                Object.entries(planet.discoveryBonus).forEach(([res, val]) => {
                                    newResources[res as ResourceType] += val;
                                });
                            }
                        } else {
                            return p; // Can't afford or planet not found
                        }
                    } else if (slot.actionType === 'SHIP' && event.shipType) {
                        const newShips = { ...p.ships };
                        if (event.shipType === 'frigate') {
                            if (newResources.matter >= 2 && newResources.credits >= 2) {
                                newResources.matter -= 2;
                                newResources.credits -= 2;
                                newShips.frigates += 1;
                            } else return p;
                        } else if (event.shipType === 'dreadnought') {
                            if (newResources.matter >= 5 && newResources.data >= 1) {
                                newResources.matter -= 5;
                                newResources.data -= 1;
                                newShips.dreadnoughts += 1;
                            } else return p;
                        }
                        return { ...p, resources: newResources, ships: newShips, availableWorkers: p.availableWorkers - 1 };
                    } else {
                        // Regular production/cost
                        Object.entries(slot.cost).forEach(([res, val]) => {
                            newResources[res as ResourceType] -= val;
                        });
                    }

                    if (isBumping) {
                        newResources.credits -= 1;
                    }

                    // Apply rewards with possible tech bonuses
                    Object.entries(slot.reward).forEach(([res, val]) => {
                        let rewardVal = val;
                        // Economic Tier 1: Orbital Refineries (+1 Matter at Forge)
                        if (res === 'matter' && slot.type === 'production' && newTechLevels.economic >= 1) {
                            rewardVal += 1;
                        }
                        newResources[res as ResourceType] += rewardVal;
                    });

                    let workers = p.workers;
                    if (slot.actionType === 'RECRUIT') {
                        workers += 1;
                    }

                    return {
                        ...p,
                        resources: newResources,
                        availableWorkers: p.availableWorkers - 1,
                        workers,
                        techLevels: newTechLevels,
                        planetsHand: newPlanetsHand,
                        colonizedPlanets: newColonizedPlanets
                    };
                }

                if (isBumping && p.id === occupantId) {
                    return {
                        ...p,
                        resources: { ...p.resources, credits: p.resources.credits + 1 }
                        // Note: bumped worker returns next round (handled by resetRound usually, 
                        // but here we just leave slot occupied by the new player)
                    };
                }

                return p;
            });

            const slots = context.slots.map(s =>
                s.id === slotId ? { ...s, occupantId: playerId } : s
            );

            return { slots, players };
        }),
        contributeToEvent: assign(({ context, event }) => {
            if (event.type !== 'CONTRIBUTE') return {};
            const { playerId, resources } = event;
            const player = context.players.find(p => p.id === playerId);
            if (!player) return {};

            const matter = resources.matter || 0;
            const data = resources.data || 0;

            if (player.resources.matter < matter || player.resources.data < data) return {};

            const players = context.players.map(p =>
                p.id === playerId
                    ? { ...p, resources: { ...p.resources, matter: p.resources.matter - matter, data: p.resources.data - data } }
                    : p
            );

            const contributions = { ...context.eventContext.contributions };
            const current = contributions[playerId] || { matter: 0, data: 0 };
            contributions[playerId] = { matter: current.matter + matter, data: current.data + data };

            return { players, eventContext: { ...context.eventContext, contributions } };
        }),
        resolveEvent: assign(({ context }) => {
            // Rewards for Dyson Dilemma: +10 Credits for top contributor, -5 Influence for bottom
            const contributionTotals = Object.entries(context.eventContext.contributions).map(([id, stats]) => ({
                id,
                total: stats.matter + stats.data
            })).sort((a, b) => b.total - a.total);

            if (contributionTotals.length === 0) return {};

            const topId = contributionTotals[0].id;
            const bottomId = contributionTotals[contributionTotals.length - 1].id;

            const players = context.players.map(p => {
                let newCredits = p.resources.credits;
                let newInfluence = p.resources.influence;
                if (p.id === topId) newCredits += 10;
                if (p.id === bottomId && contributionTotals.length > 1) newInfluence = Math.max(0, newInfluence - 5);
                return { ...p, resources: { ...p.resources, credits: newCredits, influence: newInfluence } };
            });

            return { players, eventContext: { ...context.eventContext, type: null, contributions: {} } };
        }),
        resetRound: assign(({ context }) => ({
            round: context.round + 1,
            slots: context.slots.map(s => ({ ...s, occupantId: null })),
            players: context.players.map(p => ({ ...p, availableWorkers: p.workers })),
            planetDeck: context.planetDeck.slice(context.slots.filter(s => s.actionType === 'SCAN' && s.occupantId).length),
            eventContext: (context.round + 1 === 4 || context.round + 1 === 8)
                ? { type: 'dyson_dilemma', contributions: {}, target: 20 }
                : context.eventContext
        })),
    }
});

export function applyLedgerToGalacticState(players: PlayerState[], ledger: LedgerEntry[]): Partial<GalacticHegemonyContext> {
    let slots = [...INITIAL_SLOTS];
    let updatedPlayers = players.map(p => ({
        ...p,
        resources: { credits: 10, matter: 0, data: 0, influence: 5 },
        workers: 3,
        availableWorkers: 3,
        ships: { frigates: 0, dreadnoughts: 0 },
        techLevels: { military: 0, economic: 0, science: 0 },
        planetsHand: [] as Planet[],
        colonizedPlanets: [] as Planet[]
    }));
    let planetDeck = [...INITIAL_PLANETS];

    ledger.forEach(entry => {
        const { type, payload } = entry.action;
        if (type === 'PLACE_WORKER') {
            const { slotId, playerId, techPath, planetId, shipType } = payload;
            const slotIndex = slots.findIndex(s => s.id === slotId);
            if (slotIndex === -1) return;
            const slot = slots[slotIndex];

            updatedPlayers = updatedPlayers.map(p => {
                if (p.id !== playerId) return p;
                const newResources = { ...p.resources };
                const newTechLevels = { ...p.techLevels };
                const newShips = { ...p.ships };
                let newPlanetsHand: Planet[] = [...p.planetsHand];
                let newColonizedPlanets: Planet[] = [...p.colonizedPlanets];

                if (slot.actionType === 'TECH' && techPath) {
                    const nextLevel = newTechLevels[techPath as TechPath] + 1;
                    const costs = [0, 2, 4, 7, 10];
                    newResources.data -= costs[nextLevel];
                    newTechLevels[techPath as TechPath] = nextLevel;
                } else if (slot.actionType === 'SCAN') {
                    const drawn = planetDeck.shift();
                    if (drawn) newPlanetsHand.push(drawn);
                } else if (slot.actionType === 'WARP' && planetId) {
                    const planet = newPlanetsHand.find(pl => pl.id === planetId);
                    if (planet) {
                        newResources.influence -= planet.influenceCost;
                        newPlanetsHand = newPlanetsHand.filter(pl => pl.id !== planetId);
                        newColonizedPlanets.push(planet);
                    }
                } else if (slot.actionType === 'SHIP' && shipType) {
                    if (shipType === 'frigate') {
                        newResources.matter -= 2;
                        newResources.credits -= 2;
                        newShips.frigates += 1;
                    } else if (shipType === 'dreadnought') {
                        newResources.matter -= 5;
                        newResources.data -= 1;
                        newShips.dreadnoughts += 1;
                    }
                } else {
                    Object.entries(slot.cost).forEach(([res, val]) => {
                        newResources[res as ResourceType] -= val;
                    });
                }

                Object.entries(slot.reward).forEach(([res, val]) => {
                    newResources[res as ResourceType] += val;
                });

                return {
                    ...p,
                    resources: newResources,
                    availableWorkers: p.availableWorkers - 1,
                    techLevels: newTechLevels,
                    ships: newShips,
                    planetsHand: newPlanetsHand,
                    colonizedPlanets: newColonizedPlanets
                };
            });

            slots[slotIndex] = { ...slot, occupantId: playerId };
        }
    });

    return { slots, players: updatedPlayers, planetDeck };
}
