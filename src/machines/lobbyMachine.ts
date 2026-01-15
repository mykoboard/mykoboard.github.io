import { createMachine, assign } from 'xstate';

interface LobbyContext {
    playerName: string;
    signalingMode: 'manual' | 'server' | null;
    playerCount: number;
}

type LobbyEvent =
    | { type: 'SELECT_MODE'; mode: 'manual' | 'server' | null }
    | { type: 'SET_PLAYER_COUNT'; count: number }
    | { type: 'GOTO_SELECTION' }
    | { type: 'GOTO_DISCOVERY' };

export const lobbyMachine = createMachine({
    types: {} as {
        context: LobbyContext;
        events: LobbyEvent;
        input: { playerName: string };
    },
    id: 'lobby',
    initial: 'selection',
    context: ({ input }) => ({
        playerName: input.playerName,
        signalingMode: null,
        playerCount: 2,
    }),
    states: {
        selection: {
            on: {
                SELECT_MODE: {
                    target: 'discovery',
                    actions: assign({ signalingMode: ({ event }) => event.mode })
                }
            }
        },
        discovery: {
            on: {
                GOTO_SELECTION: 'selection',
                SET_PLAYER_COUNT: {
                    actions: assign({ playerCount: ({ event }) => event.count })
                },
                SELECT_MODE: {
                    actions: assign({ signalingMode: ({ event }) => event.mode })
                }
            }
        }
    }
});
