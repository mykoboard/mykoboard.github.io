<script setup lang="ts">
import { MousePointer2, Globe } from 'lucide-vue-next'

defineProps<{
  onSelectManual: () => void
  onSelectServer: () => void
}>()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 animate-zoom-in w-full">
    <div
      class="glass-dark p-10 flex flex-col items-center text-center space-y-8 border border-white/5 hover:border-primary/30 shadow-glass-dark hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] transition-all duration-500 rounded-[2.5rem] group cursor-pointer relative overflow-hidden h-full"
      @click="onSelectManual"
    >
      <div class="h-24 w-24 bg-primary/5 rounded-[2rem] flex items-center justify-center border border-primary/20 group-hover:bg-primary/10 transition-colors shadow-neon-sm">
        <MousePointer2 class="w-12 h-12 text-primary" />
      </div>
      <div class="space-y-3">
        <h2 class="text-2xl font-black text-white uppercase tracking-tight">Manual Bridge</h2>
        <p class="text-xs text-white/30 uppercase tracking-[0.2em] font-medium leading-relaxed">Encrypted P2P signaling via shared vectors. 100% serverless.</p>
      </div>
      <button class="w-full h-12 mt-auto rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px] transition-all">
        Initialize Private Link
      </button>
    </div>

    <div
      class="glass-dark p-10 flex flex-col items-center text-center space-y-8 border border-white/5 hover:border-blue-400/30 shadow-glass-dark hover:shadow-[0_0_40px_rgba(59,130,246,0.1)] transition-all duration-500 rounded-[2.5rem] group cursor-pointer relative overflow-hidden h-full"
      @click="onSelectServer"
    >
      <div class="absolute top-4 right-6 px-3 py-1 bg-primary text-primary-foreground text-[9px] font-black rounded-full uppercase tracking-[0.2em] shadow-neon">Stable</div>
      <div class="h-24 w-24 bg-blue-500/5 rounded-[2rem] flex items-center justify-center border border-blue-400/20 group-hover:bg-blue-400/10 transition-colors shadow-[0_0_50px_rgba(59,130,246,0.1)]">
        <Globe class="w-12 h-12 text-blue-400" />
      </div>
      <div class="space-y-3">
        <h2 class="text-2xl font-black text-white uppercase tracking-tight">Global Mesh</h2>
        <p class="text-xs text-white/30 uppercase tracking-[0.2em] font-medium leading-relaxed">Seamless node discovery via global signaling network.</p>
      </div>
      <button class="w-full h-12 mt-auto rounded-xl border border-blue-400/20 text-blue-400 hover:text-blue-300 hover:bg-blue-400/5 font-black uppercase tracking-widest text-[10px] transition-all">
        Connect to Mesh
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

@keyframes zoom-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-zoom-in {
  animation: zoom-in 0.5s ease-out forwards;
}
</style>
