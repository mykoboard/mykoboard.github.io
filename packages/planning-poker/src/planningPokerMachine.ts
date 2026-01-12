import { createMachine, assign } from 'xstate';

export interface PokerContext {
    votes: Record<string, string>;
    votedPlayers: Set<string>;
    isRevealed: boolean;
    description: string;
    history: Array<{ description: string; estimate: string }>;
}

export type PokerEvent =
    | { type: 'COMMIT'; payload: { playerId: string } }
    | { type: 'REVEAL'; payload: { votes: Record<string, string> } }
    | { type: 'RESET' }
    | { type: 'SET_DESCRIPTION'; payload: { description: string } }
    | { type: 'ACCEPT_ESTIMATION'; payload: { description?: string, estimate: string } }
    | { type: 'SYNC_STATE'; context: PokerContext };

export const planningPokerMachine = createMachine({
    id: 'planningPoker',
    types: {} as {
        context: PokerContext;
        events: PokerEvent;
        input: { isInitiator: boolean };
    },
    initial: 'voting',
    context: ({ input }) => ({
        votes: {},
        votedPlayers: new Set<string>(),
        isRevealed: false,
        description: "",
        history: []
    }),
    states: {
        voting: {
            on: {
                COMMIT: {
                    actions: assign(({ context, event }) => {
                        const nextVoted = new Set(context.votedPlayers);
                        nextVoted.add(event.payload.playerId);
                        return { votedPlayers: nextVoted };
                    })
                },
                REVEAL: {
                    target: 'revealed',
                    actions: assign(({ event }) => ({
                        votes: event.payload.votes,
                        isRevealed: true
                    }))
                },
                SYNC_STATE: {
                    actions: assign(({ event }) => event.context)
                }
            }
        },
        revealed: {
            on: {
                RESET: {
                    target: 'voting',
                    actions: assign({
                        votes: {},
                        votedPlayers: new Set<string>(),
                        isRevealed: false,
                        description: "",
                        history: []
                    })
                },
                SYNC_STATE: {
                    actions: assign(({ event }) => event.context)
                }
            }
        }
    }
});

export function applyLedgerToPokerState(players: any[], ledger: any[]): PokerContext {
    let context: PokerContext = {
        votes: {},
        votedPlayers: new Set<string>(),
        isRevealed: false,
        description: "",
        history: []
    };

    ledger.forEach(entry => {
        const action = entry.action;
        if (!action) return;

        switch (action.type) {
            case 'COMMIT':
                context.votedPlayers.add(action.payload.playerId);
                break;
            case 'REVEAL':
                context.votes = action.payload.votes;
                context.isRevealed = true;
                break;
            case 'RESET':
                context.votes = {};
                context.votedPlayers = new Set<string>();
                context.isRevealed = false;
                context.description = "";
                break;
            case 'SET_DESCRIPTION':
                context.description = action.payload.description;
                break;
            case 'ACCEPT_ESTIMATION':
                context.history.push({
                    description: action.payload.description || context.description,
                    estimate: action.payload.estimate
                });
                // Reset for next ticket
                context.votes = {};
                context.votedPlayers = new Set<string>();
                context.isRevealed = false;
                context.description = "";
                break;
        }
    });

    return context;
}
