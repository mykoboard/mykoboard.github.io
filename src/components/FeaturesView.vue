<script setup lang="ts">
import { Shield, Cpu, Zap } from 'lucide-vue-next'

const features = [
  {
    icon: Shield,
    title: "Secure Protocol",
    description: "Your personal encrypted vault stays on your device, ensuring complete sovereignty over your identity and assets."
  },
  {
    icon: Cpu,
    title: "P2P Architecture",
    description: "Connect directly with other nodes without intermediaries for a truly decentralized and tamper-proof experience."
  },
  {
    icon: Zap,
    title: "Real-time Sync",
    description: "Optimized WebRTC-powered data exchange for ultra-low latency board state synchronization worldwide."
  }
]
</script>

<template>
  <section id="features" class="section bg-background relative py-20">
    <!-- Subtle background glow -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

    <div class="container mx-auto px-4">
      <div class="text-center mb-20">
        <h2 class="text-4xl md:text-5xl font-black mb-6 tracking-tight">
          The <span class="text-gradient">MykoBoard</span> Advantage
        </h2>
        <p class="text-muted-foreground max-w-2xl mx-auto text-lg font-light">
          Engineered for security, privacy, and performance. Peer into the mechanics of the
          most advanced decentralized gaming protocol.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="glass-dark p-10 rounded-3xl animate-fade-in border border-white/5 hover:border-primary/30 transition-all duration-500 group"
          :style="{ animationDelay: `${index * 200}ms` }"
        >
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 bg-primary/10 group-hover:bg-primary/20 transition-colors duration-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]">
            <component :is="feature.icon" class="w-8 h-8 text-primary" />
          </div>
          <h3 class="text-2xl font-bold mb-4 text-white group-hover:text-primary transition-colors duration-300">{{ feature.title }}</h3>
          <p class="text-muted-foreground leading-relaxed font-light">{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </section>
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

@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 1s ease-out forwards;
  opacity: 0;
}
</style>
