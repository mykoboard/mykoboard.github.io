<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { v4 as uuidv4 } from 'uuid'
import Header from '../components/HeaderView.vue'
import ReactComponentWrapper from '../components/ReactComponentWrapper.vue'
import { getGameById } from '../lib/GameRegistry'
import { db } from '../lib/db'

const route = useRoute()
const router = useRouter()
const gameId = computed(() => route.params.gameId as string)
const game = computed(() => getGameById(gameId.value || ""))

const goBack = () => {
    router.push('/games')
}

const goToBoard = async () => {
    if (!game.value) return;
    const boardId = uuidv4()
    const maxPlayers = game.value.maxPlayers || 2
    
    // Mark this session as hosted by this user
    await db.markAsHosting(boardId, game.value.id, maxPlayers)
    
    router.push(`/games/${game.value.id}/${boardId}?maxPlayers=${maxPlayers}`)
}

const resolvedInfoComponent = shallowRef<any>(null)
watch(() => game.value, async (newGame) => {
    resolvedInfoComponent.value = null
    if (newGame?.infoComponent) {
        if (newGame.framework === 'vue') {
            const module = await (typeof newGame.infoComponent === 'function' ? newGame.infoComponent() : newGame.infoComponent)
            resolvedInfoComponent.value = module.default || module
        } else {
            resolvedInfoComponent.value = newGame.infoComponent
        }
    }
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-7xl mx-auto p-6 space-y-12 shrink-0">
      <Header />
      
      <div v-if="game" class="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        
        <button
          class="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors duration-300 group"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" />
          <span class="font-medium tracking-wide uppercase text-sm">Back to Games</span>
        </button>
        <div class="flex flex-col gap-8">
            <div class="flex flex-row gap-6 md:gap-8 items-start">
                <!-- Left Column: Image -->
                <div class="w-[120px] md:w-[320px] aspect-square rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center relative shadow-inner shrink-0 glass-dark border border-white/10">
                    <img :src="game.image" :alt="game.name" class="w-full h-full object-cover" />
                </div>

                <!-- Right Column: Title and Description -->
                <div class="flex-1 flex flex-col justify-center space-y-2 md:space-y-4 pt-2 md:pt-0">
                    <h1 class="text-2xl md:text-5xl font-black tracking-tight text-white uppercase">
                        <span class="text-gradient">{{ game.name }}</span>
                    </h1>
                    <p class="text-sm md:text-xl text-white/80 font-light max-w-2xl line-clamp-3 md:line-clamp-none">
                        {{ game.description }}
                    </p>
                </div>
            </div>

            <!-- Action Button -->
            <div class="flex items-center justify-start">
                <button
                    class="w-full md:w-auto px-10 py-5 bg-primary text-primary-foreground text-lg rounded-xl hover:bg-emerald-400 transition-all duration-300 font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-1 active:translate-y-0"
                    @click="goToBoard"
                >
                    Create Game Session
                </button>
            </div>

            <div class="flex-grow space-y-6">
                <div v-if="game.infoComponent" class="min-h-[200px]">
                    <template v-if="game.framework === 'vue'">
                        <component :is="resolvedInfoComponent" v-if="resolvedInfoComponent" />
                    </template>
                    <ReactComponentWrapper v-else :component="game.infoComponent" :componentProps="{}" />
                </div>
            </div>
        </div>

      </div>
      
      <div v-else class="p-10 text-center text-white/50 uppercase font-black tracking-widest">
        Game not found.
      </div>
    </div>
  </div>
</template>
