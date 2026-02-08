<script setup lang="ts">
import { computed } from 'vue'
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
}>()

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
    <ReactComponentWrapper 
      :component="GameComponent" 
      :componentProps="componentProps" 
    />
  </div>
</template>

