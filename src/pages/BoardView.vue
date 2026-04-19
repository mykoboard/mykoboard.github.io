<script setup lang="ts">
import { computed, onMounted, onUnmounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getGameById } from '../lib/GameRegistry'
import { useGameSession } from '../composables/useGameSession'
import { toast } from 'vue-sonner'
import PreparationPhaseServer from '../components/board/PreparationPhaseServer.vue'
import PreparationPhaseManual from '../components/board/PreparationPhaseManual.vue'
import ActivePhase from '../components/board/ActivePhase.vue'
import FinishedPhase from '../components/board/FinishedPhase.vue'
import LobbyPlayerList from '../components/board/LobbyPlayerList.vue'
import IdentityRequiredModal from '../components/IdentityRequiredModal.vue'
import type { PlayerInfo } from '@mykoboard/integration'
import * as Keys from '../application/InjectionKeys'
import { PeerConnectionStatus } from '../application/ports/IPeerConnectionPort'

const route = useRoute()
const router = useRouter()
const gameId = computed(() => route.params.gameId as string)
const boardId = computed(() => route.params.boardId as string)

const game = computed(() => getGameById(gameId.value || ""))

const onBackToDiscovery = () => router.push('/games')

// Inject Hexagonal Ports
const sessionRepo = inject(Keys.SessionRepoKey)!
const knownIdentityRepo = inject(Keys.KnownIdentityRepoKey)!
const identityRepo = inject(Keys.IdentityRepoKey)!

const hasIdentity = computed(() => !!identityRepo.identity.value?.publicKey)
const isIdentityLoading = computed(() => identityRepo.isLoading.value)

const {
    snapshot,
    send,
    playerInfos,
    connectedPeers,
    pendingSignaling,
    pendingJoinRequests,
    isInitiator,
    isGameStarted,
    onHostAGame,
    isKnownIdentity,
    onApprovePeer,
    onRejectPeer,
    saveIdentityOnApprove,
    updateOffer,
    updateAnswer,
    startGame,
    onFinishGame,
    onAddLedger,
    onAcceptGuest,
    onRejectGuest,
    onCancelSignaling,
    onBackToGames: rawCloseAndBack,
    signalingClient,
    isServerConnecting,
    onAddManualConnection,
    onCreateGuestManualConnection,
    hostSignalingMode,
    initializeServerSignaling,
    initializeManualSignaling,
    topologyMode,
    setTopologyMode
} = useGameSession()

const handleSavePlayerIdentity = async (player: PlayerInfo) => {
    if (!player.publicKey) return
    
    try {
        await knownIdentityRepo.addKnownIdentity({
            id: `identity-${Date.now()}`,
            name: player.name,
            publicKey: player.publicKey,
            addedAt: Date.now()
        })
        
        toast.success('Identity Saved', {
            description: `${player.name} has been added to your known identities.`
        })
    } catch (err) {
        toast.error('Failed to save identity')
    }
}

const currentTurnPlayerId = computed(() => (snapshot.value as any)?.context?.currentPlayer || (snapshot.value as any)?.context?.turn || null)

const onBackToGames = () => {
    rawCloseAndBack();
    onBackToDiscovery();
}

const topology = computed(() => {
    const edges: { from: string; to: string }[] = []
    const seen = new Set<string>()
    const mode = topologyMode.value
    const host = playerInfos.value.find(p => p.isHost)
    const globalMap = (snapshot.value as any)?.context?.topologyMap as Map<string, string[]> | undefined

    if (globalMap && globalMap.size > 0) {
        globalMap.forEach((targets, source) => {
            targets.forEach(target => {
                const pair = [source, target].sort()
                const key = pair.join(':')
                if (!seen.has(key)) {
                    edges.push({ from: pair[0], to: pair[1] })
                    seen.add(key)
                }
            })
        })
        return edges
    }

    if (mode === 'star') {
        if (!host) return edges
        playerInfos.value.forEach(player => {
            if (player.publicKey !== host.publicKey && player.isConnected) {
                edges.push({ from: host.publicKey, to: player.publicKey })
            }
        })
    } else {
        connectedPeers.value.forEach(conn => {
            if (conn.status === PeerConnectionStatus.connected && conn.remotePublicKey) {
                const localPlayer = playerInfos.value.find(p => p.isLocal)
                if (localPlayer && localPlayer.publicKey) {
                    const pair = [localPlayer.publicKey, conn.remotePublicKey].sort()
                    const key = pair.join(':')
                    if (!seen.has(key)) {
                        edges.push({ from: pair[0], to: pair[1] })
                        seen.add(key)
                    }
                }
            }
        })
    }
    
    return edges
})

