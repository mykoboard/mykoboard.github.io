import { computed, watch, Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSelector } from '@xstate/vue';
import { compositionRoot } from "../application/CompositionRoot";

/**
 * Lightweight composable that provides reactive access to the current 
 * board actor and snapshot based on the active route.
 * 
 * Replaces the legacy sharedState useBoardContext.
 */
export function useBoardContext() {
    const route = useRoute();
    const router = useRouter();

    const identity = compositionRoot.identityRepo.identity;

    const boardId = computed(() => route?.params?.boardId as string);
    const gameId = computed(() => route?.params?.gameId as string);

    const currentBoardActor = computed(() => {
        if (!boardId.value) return null;
        return compositionRoot.getBoardActor(boardId.value, identity.value?.name || 'Anonymous', false);
    });

    const boardSnapshot = useSelector(currentBoardActor, (s) => s as any);

    const isInitiator = computed(() => boardSnapshot.value?.context?.isInitiator || false);
    const isGameStarted = computed(() => boardSnapshot.value?.context?.isGameStarted || false);

    return { 
        route, 
        router, 
        boardId, 
        gameId, 
        currentBoardActor: currentBoardActor as Ref<any>, 
        boardSnapshot: boardSnapshot as Ref<any>, 
        isInitiator, 
        isGameStarted 
    };
}

/**
 * Utility to wait for identity initialization.
 */
export function waitForIdentity(): Promise<any> {
    const identity = compositionRoot.identityRepo.identity;
    if (identity.value) return Promise.resolve(identity.value);
    
    return new Promise((resolve) => {
        const stop = watch(identity, (val) => {
            if (val) {
                stop();
                resolve(val);
            }
        }, { immediate: true });
    });
}
