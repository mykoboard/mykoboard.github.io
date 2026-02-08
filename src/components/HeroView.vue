<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
const navigateToGames = () => router.push('/games')
const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <section class="min-h-screen flex items-center justify-center section bg-background overflow-hidden relative">
    <!-- Background Decorative Elements -->
    <div class="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
    <div class="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[150px] animate-pulse" style="animation-delay: 2s" />

    <div class="container relative z-10">
      <div class="text-center space-y-10 animate-fade-in">
        <div class="inline-flex items-center glass-dark px-4 py-2 rounded-full mb-4 neon-border">
          <Sparkles class="w-4 h-4 text-primary mr-2" />
          <span class="text-sm font-medium tracking-wide text-white/90 uppercase">Decentralized Gaming Protocol</span>
        </div>

        <h1 class="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1]">
          The Future of <br />
          <span class="text-gradient">Board Gaming</span>
        </h1>

        <p class="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
          Connect with players worldwide through <span class="text-white font-medium">secure peer-to-peer</span> gameplay.
          Your wallet, your rules, your ultimate gaming experience.
        </p>

        <div class="flex flex-col sm:flex-row gap-6 justify-center mt-12">
          <button
            class="px-10 py-5 bg-primary text-primary-foreground rounded-xl hover:bg-emerald-400 transition-all duration-300 font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:-translate-y-1 active:scale-95"
            @click="navigateToGames"
          >
            Initialize Console
          </button>
          <button
            class="px-10 py-5 glass-dark text-white rounded-xl hover:bg-white/10 transition-all duration-300 font-bold text-lg border border-white/10"
            @click="scrollToFeatures"
          >
            Explore Protocol
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
