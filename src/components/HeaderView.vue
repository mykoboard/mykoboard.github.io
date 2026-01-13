<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { User } from 'lucide-vue-next'
import { SecureWallet, type PlayerIdentity } from '../lib/wallet'
import { sanitizeAvatarUrl } from '../lib/utils'
import { 
  NavigationMenuRoot, 
  NavigationMenuList, 
  NavigationMenuItem, 
  NavigationMenuLink 
} from 'radix-vue'

const router = useRouter()
const identity = ref<PlayerIdentity | null>(null)

onMounted(async () => {
    const wallet = SecureWallet.getInstance()
    identity.value = await wallet.getIdentity()
})

const goHome = () => router.push('/')
const goGames = () => router.push('/games')
const goProfile = () => router.push('/profile')
</script>

<template>
  <header class="flex justify-between items-center py-6 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50 px-6">
    <div class="flex items-center gap-8">
      <h1
        class="text-2xl font-black tracking-tighter cursor-pointer"
        @click="goHome"
      >
        MYKO<span class="text-primary">BOARD</span>
      </h1>
      
      <NavigationMenuRoot class="hidden md:flex">
        <NavigationMenuList class="flex space-x-2">
          <NavigationMenuItem>
            <button
              class="px-4 py-2 text-sm font-bold uppercase tracking-widest text-white/70 hover:text-primary transition-colors cursor-pointer"
              @click="goGames"
            >
              Arcade
            </button>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenuRoot>
    </div>

    <div
      class="flex items-center space-x-3 glass-dark px-4 py-2 rounded-full cursor-pointer hover:neon-border transition-all duration-300"
      @click="goProfile"
    >
      <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/20">
        <img 
          v-if="sanitizeAvatarUrl(identity?.avatar)" 
          :src="sanitizeAvatarUrl(identity?.avatar)" 
          alt="Avatar" 
          class="w-full h-full object-cover" 
        />
        <User v-else class="w-5 h-5 text-primary" />
      </div>
      <span class="text-sm font-bold text-white/90 tracking-wide uppercase">
        {{ identity?.name || "Guest" }}
      </span>
    </div>
  </header>
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
