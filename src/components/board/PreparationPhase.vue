<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UserPlus, AlertTriangle, Link, Copy, Check } from 'lucide-vue-next'
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

interface PendingJoinRequest {
    connectionId: string;
    peerName: string;
    publicKey: string;
    encryptionPublicKey?: string;
    timestamp: number;
}

const props = defineProps<{
    state: any;
    isInitiator: boolean;
    signalingMode: 'manual' | 'server' | null;
    isServerConnecting: boolean;
    signalingClient: any;
    pendingSignaling: Connection[];
    pendingJoinRequests?: PendingJoinRequest[];
    isKnownIdentity?: (publicKey: string) => Promise<boolean>;
    onStartGame: () => void;
    onHostAGame: () => void;
    onUpdateOffer: (connection: Connection, offer: string) => void;
    onUpdateAnswer: (connection: Connection, answer: string) => void;
    onCloseSession: () => void;
    onBackToLobby: () => void;
    onAcceptGuest: () => void;
    onRejectGuest: () => void;
    onApprovePeer?: (request: PendingJoinRequest) => void;
    onRejectPeer?: (request: PendingJoinRequest) => void;
    onSaveIdentity?: (request: PendingJoinRequest) => Promise<void>;
    onCancelSignaling: (connection: Connection) => void;
    onRemovePlayer: (id: string) => void;
    playerCount: number;
    maxPlayers: number;
    boardId?: string;
    gameId?: string;
}>()

const friendStatus = ref<Record<string, boolean>>({})
const saveIdentityFlags = ref<Record<string, boolean>>({})

// Check friend status for each pending request
const checkFriendStatus = async (publicKey: string) => {
    if (props.isKnownIdentity) {
        friendStatus.value[publicKey] = await props.isKnownIdentity(publicKey)
    }
}

// Truncate public key for display
const truncateKey = (key: string) => {
    if (key.length <= 20) return key
    return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`
}

const isCopied = ref(false)

const sessionLink = computed(() => {
    return `${window.location.origin}${window.location.pathname}#/games/${props.gameId}/${props.boardId}`
})

