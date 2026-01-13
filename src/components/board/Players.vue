<script setup lang="ts">
import { UserPlus, UserMinus } from 'lucide-vue-next'
import type { PlayerInfo } from '@mykoboard/integration'

defineProps<{
  players: PlayerInfo[]
  onRemove?: (id: string) => void
}>()
</script>

<template>
  <div class="glass-dark p-8 rounded-[2rem] border border-white/5 shadow-glass-dark">
    <h3 class="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-3">
      <UserPlus class="w-5 h-5 text-primary" />
      Dwellers In Lobby ({{ players.length }})
    </h3>
    <div class="space-y-4">
      <div 
        v-for="player in players" 
        :key="player.id" 
        class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:neon-border transition-all duration-500 animate-fade-in-left"
      >
        <div class="relative">
          <div :class="['h-3 w-3 rounded-full', player.isConnected ? 'bg-primary shadow-neon' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]']" />
          <div v-if="player.isConnected" class="absolute inset-0 h-3 w-3 bg-primary rounded-full animate-ping opacity-50" />
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-black text-white uppercase tracking-tight">
            {{ player.name }} 
            <span v-if="player.isLocal" class="text-primary font-black ml-1">(LOCAL)</span>
          </span>
          <span class="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">{{ player.status }}</span>
        </div>
        
        <div v-if="!player.isConnected" class="ml-auto flex items-center gap-3">
          <span class="text-[9px] text-rose-500 font-black uppercase tracking-widest">Node Disconnected</span>
          <button
            v-if="onRemove && !player.isLocal"
            class="h-8 w-8 flex items-center justify-center text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/30 rounded-xl"
            @click="onRemove(player.id)"
            title="Sever entry"
          >
            <UserMinus class="w-4 h-4" />
          </button>
        </div>
        
        <div v-if="player.isConnected && player.isLocal" class="ml-auto">
          <span class="text-[9px] text-primary font-black uppercase tracking-widest px-2 py-0.5 border border-primary/20 rounded-md">Authorized</span>
        </div>
      </div>
      
      <p v-if="players.length === 0" class="text-[10px] text-white/20 uppercase font-black tracking-[0.3em] text-center py-6 animate-pulse">
        Scanning for incoming nodes...
      </p>
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

.neon-border:hover {
  border: 1px solid rgba(16, 185, 129, 0.4);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}

@keyframes fade-in-left {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-fade-in-left {
  animation: fade-in-left 0.5s ease-out forwards;
}
</style>
