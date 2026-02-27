<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { CheckCircle2 } from 'lucide-vue-next'
import ReactComponentWrapper from '../ReactComponentWrapper.vue'
import type { Connection } from '../../lib/webrtc'
import type { PlayerInfo } from '@mykoboard/integration'

const props = defineProps<{
    GameComponent: any;
    connectedPeers: Connection[];
    playerInfos: PlayerInfo[];
    isInitiator: boolean;
    ledger: any[];
    onBackToLobby: () => void;
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
    onAddLedger: () => {}, // Disabled
    onFinishGame: () => {} // Already finished
}))
</script>

<template>
  <div class="space-y-6">
    <div class="opacity-80 pointer-events-none grayscale-[0.2]">
      <template v-if="framework === 'vue'">
        <component :is="resolvedComponent" v-bind="componentProps" v-if="resolvedComponent" />
      </template>
      <ReactComponentWrapper 
        v-else
        :component="GameComponent" 
        :componentProps="componentProps" 
      />
    </div>

    <div class="glass-dark p-8 border border-white/5 shadow-glass-dark rounded-[2.5rem] animate-fade-in-up">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <div class="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-neon">
            <CheckCircle2 class="w-8 h-8 text-primary" />
          </div>
          <div class="space-y-1">
            <h3 class="text-xl font-black text-white uppercase tracking-tight">Match Finalized</h3>
            <p class="text-[10px] text-white/30 uppercase tracking-widest font-black">All cycles complete. Handshake terminated.</p>
          </div>
        </div>
        <div class="flex gap-4 w-full md:w-auto">
          <button
            @click="onBackToLobby"
            class="w-full md:w-56 h-14 rounded-2xl bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] font-black uppercase tracking-[0.3em] text-xs transition-all"
          >
            Return to Discovery
          </button>
        </div>
      </div>
    </div>
    
    <div class="text-center text-white/10 text-[9px] font-black uppercase tracking-[0.4em] italic pt-4">
      Node state captured. Verification record locked inside vault.
    </div>
  </div>
</template>

