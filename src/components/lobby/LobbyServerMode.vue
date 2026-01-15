<script setup lang="ts">
import { ref } from 'vue'
import { Globe, Search } from 'lucide-vue-next'
import type { SignalingService } from '../../lib/signaling'
import PlayerCountSelector from './PlayerCountSelector.vue'

const props = withDefaults(defineProps<{
  isServerConnecting: boolean
  availableOffers: any[]
  signalingClient: any
  onHostAGame: (playerCount?: number) => void
  onJoinFromList: (session: any, slot: any) => void
  minPlayers?: number
  maxPlayers?: number
}>(), {
  minPlayers: 2,
  maxPlayers: 4
})

const playerCount = ref(props.maxPlayers)
</script>

<template>
  <div class="space-y-6 animate-fade-in-up w-full">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-3">
        <Globe class="w-5 h-5 text-blue-400" />
        Discovery Mesh: Active Rooms
      </h3>
      <div class="flex items-center gap-6">
        <PlayerCountSelector
          :value="playerCount"
          :onChange="(val) => playerCount = val"
          :min="minPlayers"
          :max="maxPlayers"
        />
        <div class="flex gap-3">
          <button 
            @click="signalingClient?.requestOffers()" 
            class="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl transition-all"
          >
            Rescan Network
          </button>
          <button
            @click="onHostAGame(playerCount)"
            class="h-10 px-4 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] rounded-xl transition-all"
          >
            Initialize Host
          </button>
        </div>
      </div>
    </div>

    <div v-if="isServerConnecting" class="text-center py-12 space-y-4 glass-dark rounded-[2rem] border border-white/5">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
      <p class="text-[10px] text-primary font-black uppercase tracking-[0.2em] animate-pulse">Synchronizing with global mesh...</p>
    </div>

    <div v-else-if="availableOffers.length === 0" class="p-20 text-center border border-white/5 bg-white/5 rounded-[3rem] backdrop-blur-sm">
      <div class="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 group-hover:scale-110 transition-transform">
        <Search class="w-10 h-10 text-white/20" />
      </div>
      <p class="text-xs text-white/30 uppercase font-black tracking-[0.2em]">Null Results: No active nodes found</p>
      <button @click="onHostAGame(playerCount)" class="mt-4 text-primary font-black uppercase tracking-widest text-[10px] hover:text-primary/70 transition-colors">
        Broadcasting first signal...
      </button>
    </div>

    <div v-else class="grid gap-6">
      <div
        v-for="session in availableOffers"
        :key="session.boardId"
        class="glass-dark p-8 flex items-center justify-between border border-white/5 rounded-[2.5rem] shadow-glass-dark hover:border-primary/20 transition-all duration-500 group"
      >
        <div class="flex items-center gap-6">
          <div class="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center font-black text-primary text-2xl border border-white/10 shadow-neon-sm">
            {{ session.peerName?.[0] || "?" }}
          </div>
          <div class="space-y-1">
            <p class="font-black text-white text-xl uppercase tracking-tight">{{ session.peerName }}'s Instance</p>
            <div class="flex items-center gap-2">
              <span class="flex h-2 w-2 rounded-full bg-primary shadow-neon animate-pulse"></span>
              <p class="text-[10px] text-white/30 font-black uppercase tracking-widest">
                {{ session.slots?.filter(s => s.status === 'open').length }} Vectors Available
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 bg-white/5 p-3 rounded-[2rem] border border-white/10">
          <div
            v-for="slot in session.slots"
            :key="slot.connectionId"
            @click="slot.status === 'open' && onJoinFromList(session, slot)"
            :class="[
              'h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-500',
              slot.status === 'open'
                ? 'border-primary/20 border-dashed cursor-pointer hover:border-primary hover:bg-primary/10 hover:shadow-neon-sm bg-primary/5'
                : 'border-white/5 bg-white/5 cursor-not-allowed opacity-30'
            ]"
            :title="slot.status === 'open' ? 'Join Game' : `Occupied by ${slot.peerName || 'Entity'}`"
          >
            <span v-if="slot.status === 'open'" class="text-[9px] font-black text-primary uppercase tracking-tighter">JOIN</span>
            <div v-else class="h-6 w-6 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-black text-white/50 uppercase overflow-hidden border border-white/10">
              {{ slot.peerName?.[0] || 'P' }}
            </div>
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
