<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getGameById } from '../lib/GameRegistry'
import { useLobby } from '../composables/useLobby'
import { useGameSession } from '../composables/useGameSession'
import { Connection } from '../lib/webrtc'
import PreparationPhase from '../components/board/PreparationPhase.vue'
import ActivePhase from '../components/board/ActivePhase.vue'
import FinishedPhase from '../components/board/FinishedPhase.vue'
import PlayerList from '../components/board/Players.vue'

const route = useRoute()
const gameId = computed(() => route.params.gameId as string)
const boardId = computed(() => route.params.boardId as string)

const game = computed(() => getGameById(gameId.value || ""))

const {
    signalingMode,
    signalingClient,
    isServerConnecting,
    onBackToDiscovery: rawOnBackToDiscovery,
    onBackToGames: rawOnBackToGames,
    activeSessions
} = useLobby()

const onBackToDiscovery = () => rawOnBackToDiscovery(gameId.value)
const onBackToLobby = () => rawOnBackToGames(gameId.value)

const {
    snapshot,
    send,
    playerInfos,
    connectedPeers: baseConnectedPeers,
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
    onBackToGames: rawCloseAndBack
} = useGameSession()

const connectedPeers = computed(() => baseConnectedPeers.value as Connection[])
const onBackToGames = () => {
    rawCloseAndBack();
    onBackToDiscovery();
}

const isFinished = computed(() => (snapshot.value as any)?.matches('finished') || false)
const isPreparation = computed(() => !isGameStarted.value && !isFinished.value)

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isPreparation.value) {
        e.preventDefault()
        e.returnValue = ''
    }
}

onMounted(() => {
    // Initialize state machine based on route
    // If we're on a board route and board machine is idle, this is a new hosting session
    if (boardId.value && snapshot.value?.matches('idle')) {
        const maxPlayers = parseInt(route.query.maxPlayers as string) || 2
        console.log('[BOARDVIEW] Initializing HOST state for boardId:', boardId.value, 'maxPlayers:', maxPlayers)
        
        send({ type: 'HOST', maxPlayers, boardId: boardId.value })
        
        // Create connection slots for guests
        for (let i = 0; i < maxPlayers - 1; i++) {
            setTimeout(() => onHostAGame(), 100 * (i + 1))
        }
    }
    
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
          :GameComponent="game.component"
          :connectedPeers="connectedPeers"
          :playerInfos="playerInfos"
          :isInitiator="isInitiator"
          :ledger="snapshot?.context?.ledger || []"
          :onBackToLobby="onBackToDiscovery"
        />
        
        <ActivePhase
          v-else-if="isGameStarted"
          :GameComponent="game.component"
          :connectedPeers="connectedPeers"
          :playerInfos="playerInfos"
          :isInitiator="isInitiator"
          :ledger="snapshot?.context?.ledger || []"
          :onAddLedger="onAddLedger"
          :onFinishGame="onFinishGame"
        />

        <PreparationPhase
          v-else
          :state="snapshot"
          :isInitiator="isInitiator"
          :signalingMode="signalingMode"
          :isServerConnecting="isServerConnecting"
          :signalingClient="signalingClient"
          :pendingSignaling="pendingSignaling"
          :onStartGame="startGame"
          :onHostAGame="onHostAGame"
          :onUpdateOffer="updateOffer"
          :onUpdateAnswer="updateAnswer"
          :onCloseSession="onBackToGames"
          :onBackToLobby="onBackToDiscovery"
          :onAcceptGuest="onAcceptGuest"
          :onRejectGuest="onRejectGuest"
          :onCancelSignaling="onCancelSignaling"
          :onRemovePlayer="(id) => send({ type: 'REMOVE_PLAYER', playerId: id })"
          :playerCount="playerInfos.length"
          :maxPlayers="snapshot?.context?.maxPlayers || 2"
          :boardId="boardId"
        />

        <div class="mt-12 max-w-2xl">
          <PlayerList
            :players="playerInfos"
            :onRemove="isInitiator ? (id) => send({ type: 'REMOVE_PLAYER', playerId: id }) : undefined"
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
