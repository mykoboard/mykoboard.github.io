<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { UserPlus, LogIn } from 'lucide-vue-next'
import PlayerCountSelector from './PlayerCountSelector.vue'

const props = withDefaults(defineProps<{
  onHostAGame: (playerCount?: number) => void
  connectWithOffer: () => void
  minPlayers?: number
  maxPlayers?: number
}>(), {
  minPlayers: 2,
  maxPlayers: 4
})

const router = useRouter()
const route = useRoute()
const playerCount = ref(props.maxPlayers)
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 animate-fade-in-up w-full">
    <div 
      class="glass-dark p-10 flex flex-col items-center text-center space-y-8 border border-white/5 hover:border-primary/30 shadow-glass-dark hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] transition-all duration-500 rounded-[2.5rem] group cursor-pointer"
      @click="onHostAGame(playerCount)"
    >
      <div class="h-20 w-20 bg-primary/5 rounded-[2rem] flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform shadow-neon-sm">
        <UserPlus class="w-10 h-10 text-primary" />
      </div>
      <div class="space-y-3">
        <h2 class="text-2xl font-black text-white uppercase tracking-tight">Host Instance</h2>
        <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black leading-relaxed max-w-[200px] mb-4">
          Initialize a new node session and broadcast invite vector.
        </p>
        <PlayerCountSelector
          :value="playerCount"
          :onChange="(val) => playerCount = val"
          :min="minPlayers"
          :max="maxPlayers"
        />
      </div>
      <button class="w-full h-14 rounded-2xl bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] font-black uppercase tracking-[0.3em] text-xs transition-all pointer-events-none">
        Generate Session
      </button>
    </div>

    <div 
      class="glass-dark p-10 flex flex-col items-center text-center space-y-8 border border-white/5 hover:border-white/20 shadow-glass-dark transition-all duration-500 rounded-[2.5rem] group cursor-pointer"
      @click="() => {
        connectWithOffer()
        router.push(`/games/${route.params.gameId}/manual`)
      }"
    >
      <div class="h-20 w-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
        <LogIn class="w-10 h-10 text-white/70" />
      </div>
      <div class="space-y-3">
        <h2 class="text-2xl font-black text-white uppercase tracking-tight">Bridge Session</h2>
        <p class="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black leading-relaxed max-w-[200px]">
          Receive external node signal to enter existing match.
        </p>
      </div>
      <button class="w-full h-14 rounded-2xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-xs transition-all pointer-events-none mt-auto">
        Initialize Bridge
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

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.7s ease-out forwards;
}
</style>
