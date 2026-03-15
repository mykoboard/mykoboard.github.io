<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AlertTriangle, Link } from 'lucide-vue-next'
import { 
  AlertDialogRoot, 
  AlertDialogTrigger, 
  AlertDialogPortal, 
  AlertDialogOverlay, 
  AlertDialogContent, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogCancel, 
  AlertDialogAction 
} from 'radix-vue'
import SignalingStep from './SignalingStep.vue'
import type { Connection } from '../../lib/webrtc'

const props = defineProps<{
    state: any;
    isInitiator: boolean;
    pendingSignaling: Connection[];
    onStartGame: () => void;
    onUpdateOffer: (connection: Connection, offer: string) => void;
    onUpdateAnswer: (connection: Connection, answer: string) => void;
    onCloseSession: () => void;
    onBackToLobby: () => void;
    onCancelSignaling: (connection: Connection) => void;
    onAddManualConnection?: () => void;
    playerCount: number;
    maxPlayers: number;
    gameId?: string;
    boardId?: string;
}>()

const route = useRoute()

const isPreparation = computed(() => props.state?.matches('preparation') || false)
const isHosting = computed(() => props.state?.matches('hosting') || false)
const isJoining = computed(() => props.state?.matches('joining') || !props.isInitiator)
const hasQueryOffer = computed(() => !!route.query.offer)
const isManualGuestWithoutOffer = computed(() => !props.isInitiator && !hasQueryOffer.value)
const isProcessingOffer = computed(() => {
    return !props.isInitiator && hasQueryOffer.value && props.pendingSignaling.length > 0 && props.pendingSignaling[0].status === 'readyToAccept';
})

const offerUrlBase = computed(() => {
    return `${window.location.origin}${window.location.pathname}#/games/${props.gameId || 'x'}/${props.boardId || 'y'}`
})
</script>

