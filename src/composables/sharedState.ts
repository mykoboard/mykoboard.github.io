import { ref } from 'vue';
import { createActor } from 'xstate';
import { lobbyMachine } from "../machines/lobbyMachine";
import { boardMachine } from "../machines/boardMachine";
import { GameSession } from "../lib/db";
import { SecureWallet, PlayerIdentity } from "../lib/wallet";
import { logger } from "../lib/logger";

// Global shared state
export const identity = ref<PlayerIdentity | null>(null);
export const isLoading = ref(true);
export const activeSessions = ref<GameSession[]>([]);

// Persistent Lobby Actor
export const lobbyActor = createActor(lobbyMachine, {
    input: { playerName: "Anonymous" }
}).start();

// Persistent Board Actor Management
const boardActors = new Map<string, any>();

export function getBoardActor(boardId: string, playerName: string, isInitiator: boolean = false, maxPlayers: number = 2) {
    if (!boardActors.has(boardId)) {
        logger.lobby('STATE', `Creating new board actor for ${boardId}`);
        const actor = createActor(boardMachine, {
            input: { playerName, boardId, isInitiator, maxPlayers }
        });
        actor.start();
        boardActors.set(boardId, actor);
    }
    return boardActors.get(boardId)!;
}

// Initialize identity once
const initIdentity = async () => {
    if (identity.value) return;
    const wallet = SecureWallet.getInstance();
    identity.value = await wallet.getIdentity();
    isLoading.value = false;
};
initIdentity();
