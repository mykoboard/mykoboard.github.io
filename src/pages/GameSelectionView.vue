<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Search, Sparkles } from 'lucide-vue-next'
import Input from '../components/ui/Input.vue'
import Header from '../components/HeaderView.vue'
import GameCard from '../components/GameCardView.vue'
import { games as registryGames } from '../lib/GameRegistry'

const search = ref("")
const favorites = ref<string[]>([])

onMounted(() => {
    const storedFavorites = JSON.parse(localStorage.getItem("favorites") || "[]")
    favorites.value = storedFavorites
})

const toggleFavorite = (gameId: string) => {
    if (favorites.value.includes(gameId)) {
        favorites.value = favorites.value.filter((id) => id !== gameId)
    } else {
        favorites.value = [...favorites.value, gameId]
    }
    localStorage.setItem("favorites", JSON.stringify(favorites.value))
}

const filteredGames = computed(() => {
    return registryGames.filter((game) =>
        game.name.toLowerCase().includes(search.value.toLowerCase()) ||
        game.description.toLowerCase().includes(search.value.toLowerCase())
    )
})

const favoriteGames = computed(() => filteredGames.value.filter((game) => favorites.value.includes(game.id)))
const otherGames = computed(() => filteredGames.value.filter((game) => !favorites.value.includes(game.id)))
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-7xl mx-auto p-6 space-y-12">
      <Header />
      
      <div class="relative max-w-2xl mx-auto group">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
        <Input
          placeholder="Search for a game or genre..."
          v-model="search"
          className="pl-12 h-14 bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl focus-visible:ring-primary text-white placeholder:text-muted-foreground shadow-glass-dark neon-border"
        />
      </div>

      <section v-if="favoriteGames.length > 0" class="space-y-6 animate-fade-in-left">
        <div class="flex items-center gap-3">
          <Sparkles class="w-6 h-6 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
          <h2 class="text-3xl font-black tracking-tight text-white uppercase">Your <span class="text-gradient">Favorites</span></h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <GameCard 
            v-for="game in favoriteGames" 
            :key="game.id" 
            :game="game" 
            :favorites="favorites" 
            @toggleFavorite="toggleFavorite" 
          />
        </div>
      </section>

      <section class="space-y-6 animate-fade-in-up">
        <h2 class="text-3xl font-black tracking-tight text-white uppercase">
          <template v-if="search">
            Search results for <span class="text-gradient">"{{ search }}"</span>
          </template>
          <template v-else>
            Discover <span class="text-gradient">Games</span>
          </template>
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <GameCard 
            v-for="game in otherGames" 
            :key="game.id" 
            :game="game" 
            :favorites="favorites" 
            @toggleFavorite="toggleFavorite" 
          />
        </div>
        <div v-if="filteredGames.length === 0" class="text-center py-20 glass-dark rounded-3xl border border-dashed border-white/10 shadow-glass-dark">
          <p class="text-muted-foreground text-xl font-light">No games match your frequency.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.glass-dark {
  background: rgba(15, 15, 25, 0.7);
  backdrop-filter: blur(10px);
}

.text-gradient {
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.neon-border {
  border: 1px solid rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
}

@keyframes fade-in-left {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-left {
  animation: fade-in-left 0.5s ease-out forwards;
}

.animate-fade-in-up {
  animation: fade-in-up 0.7s ease-out forwards;
}
</style>