const handleCopyLink = async () => {
    try {
        await navigator.clipboard.writeText(sessionLink.value)
        isCopied.value = true
        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (err) {
        console.error('Failed to copy link:', err)
    }
}

// Watch for new pending join requests and check friend status
watch(() => props.pendingJoinRequests, (requests) => {
    if (requests) {
        requests.forEach(request => {
            if (!(request.publicKey in friendStatus.value)) {
                checkFriendStatus(request.publicKey)
            }
            // Default "Auto-approve next time" to true for new requests
            if (request.connectionId && saveIdentityFlags.value[request.connectionId] === undefined) {
                saveIdentityFlags.value[request.connectionId] = true
            }
        })
    }
}, { deep: true, immediate: true })

// Handle approve with optional save identity
const handleApprove = async (request: PendingJoinRequest) => {
    if (saveIdentityFlags.value[request.connectionId] && props.onSaveIdentity) {
        await props.onSaveIdentity(request)
    }
    if (props.onApprovePeer) {
        props.onApprovePeer(request)
    }
    // Clear the save flag
    delete saveIdentityFlags.value[request.connectionId]
}

const isPreparation = computed(() => props.state.matches('preparation'))
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

    <!-- Pending Join Requests (New Flow) -->
    <div v-if="isInitiator && pendingJoinRequests && pendingJoinRequests.length > 0" class="glass-dark p-8 border border-primary/20 shadow-glass-dark rounded-[2.5rem] animate-zoom-in space-y-6">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <UserPlus class="w-6 h-6 text-primary" />
        </div>
        <div class="space-y-1">
          <h2 class="text-2xl font-black text-white uppercase tracking-tight">Join Requests</h2>
          <p class="text-white/40 uppercase tracking-widest text-[10px] font-medium">
            {{ pendingJoinRequests.length }} {{ pendingJoinRequests.length === 1 ? 'peer' : 'peers' }} waiting for approval
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <div v-for="request in pendingJoinRequests" :key="request.connectionId" class="glass-darker p-6 rounded-2xl border border-white/5 space-y-4">
          <div class="flex items-start justify-between">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-lg font-black text-white">{{ request.peerName }}</span>
                <span v-if="friendStatus[request.publicKey]" class="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                  Known Identity
                </span>
              </div>
              <p class="text-xs text-white/40 font-mono">{{ truncateKey(request.publicKey) }}</p>
            </div>
          </div>

          <!-- Save identity switch for unknown identities - positioned above buttons -->
          <div v-if="!friendStatus[request.publicKey]" class="flex items-center justify-end gap-2 px-1 pb-2">
            <span class="text-xs text-white/50 uppercase tracking-wider font-medium">Auto-approve next time</span>
            <button
              @click="saveIdentityFlags[request.connectionId] = !saveIdentityFlags[request.connectionId]"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900',
                saveIdentityFlags[request.connectionId] ? 'bg-primary' : 'bg-white/10'
              ]"
              role="switch"
              :aria-checked="saveIdentityFlags[request.connectionId]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                  saveIdentityFlags[request.connectionId] ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button
              @click="onRejectPeer && onRejectPeer(request)"
              class="h-12 rounded-xl border border-white/10 text-white/60 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 font-black uppercase tracking-widest text-xs transition-all"
            >
              Reject
            </button>
            <button
              @click="handleApprove(request)"
              class="h-12 rounded-xl bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] font-black uppercase tracking-widest text-xs transition-all"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Connection States -->
    <div v-if="isHosting || isJoining || isPreparation || isApproving" class="glass-dark p-10 text-center space-y-8 border border-white/5 shadow-glass-dark rounded-[3rem] animate-zoom-in">
      <div class="space-y-4">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-neon transform -translate-y-2">
          {{ (isHosting || isApproving) ? "Broadcasting Session" : isJoining ? "Initializing Node" : "Command Lobby Active" }}
        </div>
        <h2 class="text-4xl font-black text-white uppercase tracking-tighter">
          {{ isPreparation ? "Game Room" : isHosting ? "Link Establishment" : "Connecting..." }}
        </h2>
        <p class="text-xs text-white/30 uppercase font-black tracking-widest leading-relaxed max-w-lg mx-auto">
          <template v-if="isPreparation">
            {{ isInitiator ? `Authorize peer nodes or launch protocol when ready (${playerCount}/${maxPlayers}).` : "Waiting for initiator to launch protocol." }}
          </template>
          <template v-else>Synthesizing direct P2P mesh link to session nodes.</template>
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
      </div>

      <div v-else class="flex flex-col items-center gap-8 py-6">
        <div v-if="!isPreparation" class="relative">
          <div class="animate-spin rounded-full h-20 w-20 border-4 border-primary/5 border-t-primary shadow-neon"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="h-3 w-3 bg-primary rounded-full animate-pulse shadow-neon"></div>
          </div>
        </div>
        <div class="space-y-3">
          <h3 class="text-xl font-black text-white uppercase tracking-tight">
            {{ isPreparation ? "Node Synced" : "Bridging Connections" }}
          </h3>
          <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] max-w-xs mx-auto font-medium leading-relaxed">
            {{ isPreparation ? "Identity verified. Awaiting initiator's launch command." : "Establishing secure encrypted tunnel to host node." }}
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

      <!-- Session Shareability & Manual Signaling -->
      <div v-if="isInitiator" class="pt-8 border-t border-white/5 space-y-6">
        <!-- Share Link (Server Mode) -->
        <div v-if="signalingMode === 'server'" class="glass-dark p-8 rounded-[2rem] border border-white/10 shadow-glass-dark space-y-6 group hover:border-primary/30 transition-all duration-500">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                <Link class="w-5 h-5 text-primary" />
              </div>
              <div class="text-left">
                <h3 class="text-sm font-black text-white uppercase tracking-wider">Share Session Link</h3>
                <p class="text-[10px] text-white/30 uppercase tracking-widest font-medium">Link this node to the discovery mesh</p>
              </div>
            </div>
            
            <div class="flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full">
              <div class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-neon" />
              <span class="text-[9px] font-black text-primary uppercase tracking-widest">Live Broadcast</span>
            </div>
          </div>

          <div class="relative flex items-center gap-3">
            <div class="flex-grow bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 font-mono text-[11px] text-white/60 truncate transition-all group-hover:bg-black/60 group-hover:border-white/20">
              {{ sessionLink }}
            </div>
            <button
              @click="handleCopyLink"
              class="shrink-0 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-neon hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all active:scale-95 flex items-center gap-2"
            >
              <transition mode="out-in" name="fade">
                <div v-if="isCopied" key="check" class="flex items-center gap-2 animate-bounce-short">
                  <Check class="w-4 h-4" />
                  COPIED
                </div>
                <div v-else key="copy" class="flex items-center gap-2">
                  <Copy class="w-4 h-4" />
                  COPY LINK
                </div>
              </transition>
            </button>
          </div>
        </div>

        <!-- Manual Signaling -->
        <div v-if="signalingMode === 'manual' && pendingSignaling.length > 0" class="space-y-4 text-left">
          <h3 class="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] px-1">Pending Link Authentications</h3>
          <div class="grid grid-cols-1 gap-6">
            <SignalingStep
              v-for="conn in pendingSignaling"
              :key="conn.id"
              :connection="conn"
              :onOfferChange="onUpdateOffer"
              :onAnswerChange="onUpdateAnswer"
              :onCancel="onCancelSignaling"
            />
          </div>
        </div>
      </div>

      <div v-if="!isInitiator && isJoining && signalingMode === 'manual' && pendingSignaling.length > 0" class="pt-8 border-t border-white/5 text-left">
        <SignalingStep
          :connection="pendingSignaling[0]"
          :onOfferChange="onUpdateOffer"
          :onAnswerChange="onUpdateAnswer"
          :onCancel="onCancelSignaling"
        />
      </div>
    </div>

    <div v-if="!isHosting && !isJoining && !isPreparation && !isApproving" class="py-24 flex flex-col items-center justify-center space-y-6 border border-white/5 bg-white/5 rounded-[3rem] backdrop-blur-sm animate-fade-in">
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

