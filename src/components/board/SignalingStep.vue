<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UserPlus, LogIn, CheckCircle2, Clipboard, AlertCircle } from 'lucide-vue-next'
import { IPeerConnectionPort, PeerConnectionStatus } from '../../application/ports/IPeerConnectionPort'
import Input from '../ui/Input.vue'

const props = defineProps<{
  connection: IPeerConnectionPort
  offerUrlBase?: string
  onOfferChange: (connection: IPeerConnectionPort, value: string) => void
  onAnswerChange: (connection: IPeerConnectionPort, value: string) => void
  onCancel?: (connection: IPeerConnectionPort) => void
}>()

const copied = ref(false)
const gatheringTimeoutReached = ref(false)

// Start a fallback timer to reveal the signal even if ICE gathering is slow or stuck
const GATHERING_TIMEOUT_MS = 5000
setTimeout(() => {
    gatheringTimeoutReached.value = true
}, GATHERING_TIMEOUT_MS)

const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
}

const displaySignal = computed(() => {
    if (!props.connection.serializedSignal) return ''
    const raw = props.connection.serializedSignal
    if (props.offerUrlBase && props.connection.status === PeerConnectionStatus.started) {
        return `${props.offerUrlBase}?mode=manual&offer=${encodeURIComponent(raw)}`
    }
    return raw
})

const isGathering = computed(() => {
    if (gatheringTimeoutReached.value) return false
    return props.connection.iceGatheringState === 'gathering'
})

// Persistence logic: capture the signal if it exists, even if the connection closes
const persistentSignal = ref('')
const wasEverAnswered = ref(false)

watch(() => props.connection.serializedSignal, (newSignal: string) => {
    if (newSignal) persistentSignal.value = newSignal
}, { immediate: true })

watch(() => props.connection.status, (newStatus: PeerConnectionStatus) => {
    if (newStatus === PeerConnectionStatus.answered) wasEverAnswered.value = true
}, { immediate: true })

</script>

