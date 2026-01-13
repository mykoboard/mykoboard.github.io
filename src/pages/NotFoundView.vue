<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const goHome = () => router.push('/')
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-background text-foreground">
    <div class="text-center space-y-6">
      <h1 class="text-6xl font-bold text-primary">404</h1>
      <p class="text-xl text-muted-foreground">The requested reality does not exist.</p>
      <button 
        @click="goHome"
        class="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        Return to Source
      </button>
    </div>
  </div>
</template>
