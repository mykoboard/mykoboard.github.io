<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle2, Trash2, ExternalLink } from 'lucide-vue-next'
import type { GameSession } from '../../lib/db'

const props = defineProps<{
  activeSessions: GameSession[]
  boardId?: string
}>()

const emit = defineEmits<{
  (e: 'deleteSession', id: string): void
  (e: 'resume'): void
}>()

const router = useRouter()

const finishedSessions = computed(() => {
  return props.activeSessions
    .filter(s => s.status === 'finished')
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
})

const navigateToSession = (session: GameSession) => {
  if (session.boardId !== props.boardId) {
    router.push(`/games/${session.gameId}/${session.boardId}`)
  } else {
    emit('resume')
  }
}
</script>

<template>
  <div v-if="finishedSessions.length > 0" class="space-y-4 mb-10 animate-fade-in-down">
    <div class="grid gap-4">
      <div
        v-for="session in finishedSessions"
        :key="session.boardId"
        class="p-5 glass-dark rounded-2xl border border-white/5 hover:border-primary/20 hover:shadow-glass-dark transition-all duration-300 cursor-pointer group flex items-center justify-between"
        @click="navigateToSession(session)"
      >
        <div class="flex items-center gap-5">
          <div class="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-neon">
            <CheckCircle2 class="w-6 h-6 text-primary" />
          </div>
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <p class="font-bold text-lg text-white tracking-tight uppercase">{{ session.gameName }}</p>
              <span class="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/30 uppercase font-black tracking-tighter shadow-neon">Verified</span>
            </div>
            <div class="flex flex-wrap gap-2 mt-1">
              <span 
                v-for="(p, i) in session.participants" 
                :key="i" 
                :class="['text-[9px] px-2 py-0.5 rounded-md border uppercase font-bold tracking-tight', p.isYou ? 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-white/40']"
              >
                {{ p.isYou ? 'Identity Match' : p.name }}{{ p.isHost ? ' 👑' : '' }}
              </span>
            </div>
            <p class="text-[10px] text-white/20 font-mono tracking-widest uppercase">
              Sector: {{ session.boardId.slice(0, 8) }} • {{ new Date(session.lastPlayed).toLocaleTimeString() }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="h-10 w-10 flex items-center justify-center text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all rounded-xl border border-transparent hover:border-rose-500/30"
            @click.stop="emit('deleteSession', session.boardId)"
          >
            <Trash2 class="w-5 h-5" />
          </button>
          <div class="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:neon-border transition-all duration-500">
            <ExternalLink class="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-dark {
  background: rgba(15, 15, 25, 0.7);
  backdrop-filter: blur(10px);
}

.shadow-neon {
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
}

.neon-border:hover {
  border: 1px solid rgba(16, 185, 129, 0.4);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}

@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-down {
  animation: fade-in-down 0.5s ease-out forwards;
}
</style>