<template>
  <div class="space-y-4 animate-fade-in-up">
    <!-- NEW -->
    <div
      v-if="connection.status === PeerConnectionStatus.new"
      class="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark flex items-center justify-center space-x-4"
    >
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      <p class="text-sm text-white/50 font-bold uppercase tracking-widest">
        {{ connection.isHostConnection ? "Generating invite signal..." : "Synthesizing handshake response..." }}
      </p>
    </div>

    <!-- READY TO ACCEPT -->
    <div
      v-if="connection.status === PeerConnectionStatus.readyToAccept"
      class="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark"
    >
      <h3 class="text-sm font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
        <LogIn class="w-5 h-5 text-primary" />
        Paste Join Offer
      </h3>
      <p class="text-[10px] text-white/30 uppercase tracking-widest mb-4">
        External node signal required for connection.
      </p>
      <Input
        placeholder="Paste offer string here..."
        class-name="h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono text-xs placeholder:text-white/20"
        @update:model-value="(val) => onOfferChange(connection, val)"
      />
    </div>

    <!-- STARTED (Generating Offer) -->
    <div
      v-if="connection.status === PeerConnectionStatus.started"
      class="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500"
    >
      <h3 class="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-primary">
        <UserPlus class="w-4 h-4" />
        Active Invite Vector
      </h3>
      <div class="space-y-4">
        <div 
          class="p-4 bg-white/5 rounded-xl border border-white/10 relative group min-h-[64px] flex items-center transition-all duration-500"
          :class="{ 'neon-border': !isGathering, 'animate-pulse bg-primary/5 border-primary/20': isGathering }"
        >
          <template v-if="connection.serializedSignal">
            <div class="space-y-3 w-full">
              <div class="flex items-center justify-between">
                <div class="text-[10px] font-mono break-all line-clamp-2 text-white/40 pr-8">
                  {{ displaySignal }}
                </div>
                <button
                  class="absolute top-2 right-2 h-8 w-8 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors rounded-lg"
                  @click="copyToClipboard(displaySignal)"
                >
                  <CheckCircle2
                    v-if="copied"
                    class="w-4 h-4"
                  />
                  <Clipboard
                    v-else
                    class="w-4 h-4"
                  />
                </button>
              </div>
              
              <div
                v-if="isGathering"
                class="flex items-center gap-2 text-[10px] font-mono text-primary/60 uppercase tracking-widest animate-pulse border-t border-white/5 pt-2 mt-2"
              >
                <div class="h-1 w-1 bg-primary rounded-full animate-ping" />
                Gathering Node Candidates...
              </div>
            </div>
          </template>
          <div
            v-else-if="isGathering"
            class="flex items-center gap-2 text-[10px] font-mono text-primary/60 uppercase tracking-widest animate-pulse"
          >
            <div class="h-1.5 w-1.5 bg-primary rounded-full animate-ping" />
            Opening Node Port...
          </div>
          <div
            v-else
            class="text-[10px] text-white/20 italic tracking-wider"
          >
            Initializing invite vector...
          </div>
        </div>
        <p class="text-[10px] text-white/30 uppercase font-medium leading-relaxed tracking-wider">
          Transmit this vector to a peer node. Their response will be synthesized automatically.
        </p>
        <Input
          placeholder="Awaiting peer response vector..."
          class-name="h-10 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono text-[10px] placeholder:text-white/20"
          @update:model-value="(val) => onAnswerChange(connection, val)"
        />
      </div>
    </div>

    <!-- ANSWERED or CLOSED with a captured signal -->
    <div
      v-if="connection.status === PeerConnectionStatus.answered || (connection.status === PeerConnectionStatus.closed && wasEverAnswered && persistentSignal)"
      class="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500"
    >
      <h3 class="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-primary">
        <CheckCircle2 class="w-4 h-4" />
        {{ connection.status === PeerConnectionStatus.closed ? 'Signal Vector Captured' : 'Signal Response Synthesized' }}
      </h3>
      <div class="space-y-3">
        <div 
          class="p-4 bg-white/5 rounded-xl border border-white/10 relative group min-h-[64px] flex items-center transition-all duration-500"
          :class="{ 'neon-border': !isGathering && persistentSignal, 'animate-pulse bg-primary/5 border-primary/20': isGathering || !persistentSignal }"
        >
          <template v-if="persistentSignal">
            <div class="space-y-3 w-full">
              <div class="flex items-center justify-between">
                <div class="text-[10px] font-mono break-all line-clamp-2 text-white/40 pr-8">
                  {{ persistentSignal }}
                </div>
                <button
                  class="absolute top-2 right-2 h-8 w-8 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors rounded-lg"
                  @click="copyToClipboard(persistentSignal)"
                >
                  <CheckCircle2
                    v-if="copied"
                    class="w-4 h-4"
                  />
                  <Clipboard
                    v-else
                    class="w-4 h-4"
                  />
                </button>
              </div>

              <div
                v-if="isGathering"
                class="flex items-center gap-2 text-[10px] font-mono text-primary/60 uppercase tracking-widest animate-pulse border-t border-white/5 pt-2 mt-2"
              >
                <div class="h-1 w-1 bg-primary rounded-full animate-ping" />
                Gathering Node Candidates...
              </div>
            </div>
          </template>
          <div
            v-else
            class="flex items-center gap-2 text-[10px] font-mono text-primary/60 uppercase tracking-widest animate-pulse"
          >
            <div class="h-1.5 w-1.5 bg-primary rounded-full animate-ping" />
            Synthesizing response...
          </div>
        </div>
        <p class="text-[10px] text-primary font-black uppercase tracking-widest">
          {{ connection.status === PeerConnectionStatus.closed ? 'Copy this payload to bridge the link.' : 'Transmit this payload back to peer to complete handshake.' }}
        </p>
        <div
          v-if="connection.status === PeerConnectionStatus.closed"
          class="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg"
        >
          <AlertCircle class="w-3 h-3 text-amber-500" />
          <span class="text-[9px] text-amber-500 uppercase font-black tracking-widest">Handshake timeout - payload still valid</span>
        </div>
      </div>
    </div>

    <div
      v-if="onCancel"
      class="flex justify-end"
    >
      <button
        class="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-rose-500 transition-colors p-2"
        @click="onCancel(connection)"
      >
        De-initialize Link
      </button>
    </div>
  </div>
</template>
