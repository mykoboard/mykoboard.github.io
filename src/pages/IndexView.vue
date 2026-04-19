<script setup lang="ts">
import { onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Hero from '../components/HeroView.vue'
import Features from '../components/FeaturesView.vue'
import HowItWorks from '../components/HowItWorksView.vue'
import * as Keys from '../application/InjectionKeys'

const router = useRouter()
const route = useRoute()
const identityRepo = inject(Keys.IdentityRepoKey)!

onMounted(async () => {
    const id = await identityRepo.getIdentity()
    if (id) {
        const redirect = route.query.redirect as string
        router.replace(redirect || '/games')
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