<template>
  <div class="space-y-8">
    <!-- Session Connection States -->
    <div v-if="isHosting || isJoining || isPreparation" class="glass-dark p-10 text-center space-y-8 border border-white/5 shadow-glass-dark rounded-[3rem] animate-zoom-in">
      <div class="space-y-4">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-neon transform -translate-y-2">
          {{ isHosting ? "Broadcasting Session" : isJoining ? "Bridging Node" : "Mesh Linked" }}
        </div>
        <h2 class="text-4xl font-black text-white uppercase tracking-tighter">
          {{ isPreparation ? "Game Protocol Active" : isHosting ? "Offline Signaling" : "Manual Join" }}
        </h2>
        <p class="text-xs text-white/30 uppercase font-black tracking-widest leading-relaxed max-w-lg mx-auto">
          <template v-if="isPreparation">
            {{ isInitiator ? `Launch protocol when ready (${playerCount}/${maxPlayers}).` : "Waiting for initiator to launch protocol." }}
          </template>
          <template v-else>Exchanging direct P2P connection vectors manually.</template>
        </p>
      </div>

      <div v-if="isInitiator" class="flex flex-col items-center gap-6">
        <button
          v-if="isPreparation"
          @click="onStartGame"
          class="w-full max-w-sm h-16 text-sm font-black uppercase tracking-[0.5em] rounded-2xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98]"
        >
          Launch Protocol
        </button>

        <AlertDialogRoot>
          <AlertDialogTrigger asChild>
            <button class="px-4 h-12 rounded-xl text-white/20 hover:text-rose-500 font-black uppercase tracking-widest text-[10px] transition-colors">
              Terminate Session
            </button>
          </AlertDialogTrigger>
          <AlertDialogPortal>
            <AlertDialogOverlay class="bg-black/80 fixed inset-0 z-[100] backdrop-blur-sm" />
            <AlertDialogContent class="glass-dark border border-white/10 rounded-[2rem] p-8 max-w-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]">
              <div class="space-y-4">
                <div class="mx-auto h-16 w-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle class="w-8 h-8 text-rose-500" />
                </div>
                <AlertDialogTitle class="text-xl font-black text-center text-white uppercase tracking-tight">
                  Terminate Session?
                </AlertDialogTitle>
                <AlertDialogDescription class="text-center text-white/40 text-xs font-medium uppercase tracking-widest leading-relaxed">
                  Reloading or leaving will cause the game session to be lost. Peers will be disconnected and discovery mesh link terminated.
                </AlertDialogDescription>
              </div>
              <div class="grid grid-cols-2 gap-4 pt-6">
                <AlertDialogCancel class="h-12 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:bg-white/10 font-bold uppercase tracking-widest text-[10px]">
                  Abort
                </AlertDialogCancel>
                <AlertDialogAction
                  @click="onCloseSession"
                  class="h-12 rounded-xl bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 shadow-neon-sm"
                >
                  Confirm
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialogRoot>

        <!-- Manual Signaling Generation (Host only in this view) -->
        <div class="pt-8 border-t border-white/5 space-y-6 w-full max-w-2xl">
          <div class="glass-dark p-8 rounded-[2rem] border border-white/10 shadow-glass-dark space-y-6 group hover:border-primary/30 transition-all duration-500">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                  <Link class="w-5 h-5 text-primary" />
                </div>
                <div class="text-left">
                  <h3 class="text-sm font-black text-white uppercase tracking-wider">Manual Mesh Link</h3>
                  <p class="text-[10px] text-white/30 uppercase tracking-widest font-medium">Generate an offline/manual WebRTC vector</p>
                </div>
              </div>
              <button
                v-if="onAddManualConnection"
                @click="onAddManualConnection"
                class="px-4 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
              >
                Generate Link
              </button>
            </div>
            
            <div v-if="pendingSignaling.length > 0" class="space-y-4 pt-4 border-t border-white/5">
              <h3 class="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] px-1">Active Vectors</h3>
              <div class="grid grid-cols-1 gap-6 text-left">
                <SignalingStep
                  v-for="conn in pendingSignaling"
                  :key="conn.id"
                  :connection="conn"
                  :offerUrlBase="offerUrlBase"
                  :onOfferChange="onUpdateOffer"
                  :onAnswerChange="onUpdateAnswer"
                  :onCancel="onCancelSignaling"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="space-y-8">
        <div v-if="pendingSignaling.length > 0" class="text-left w-full max-w-2xl mx-auto animate-fade-in space-y-4">
          <!-- Processing Automated Offer -->
          <div v-if="isProcessingOffer" class="glass-dark p-10 rounded-[2rem] border border-primary/20 bg-primary/5 flex flex-col items-center gap-6 animate-pulse">
             <div class="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center">
               <div class="h-4 w-4 bg-primary rounded-full animate-ping"></div>
             </div>
             <div class="space-y-2 text-center">
               <h3 class="text-sm font-black text-primary uppercase tracking-widest">Processing Node Vector</h3>
               <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium font-mono">Synthesizing handshake payload...</p>
             </div>
          </div>

          <!-- Missing Offer Warning -->
          <div v-else-if="isManualGuestWithoutOffer && pendingSignaling[0].status === 'readyToAccept'" class="glass-dark p-8 rounded-[2rem] border border-rose-500/20 bg-rose-500/5 space-y-4 animate-zoom-in">
             <div class="flex items-center gap-3 text-rose-500">
               <AlertTriangle class="w-6 h-6" />
               <h3 class="text-sm font-black uppercase tracking-wider">Invalid Join Vector</h3>
             </div>
             <p class="text-[11px] text-white/50 uppercase tracking-widest leading-relaxed font-medium">
               The manual connection payload is missing from the URL. Please ensure you are using the full link provided by the host.
             </p>
          </div>

          <SignalingStep
            v-else
            :connection="pendingSignaling[0]"
            :offerUrlBase="offerUrlBase"
            :onOfferChange="onUpdateOffer"
            :onAnswerChange="onUpdateAnswer"
            :onCancel="onCancelSignaling"
          />
        </div>

        <div class="flex flex-col items-center gap-8 py-6">
          <div v-if="!isPreparation" class="relative">
            <div class="animate-spin rounded-full h-20 w-20 border-4 border-primary/5 border-t-primary shadow-neon"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="h-3 w-3 bg-primary rounded-full animate-pulse shadow-neon"></div>
            </div>
          </div>
          <div class="space-y-3">
            <h3 class="text-xl font-black text-white uppercase tracking-tight text-center">
              {{ isPreparation ? "Node Synced" : "Bridging Connections" }}
            </h3>
            <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] max-w-xs mx-auto font-medium leading-relaxed text-center">
              {{ isPreparation ? "Awaiting host to launch." : "Fill the vector payload below to establish mesh link." }}
            </p>
          </div>
          
          <AlertDialogRoot>
            <AlertDialogTrigger asChild>
              <button class="h-10 text-white/20 hover:text-rose-500 font-black uppercase tracking-widest text-[10px] transition-colors">
                Sever Connection
              </button>
            </AlertDialogTrigger>
            <AlertDialogPortal>
              <AlertDialogOverlay class="bg-black/80 fixed inset-0 z-[100] backdrop-blur-sm" />
              <AlertDialogContent class="glass-dark border border-white/10 rounded-[2rem] p-8 max-w-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]">
                <div class="space-y-4">
                  <div class="mx-auto h-16 w-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                    <AlertTriangle class="w-8 h-8 text-rose-500" />
                  </div>
                  <AlertDialogTitle class="text-xl font-black text-center text-white uppercase tracking-tight">
                    Sever Connection?
                  </AlertDialogTitle>
                  <AlertDialogDescription class="text-center text-white/40 text-xs font-medium uppercase tracking-widest leading-relaxed">
                    Leaving or reloading will sever your node link. The game session progress will be lost.
                  </AlertDialogDescription>
                </div>
                <div class="grid grid-cols-2 gap-4 pt-6">
                  <AlertDialogCancel class="h-12 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:bg-white/10 font-bold uppercase tracking-widest text-[10px]">
                    Abort
                  </AlertDialogCancel>
                  <AlertDialogAction
                    @click="onBackToLobby"
                    class="h-12 rounded-xl bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 shadow-neon-sm"
                  >
                    Confirm
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialogPortal>
          </AlertDialogRoot>
        </div>
      </div>
    </div>

    <div v-if="!isHosting && !isJoining && !isPreparation" class="py-24 flex flex-col items-center justify-center space-y-6 border border-white/5 bg-white/5 rounded-[3rem] backdrop-blur-sm animate-fade-in">
      <div class="relative">
        <div class="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center transition-transform hover:scale-110 duration-500">
          <div class="h-4 w-4 bg-white/10 rounded-full animate-ping"></div>
        </div>
      </div>
      <div class="text-center space-y-2">
        <div class="text-xs font-black uppercase tracking-[0.5em] text-white/30">Null Reference: No Active Session</div>
        <p class="text-[10px] text-white/20 uppercase tracking-widest px-10 leading-relaxed font-medium">Session data not found on current node. Return to discovery mesh.</p>
      </div>
      <button
        @click="onBackToLobby"
        class="h-12 px-8 rounded-xl border border-white/10 text-white/70 hover:text-primary hover:border-primary/40 font-black uppercase tracking-widest text-[10px] transition-all"
      >
        Return to Discovery
      </button>
    </div>
  </div>
</template>
