<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

interface Game {
    id: string;
    name: string;
    image: string;
    description: string;
}

const props = defineProps<{
    game: Game;
    favorites: string[];
}>()

const emit = defineEmits<{
    (e: 'toggleFavorite', id: string): void;
}>()

const router = useRouter()
const goToBoard = () => {
    router.push('/games/' + props.game.id)
}
</script>

<template>
  <div class="relative glass-dark p-6 rounded-3xl flex flex-col items-center border border-white/5 hover:border-primary/30 transition-all duration-500 group overflow-hidden h-full">
    <!-- Background Glow -->
    <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10" />

    <div class="w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-white/5 flex items-center justify-center relative shadow-inner shrink-0">
      <img :src="game.image" :alt="game.name" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>

    <div class="flex-grow flex flex-col items-center w-full min-h-[4rem]">
      <h3 class="text-xl font-black text-white mb-6 uppercase tracking-wider text-center line-clamp-2 leading-tight">
        {{ game.name }}
      </h3>
    </div>

    <button
      class="w-full py-4 bg-primary text-primary-foreground rounded-xl hover:bg-emerald-400 transition-all duration-300 font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] mt-auto"
      @click="goToBoard"
    >
      Play Session
    </button>

    <button
      class="absolute top-4 right-4 p-2 rounded-full glass-dark border border-white/10 hover:neon-border transition-all duration-300"
      @click="emit('toggleFavorite', game.id)"
    >
      <Star
        :class="['w-5 h-5 transition-all duration-300', favorites.includes(game.id) ? 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-white/30']"
      />
    </button>
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
</style>
