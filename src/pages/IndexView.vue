<script setup lang="ts">
import { onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import Hero from '../components/HeroView.vue'
import Features from '../components/FeaturesView.vue'
import HowItWorks from '../components/HowItWorksView.vue'
import * as Keys from '../application/InjectionKeys'

const router = useRouter()

onMounted(async () => {
    const identityRepo = inject(Keys.IdentityRepoKey)!
    const id = await identityRepo.getIdentity()
    if (id) {
        router.replace('/games')
    }
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <Hero />
    <Features />
    <HowItWorks />
  </div>
</template>
