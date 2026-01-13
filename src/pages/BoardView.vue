<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getGameById } from '../lib/GameRegistry'
import { useGameSession } from '../composables/useGameSession'
import PreparationPhase from '../components/board/PreparationPhase.vue'
import ActivePhase from '../components/board/ActivePhase.vue'
import FinishedPhase from '../components/board/FinishedPhase.vue'
import PlayerList from '../components/board/Players.vue'

const route = useRoute()
const gameId = computed(() => route.params.gameId as string)
const boardId = computed(() => route.params.boardId as string)

const game = computed(() => getGameById(gameId.value || ""))

const {
    snapshot,
    send,
    signalingMode,
    signalingClient,
    isServerConnecting,
    playerInfos,
    connectedPeers,
    pendingSignaling,
    isInitiator,
    isGameStarted,
    onHostAGame,
    connectWithOffer,
    updateOffer,
    updateAnswer,
    startGame,
    onFinishGame,
    onAddLedger,
    handlePlayAgain,
    onAcceptGuest,
    onRejectGuest,
    onCancelSignaling,
    onBackToGames,
    onBackToDiscovery
} = useGameSession()

const isFinished = computed(() => snapshot.value.matches('room.finished'))
const isPreparation = computed(() => !isGameStarted.value && !isFinished.value)

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isPreparation.value) {
        e.preventDefault()
        e.returnValue = ''
    }
}

onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <div v-if="game" class="max-w-7xl mx-auto p-6 space-y-12">
      <h1 class="text-3xl font-black tracking-tighter uppercase text-white">
        Lobby: <span class="text-gradient">{{ game.name }}</span>
      </h1>

      <div class="animate-fade-in-up">
        <FinishedPhase
          v-if="isFinished"
          :game-component="game.component"
          :connected-peers="connectedPeers"
          :player-infos="playerInfos"
          :is-initiator="isInitiator"
          :ledger="snapshot.context.ledger"
          :on-back-to-lobby="onBackToDiscovery"
        />
        
        <ActivePhase
          v-else-if="isGameStarted"
          :game-component="game.component"
          :connected-peers="connectedPeers"
          :player-infos="playerInfos"
          :is-initiator="isInitiator"
          :ledger="snapshot.context.ledger"
          :on-add-ledger="onAddLedger"
          :on-finish-game="onFinishGame"
        />

        <PreparationPhase
          v-else
          :state="snapshot"
          :is-initiator="isInitiator"
          :signaling-mode="signalingMode"
          :is-server-connecting="isServerConnecting"
          :signaling-client="signalingClient"
          :pending-signaling="pendingSignaling"
          :on-start-game="startGame"
          :on-host-agame="onHostAGame"
          :on-update-offer="updateOffer"
          :on-update-answer="updateAnswer"
          :on-close-session="onBackToGames"
          :on-back-to-lobby="onBackToDiscovery"
          :on-accept-guest="onAcceptGuest"
          :on-reject-guest="onRejectGuest"
          :on-cancel-signaling="onCancelSignaling"
          :on-remove-player="(id) => send({ type: 'REMOVE_PLAYER', playerId: id })"
          :player-count="playerInfos.length"
          :max-players="snapshot.context.maxPlayers"
          :boardId="boardId"
        />

        <div class="mt-12 max-w-2xl">
          <PlayerList
            :players="playerInfos"
            :on-remove="isInitiator ? (id) => send({ type: 'REMOVE_PLAYER', playerId: id }) : undefined"
          />
        </div>
      </div>
    </div>
    <div v-else class="p-10 text-center text-white/50 uppercase font-black tracking-widest">
      Game not found in grid.
    </div>
  </div>
</template>

<style scoped>
.text-gradient {
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.7s ease-out forwards;
}
</style>
