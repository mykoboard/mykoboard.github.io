<script setup lang="ts">
import { computed } from 'vue'
import { UserPlus, Globe, LogIn, CheckCircle2, Clipboard, AlertTriangle } from 'lucide-vue-next'
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
    signalingMode: 'manual' | 'server' | null;
    isServerConnecting: boolean;
    signalingClient: any;
    pendingSignaling: Connection[];
    onStartGame: () => void;
    onHostAGame: () => void;
    onUpdateOffer: (connection: Connection, offer: string) => void;
    onUpdateAnswer: (connection: Connection, answer: string) => void;
    onCloseSession: () => void;
    onBackToLobby: () => void;
    onAcceptGuest: () => void;
    onRejectGuest: () => void;
    onCancelSignaling: (connection: Connection) => void;
    onRemovePlayer: (id: string) => void;
    playerCount: number;
    maxPlayers: number;
    boardId?: string;
}>()

const isRoom = computed(() => props.state.matches('room'))
const isHosting = computed(() => props.state.matches('hosting'))
const isJoining = computed(() => props.state.matches('joining'))
const isApproving = computed(() => props.state.matches('approving'))
</script>

<template>
  <div class="space-y-8">
    <!-- Host Approval Overlay -->
    <div v-if="isApproving && state.context.pendingGuest" class="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0A]/80 backdrop-blur-xl animate-fade-in p-6">
      <div class="glass-dark p-10 w-full max-w-md shadow-2xl border border-white/10 rounded-[2.5rem] space-y-8 animate-zoom-in">
        <div class="flex flex-col items-center text-center space-y-6">
          <div class="h-20 w-20 bg-primary/10 rounded-[1.5rem] flex items-center justify-center border border-primary/20 shadow-neon">
            <UserPlus class="w-10 h-10 text-primary animate-pulse" />
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-black text-white uppercase tracking-tight">Handshake Request</h2>
            <p class="text-white/40 uppercase tracking-widest text-[10px] font-medium leading-relaxed">
              Entity <span class="font-black text-primary px-1">{{ state.context.pendingGuest.name }}</span> attempts to bridge into session.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <button
            @click="onRejectGuest"
            class="h-14 rounded-2xl border border-white/10 text-white/60 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 font-black uppercase tracking-widest text-xs transition-all"
          >
            De-authorize
          </button>
          <button
            @click="onAcceptGuest"
            class="h-14 rounded-2xl bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] font-black uppercase tracking-widest text-xs transition-all"
          >
            Grant Access
          </button>
        </div>
      </div>
    </div>

    <!-- Session Connection States -->
    <div v-if="isHosting || isJoining || isRoom || isApproving" class="glass-dark p-10 text-center space-y-8 border border-white/5 shadow-glass-dark rounded-[3rem] animate-zoom-in">
      <div class="space-y-4">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-neon transform -translate-y-2">
          {{ (isHosting || isApproving) ? "Broadcasting Session" : isJoining ? "Initializing Node" : "Command Lobby Active" }}
        </div>
        <h2 class="text-4xl font-black text-white uppercase tracking-tighter">
          {{ isRoom ? "Game Room" : isHosting ? "Link Establishment" : "Connecting..." }}
        </h2>
        <p class="text-xs text-white/30 uppercase font-black tracking-widest leading-relaxed max-w-lg mx-auto">
          <template v-if="isRoom">
            {{ isInitiator ? `Authorize peer nodes or launch protocol when ready (${playerCount}/${maxPlayers}).` : "Waiting for initiator to launch protocol." }}
          </template>
          <template v-else>Synthesizing direct P2P mesh link to session nodes.</template>
        </p>
      </div>

      <div v-if="isInitiator" class="flex flex-col items-center gap-6">
        <button
          v-if="isRoom"
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
      </div>

      <div v-else class="flex flex-col items-center gap-8 py-6">
        <div v-if="!isRoom" class="relative">
          <div class="animate-spin rounded-full h-20 w-20 border-4 border-primary/5 border-t-primary shadow-neon"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="h-3 w-3 bg-primary rounded-full animate-pulse shadow-neon"></div>
          </div>
        </div>
        <div class="space-y-3">
          <h3 class="text-xl font-black text-white uppercase tracking-tight">
            {{ isRoom ? "Node Synced" : "Bridging Connections" }}
          </h3>
          <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] max-w-xs mx-auto font-medium leading-relaxed">
            {{ isRoom ? "Identity verified. Awaiting initiator's launch command." : "Establishing secure encrypted tunnel to host node." }}
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

      <!-- Signaling UI -->
      <div v-if="isInitiator" class="pt-8 border-t border-white/5 space-y-6">
        <div v-if="signalingMode === 'server'" class="p-8 text-center space-y-4 bg-primary/5 border border-primary/20 rounded-3xl shadow-neon-sm animate-pulse">
          <div class="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20">
            <Globe :class="['w-6 h-6 text-primary', !isServerConnecting ? 'animate-pulse' : '']" />
          </div>
          <div class="space-y-1">
            <h3 class="font-black text-primary text-xs uppercase tracking-widest">Active Discovery Broadcast</h3>
            <p class="text-[10px] text-white/30 uppercase tracking-widest">Lobby is visible on global discovery mesh.</p>
            <p v-if="!signalingClient?.isConnected && !isServerConnecting" class="text-[10px] text-rose-500 mt-2 font-black uppercase tracking-widest">
              Link Lost: Discovery Offline
            </p>
          </div>
        </div>

        <div v-if="signalingMode === 'manual' && pendingSignaling.length > 0" class="space-y-4 text-left">
          <h3 class="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] px-1">Pending Link Authentications</h3>
          <div class="grid grid-cols-1 gap-6">
            <SignalingStep
              v-for="conn in pendingSignaling"
              :key="conn.id"
              :connection="conn"
              @onOfferChange="onUpdateOffer"
              @onAnswerChange="onUpdateAnswer"
              @onCancel="onCancelSignaling"
            />
          </div>
        </div>
      </div>

      <div v-if="!isInitiator && isJoining && signalingMode === 'manual' && pendingSignaling.length > 0" class="pt-8 border-t border-white/5 text-left">
        <SignalingStep
          :connection="pendingSignaling[0]"
          @onOfferChange="onUpdateOffer"
          @onAnswerChange="onUpdateAnswer"
          @onCancel="onCancelSignaling"
        />
      </div>
    </div>

    <div v-if="!isHosting && !isJoining && !isRoom && !isApproving" class="py-24 flex flex-col items-center justify-center space-y-6 border border-white/5 bg-white/5 rounded-[3rem] backdrop-blur-sm animate-fade-in">
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

<style scoped>
.glass-dark {
  background: rgba(15, 15, 25, 0.7);
  backdrop-filter: blur(10px);
}

.shadow-neon {
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
}

.shadow-neon-sm {
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoom-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}

.animate-zoom-in {
  animation: zoom-in 0.5s ease-out forwards;
}
</style>