const isFinished = computed(() => (snapshot.value as any)?.matches('finished') || false)
const isPreparation = computed(() => !isGameStarted.value && !isFinished.value)

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isPreparation.value) {
        e.preventDefault()
        e.returnValue = ''
    }
}

onMounted(async () => {
    await sessionRepo.cleanupOldHostedSessions()

    // Safety net: if identity somehow isn't present yet, skip machine init.
    // The IdentityRequiredModal will handle collection, and the guard will
    // redirect on navigation — this covers the async loading window.
    if (!hasIdentity.value) return
    
    if (boardId.value && snapshot.value?.matches('idle')) {
        const isHostingSession = await sessionRepo.isHosting(boardId.value)
        
        if (isHostingSession) {
            const maxPlayers = parseInt(route.query.maxPlayers as string) || 2
            send({ type: 'HOST', maxPlayers, boardId: boardId.value })
        } else {
            const isManualMode = route.query.mode === 'manual'
            send({ type: 'JOIN', boardId: boardId.value })
            
            if (isManualMode) {
                const offer = route.query.offer as string | undefined
                onCreateGuestManualConnection(offer);
            }
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
    <!-- Block access while identity is absent (async load window or cleared mid-session) -->
    <IdentityRequiredModal v-if="!isIdentityLoading && !hasIdentity" />

    <div
      v-else-if="game"
      class="w-full p-6 space-y-12"
    >
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
          :ledger="snapshot?.context?.ledger || []"
          :on-back-to-lobby="onBackToDiscovery"
          :framework="game.framework"
        />
        
        <ActivePhase
          v-else-if="isGameStarted"
          :game-component="game.component"
          :connected-peers="connectedPeers"
          :player-infos="playerInfos"
          :is-initiator="isInitiator"
          :ledger="snapshot?.context?.ledger || []"
          :on-add-ledger="onAddLedger"
          :on-finish-game="onFinishGame"
          :framework="game.framework"
        />

        <template v-else>
          <PreparationPhaseManual
            v-if="route.query.mode === 'manual' || hostSignalingMode === 'manual'"
            :state="snapshot"
            :is-initiator="isInitiator"
            :pending-signaling="pendingSignaling"
            :on-start-game="startGame"
            :on-update-offer="updateOffer"
            :on-update-answer="updateAnswer"
            :on-close-session="onBackToGames"
            :on-back-to-lobby="onBackToDiscovery"
            :on-cancel-signaling="onCancelSignaling"
            :on-add-manual-connection="onAddManualConnection"
            :player-count="playerInfos.length"
            :max-players="snapshot?.context?.maxPlayers || 2"
            :board-id="boardId"
            :game-id="gameId"
          />
          <PreparationPhaseServer
            v-else
            :state="snapshot"
            :is-initiator="isInitiator"
            :is-server-connecting="isServerConnecting"
            :signaling-client="signalingClient"
            :pending-signaling="pendingSignaling"
            :pending-join-requests="pendingJoinRequests"
            :is-known-identity="isKnownIdentity"
            :host-signaling-mode="hostSignalingMode"
            :initialize-server-signaling="initializeServerSignaling"
            :initialize-manual-signaling="initializeManualSignaling"
            :on-start-game="startGame"
            :on-host-a-game="onHostAGame"
            :on-update-offer="updateOffer"
            :on-update-answer="updateAnswer"
            :on-close-session="onBackToGames"
            :on-back-to-lobby="onBackToDiscovery"
            :on-accept-guest="onAcceptGuest"
            :on-reject-guest="onRejectGuest"
            :on-approve-peer="onApprovePeer"
            :on-reject-peer="onRejectPeer"
            :on-save-identity="saveIdentityOnApprove"
            :on-cancel-signaling="onCancelSignaling"
            :on-add-manual-connection="onAddManualConnection"
            :on-remove-player="(pk) => send({ type: 'REMOVE_PLAYER', publicKey: pk })"
            :player-count="playerInfos.length"
            :max-players="snapshot?.context?.maxPlayers || 2"
            :board-id="boardId"
            :game-id="gameId"
          />
        </template>

        <div class="mt-12 w-full">
          <LobbyPlayerList 
            :players="playerInfos"
            :connections="topology"
            :topology-mode="topologyMode"
            :is-initiator="isInitiator"
            :on-set-topology-mode="setTopologyMode"
            :current-turn-player-id="currentTurnPlayerId"
            :on-remove="isInitiator ? (pk) => send({ type: 'REMOVE_PLAYER', publicKey: pk }) : undefined"
            :on-save-identity="handleSavePlayerIdentity"
            :is-known-identity="isKnownIdentity"
          />
        </div>
      </div>
    </div>
    <div
      v-else-if="!isIdentityLoading && hasIdentity"
      class="p-10 text-center text-white/50 uppercase font-black tracking-widest"
    >
      Game not found in grid.
    </div>
  </div>
</template>
