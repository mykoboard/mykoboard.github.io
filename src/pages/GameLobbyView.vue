<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { getGameById } from '../lib/GameRegistry'
import { useLobby } from '../composables/useLobby'
import { useGameSession } from '../composables/useGameSession'
import Header from '../components/HeaderView.vue'
import LobbyModeSelection from '../components/lobby/LobbyModeSelection.vue'
import LobbyManualMode from '../components/lobby/LobbyManualMode.vue'
import LobbyServerMode from '../components/lobby/LobbyServerMode.vue'

const route = useRoute()
const gameId = computed(() => route.params.gameId as string)
const game = computed(() => getGameById(gameId.value || ""))

const {
    signalingMode,
    setSignalingMode,
    lobbySnapshot,
    lobbySend,
    signalingClient,
    availableOffers,
    activeSessions,
    isServerConnecting,
    onDeleteSession,
    onJoinFromList: rawOnJoinFromList
} = useLobby()

const onJoinFromList = (session: any, slot: any) => rawOnJoinFromList(gameId.value, session, slot)

const {
    onHostAGame,
    connectWithOffer,
} = useGameSession()
</script>

<template>
  <div class="min-h-screen bg-background">
    <div v-if="game" class="max-w-7xl mx-auto p-6 space-y-12">
      <Header />

      <h1 class="text-3xl font-black tracking-tighter uppercase text-white">
        Lobby: <span class="text-gradient">{{ game.name }}</span>
      </h1>

      <div class="animate-fade-in-up">
        <LobbyModeSelection
          v-if="!signalingMode"
          :onSelectManual="() => {
            setSignalingMode('manual')
          }"
          :onSelectServer="() => {
            setSignalingMode('server')
          }"
        />

        <div v-if="signalingMode" class="space-y-8">
          <button
            class="mb-4 text-white/30 hover:text-primary hover:bg-primary/5 transition-all group font-black uppercase tracking-widest text-[10px] flex items-center gap-2 p-2 rounded-lg"
            @click="setSignalingMode(null)"
          >
            <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            De-initialize Mode
          </button>

          <LobbyManualMode
            v-if="signalingMode === 'manual'"
            :onHostAGame="onHostAGame"
            :connectWithOffer="connectWithOffer"
            :minPlayers="game.minPlayers"
            :maxPlayers="game.maxPlayers"
          />

          <LobbyServerMode
            v-if="signalingMode === 'server'"
            :isServerConnecting="isServerConnecting"
            :availableOffers="availableOffers"
            :signalingClient="signalingClient"
            :onHostAGame="onHostAGame"
            :onJoinFromList="onJoinFromList"
            :minPlayers="game.minPlayers"
            :maxPlayers="game.maxPlayers"
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
