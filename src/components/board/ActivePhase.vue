<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import ReactComponentWrapper from '../ReactComponentWrapper.vue'
import type { Connection } from '../../lib/webrtc'
import type { PlayerInfo } from '@mykoboard/integration'

const props = defineProps<{
    GameComponent: any;
    connectedPeers: Connection[];
    playerInfos: PlayerInfo[];
    isInitiator: boolean;
    ledger: any[];
    onAddLedger: (action: { type: string, payload: any }) => void;
    onFinishGame: () => void;
    framework?: 'react' | 'vue';
}>()

const resolvedComponent = shallowRef<any>(null)
watch(() => props.GameComponent, async (newComp) => {
    resolvedComponent.value = null
    if (newComp) {
        if (props.framework === 'vue') {
            const module = await (typeof newComp === 'function' ? newComp() : newComp)
            resolvedComponent.value = module.default || module
        } else {
            resolvedComponent.value = newComp
        }
    }
}, { immediate: true })

const componentProps = computed(() => ({
    connections: props.connectedPeers,
    playerNames: props.playerInfos.map(p => p.name),
    playerInfos: props.playerInfos,
    isInitiator: props.isInitiator,
    ledger: props.ledger,
    onAddLedger: props.onAddLedger,
    onFinishGame: props.onFinishGame
}))
</script>

<template>
  <div class="animate-zoom-in">
    <template v-if="framework === 'vue'">
        <component :is="resolvedComponent" v-bind="componentProps" v-if="resolvedComponent" />
    </template>
    <ReactComponentWrapper 
      v-else
      :component="GameComponent" 
      :componentProps="componentProps" 
    />
  </div>
</template>

