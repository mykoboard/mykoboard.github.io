<script setup lang="ts">
const steps = [
  {
    step: "01",
    title: "Vault Initialization",
    description: "Generate your secure, hardware-isolated encryption keys. Your identity lives only on your node."
  },
  {
    step: "02",
    title: "Mesh Discovery",
    description: "Broadcast your presence and discover other active nodes through our encrypted P2P discovery layer."
  },
  {
    step: "03",
    title: "Session Launch",
    description: "Instantiate a board game environment and sync states in real-time with zero latency overhead."
  }
]
</script>

<template>
  <section id="how-it-works" class="section bg-background py-20">
    <div class="container mx-auto px-4">
      <div class="text-center mb-20">
        <h2 class="text-4xl md:text-5xl font-black mb-6 tracking-tight">
          The <span class="text-gradient">Protocol</span> Workflow
        </h2>
        <p class="text-muted-foreground max-w-2xl mx-auto text-lg font-light">
          Initialize your terminal and connect to the global gaming grid in three simple phases.
        </p>
      </div>

      <div class="relative">
        <!-- Vertical Timeline Path -->
        <div class="absolute left-1/2 -translate-x-1/2 h-full w-px bg-gradient-to-b from-primary/50 via-primary/10 to-transparent hidden md:block" />

        <div
          v-for="(item, index) in steps"
          :key="index"
          class="relative grid md:grid-cols-2 gap-12 mb-20 last:mb-0"
          :style="{ animationDelay: `${index * 200}ms` }"
        >
          <!-- Timeline Indicator Dot -->
          <div class="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(16,185,129,0.5)] hidden md:block z-20" />

          <div :class="['flex flex-col', index % 2 === 1 ? 'md:col-start-2 md:items-start' : 'md:items-end md:text-right']">
            <div class="glass-dark p-10 rounded-3xl animate-fade-in border border-white/5 hover:border-primary/20 transition-all duration-500 w-full md:max-w-md">
              <div class="text-primary font-black text-3xl mb-4 opacity-50 font-mono tracking-tighter">PHASE_{{ item.step }}</div>
              <h3 class="text-2xl font-bold mb-4 text-white uppercase tracking-wide">{{ item.title }}</h3>
              <p class="text-muted-foreground leading-relaxed font-light">{{ item.description }}</p>
            </div>
          </div>
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
