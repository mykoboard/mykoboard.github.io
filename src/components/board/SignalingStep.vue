<script setup lang="ts">
import { ref } from 'vue'
import { UserPlus, LogIn, CheckCircle2, Clipboard } from 'lucide-vue-next'
import { ConnectionStatus, type Connection } from '../../lib/webrtc'
import Input from '../ui/Input.vue'

const props = defineProps<{
  connection: Connection
  onOfferChange: (connection: Connection, value: string) => void
  onAnswerChange: (connection: Connection, value: string) => void
  onCancel?: (connection: Connection) => void
}>()

const copied = ref(false)

const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
}
</script>

<template>
  <div class="space-y-4 animate-fade-in-up">
    <!-- NEW -->
    <div v-if="connection.status === ConnectionStatus.new" class="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark flex items-center justify-center space-x-4">
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
      <p class="text-sm text-white/50 font-bold uppercase tracking-widest">Generating invite signal...</p>
    </div>

    <!-- READY TO ACCEPT -->
    <div v-if="connection.status === ConnectionStatus.readyToAccept" class="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark">
      <h3 class="text-sm font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
        <LogIn class="w-5 h-5 text-primary" />
        Paste Join Offer
      </h3>
      <p class="text-[10px] text-white/30 uppercase tracking-widest mb-4">External node signal required for connection.</p>
      <Input
        placeholder="Paste offer string here..."
        className="h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono text-xs placeholder:text-white/20"
        @update:modelValue="(val) => onOfferChange(connection, val)"
      />
    </div>

    <!-- STARTED -->
    <div v-if="connection.status === ConnectionStatus.started" class="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500">
      <h3 class="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-primary">
        <UserPlus class="w-4 h-4" />
        Active Invite Vector
      </h3>
      <div class="space-y-4">
        <div class="p-4 bg-white/5 rounded-xl border border-white/10 relative group min-h-[64px] flex items-center group-hover:neon-border transition-all duration-500">
          <template v-if="connection.signal">
            <div class="text-[10px] font-mono break-all line-clamp-2 text-white/40 pr-8">
              {{ connection.signal.toString() }}
            </div>
            <button
              class="absolute top-2 right-2 h-8 w-8 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors rounded-lg"
              @click="copyToClipboard(connection.signal.toString())"
            >
              <CheckCircle2 v-if="copied" class="w-4 h-4" />
              <Clipboard v-else class="w-4 h-4" />
            </button>
          </template>
          <div v-else class="text-[10px] text-white/20 italic tracking-wider">Gathering node connection details...</div>
        </div>
        <p class="text-[10px] text-white/30 uppercase font-medium leading-relaxed tracking-wider">
          Transmit this vector to a peer node. Their response will be synthesized automatically.
        </p>
        <Input
          placeholder="Awaiting peer response vector..."
          className="h-10 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono text-[10px] placeholder:text-white/20"
          @update:modelValue="(val) => onAnswerChange(connection, val)"
        />
      </div>
    </div>

    <!-- ANSWERED -->
    <div v-if="connection.status === ConnectionStatus.answered" class="glass-dark p-6 rounded-2xl border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500">
      <h3 class="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-primary">
        <CheckCircle2 class="w-4 h-4" />
        Signal Response Synthesized
      </h3>
      <div class="space-y-3">
        <div class="p-4 bg-white/5 rounded-xl border border-white/10 relative group min-h-[64px] flex items-center group-hover:neon-border transition-all duration-500">
          <template v-if="connection.signal">
            <div class="text-[10px] font-mono break-all line-clamp-2 text-white/40 pr-8">
              {{ connection.signal.toString() }}
            </div>
            <button
              class="absolute top-2 right-2 h-8 w-8 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors rounded-lg"
              @click="copyToClipboard(connection.signal.toString())"
            >
              <CheckCircle2 v-if="copied" class="w-4 h-4" />
              <Clipboard v-else class="w-4 h-4" />
            </button>
          </template>
          <div v-else class="text-[10px] text-white/20 italic tracking-wider">Finalizing response...</div>
        </div>
        <p class="text-[10px] text-primary font-black uppercase tracking-widest">Transmit this payload back to peer to complete handshake.</p>
      </div>
    </div>

    <div v-if="onCancel" class="flex justify-end">
      <button
        @click="onCancel(connection)"
        class="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-rose-500 transition-colors p-2"
      >
        De-initialize Link
      </button>
    </div>
  </div>
</template>

<style scoped>
.glass-dark {
  background: rgba(15, 15, 25, 0.7);
  backdrop-filter: blur(10px);
}

.neon-border:hover {
  border: 1px solid rgba(16, 185, 129, 0.4);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out forwards;
}
</style>
