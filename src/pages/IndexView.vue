<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Hero from '../components/HeroView.vue'
import Features from '../components/FeaturesView.vue'
import HowItWorks from '../components/HowItWorksView.vue'
import { SecureWallet } from '../lib/wallet'

const router = useRouter()

onMounted(async () => {
    const wallet = SecureWallet.getInstance()
    const hasId = await wallet.hasIdentity()
    if (hasId) {
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
