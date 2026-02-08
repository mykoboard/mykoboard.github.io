<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGameById } from '../lib/GameRegistry'
import { useGameSession } from '../composables/useGameSession'
import { Connection } from '../lib/webrtc'
import { db, type KnownIdentity } from '../lib/db'
import { toast } from 'vue-sonner'
import PreparationPhase from '../components/board/PreparationPhase.vue'
import ActivePhase from '../components/board/ActivePhase.vue'
import FinishedPhase from '../components/board/FinishedPhase.vue'
import Players from '../components/board/Players.vue'
import type { PlayerInfo } from '@mykoboard/integration'

const route = useRoute()
const router = useRouter()
const gameId = computed(() => route.params.gameId as string)
const boardId = computed(() => route.params.boardId as string)

const game = computed(() => getGameById(gameId.value || ""))

const onBackToDiscovery = () => router.push('/games')
const onBackToLobby = () => router.push('/games')

// Always use server mode for signaling
const signalingMode = 'server' as const

const {
    snapshot,
    send,
    playerInfos,
    connectedPeers: baseConnectedPeers,
    pendingSignaling,
    pendingJoinRequests,
    isInitiator,
    isGameStarted,
    onHostAGame,
    isKnownIdentity,
    onApprovePeer,
    onRejectPeer,
    saveIdentityOnApprove,
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
    onBackToGames: rawCloseAndBack,
    signalingClient,
    isServerConnecting
} = useGameSession()

const handleSavePlayerIdentity = async (player: PlayerInfo) => {
    console.log('[BoardView] handleSavePlayerIdentity called for:', player.name, 'publicKey:', player.publicKey)
    
    if (!player.publicKey) {
        console.warn('[BoardView] Cannot save - no public key')
        return
    }
    
    const newIdentity: KnownIdentity = {
        id: `identity-${Date.now()}`,
        name: player.name,
        publicKey: player.publicKey,
        addedAt: Date.now()
    }
    
    console.log('[BoardView] Saving identity to DB:', newIdentity)
    await db.addKnownIdentity(newIdentity)
    
    console.log('[BoardView] Identity saved successfully')
    toast.success('Identity Saved', {
        description: `${player.name} has been added to your known identities.`
    })
}

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

onMounted(async () => {
    // Cleanup old hosted sessions on mount
    await db.cleanupOldHostedSessions()
    
    // Initialize state machine based on route and hosting status
    if (boardId.value && snapshot.value?.matches('idle')) {
        // Check if this user is hosting this boardId
        const isHostingSession = await db.isHosting(boardId.value)
        
        if (isHostingSession) {
            // User is the host
            const maxPlayers = parseInt(route.query.maxPlayers as string) || 2
            console.log('[BOARDVIEW] Initializing HOST state for boardId:', boardId.value, 'maxPlayers:', maxPlayers)
            send({ type: 'HOST', maxPlayers, boardId: boardId.value })
        } else {
            // User is a guest joining via link
            console.log('[BOARDVIEW] Initializing GUEST state for boardId:', boardId.value)
            send({ type: 'JOIN', boardId: boardId.value })
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
          :pendingJoinRequests="pendingJoinRequests"
          :isKnownIdentity="isKnownIdentity"
          :onStartGame="startGame"
          :onHostAGame="onHostAGame"
          :onUpdateOffer="updateOffer"
          :onUpdateAnswer="updateAnswer"
          :onCloseSession="onBackToGames"
          :onBackToLobby="onBackToDiscovery"
          :onAcceptGuest="onAcceptGuest"
          :onRejectGuest="onRejectGuest"
          :onApprovePeer="onApprovePeer"
          :onRejectPeer="onRejectPeer"
          :onSaveIdentity="saveIdentityOnApprove"
          :onCancelSignaling="onCancelSignaling"
          :onRemovePlayer="(id) => send({ type: 'REMOVE_PLAYER', playerId: id })"
          :playerCount="playerInfos.length"
          :maxPlayers="snapshot?.context?.maxPlayers || 2"
          :boardId="boardId"
          :gameId="gameId"
        />

        <div class="mt-12 max-w-2xl">
          <Players 
            :players="playerInfos"
            :onRemove="isInitiator ? (id) => send({ type: 'REMOVE_PLAYER', playerId: id }) : undefined"
            :onSaveIdentity="handleSavePlayerIdentity"
            :isKnownIdentity="isKnownIdentity"
          />
        </div>
      </div>
    </div>
    <div v-else class="p-10 text-center text-white/50 uppercase font-black tracking-widest">
      Game not found in grid.
    </div>
  </div>
</template>

