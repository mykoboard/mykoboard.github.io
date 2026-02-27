<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { UserPlus, UserMinus } from 'lucide-vue-next'
import type { PlayerInfo } from '@mykoboard/integration'

const props = defineProps<{
  players: PlayerInfo[]
  onRemove?: (id: string) => void
  onSaveIdentity?: (player: PlayerInfo) => Promise<void>
  isKnownIdentity?: (publicKey: string) => Promise<boolean>
}>()

const knownIdentityStatus = ref<Record<string, boolean>>({})
const saveIdentityFlags = ref<Record<string, boolean>>({})

// Check if players are known identities
const checkKnownIdentities = async () => {
  for (const player of props.players) {
    if (player.publicKey && !player.isLocal && props.isKnownIdentity) {
      knownIdentityStatus.value[player.id] = await props.isKnownIdentity(player.publicKey)
    }
  }
}

const handleToggleSave = async (player: PlayerInfo) => {
  const currentState = saveIdentityFlags.value[player.id]
  const newState = !currentState
  
  console.log('[Players] Toggle save for:', player.name, 'from', currentState, 'to', newState)
  
  // If toggling ON, save the identity immediately
  if (newState) {
    await handleSaveIdentity(player)
  } else {
    // If toggling OFF, just update the flag
    saveIdentityFlags.value[player.id] = false
  }
}

const handleSaveIdentity = async (player: PlayerInfo) => {
  console.log('[Players] Attempting to save identity for:', player.name, 'publicKey:', player.publicKey, 'isLocal:', player.isLocal)
  
  if (!player.publicKey) {
    console.warn('[Players] Cannot save identity - no public key for:', player.name)
    return
  }
  
  if (!props.onSaveIdentity) {
    console.warn('[Players] Cannot save identity - onSaveIdentity prop not provided')
    return
  }
  
  try {
    // Set flag to ON while saving
    saveIdentityFlags.value[player.id] = true
    
    await props.onSaveIdentity(player)
    
    // After successful save, mark as known identity
    knownIdentityStatus.value[player.id] = true
    console.log('[Players] Successfully saved identity for:', player.name)
  } catch (error) {
    console.error('[Players] Error saving identity:', error)
    // On error, reset the flag
    saveIdentityFlags.value[player.id] = false
  }
}

onMounted(() => {
  checkKnownIdentities()
})

watch(() => props.players, () => {
  checkKnownIdentities()
}, { deep: true })
</script>

<template>
  <div class="glass-dark p-8 rounded-[2rem] border border-white/5 shadow-glass-dark">
    <h3 class="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-3">
      <UserPlus class="w-5 h-5 text-primary" />
      Dwellers In Lobby ({{ players.length }})
    </h3>
    <div class="space-y-4">
      <div 
        v-for="player in players" 
        :key="player.id" 
        class="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:neon-border transition-all duration-500 animate-fade-in-left"
      >
        <div class="relative">
          <div :class="['h-3 w-3 rounded-full', player.isConnected ? 'bg-primary shadow-neon' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]']" />
          <div v-if="player.isConnected" class="absolute inset-0 h-3 w-3 bg-primary rounded-full animate-ping opacity-50" />
        </div>
        <div class="flex flex-col flex-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-black text-white uppercase tracking-tight">
              {{ player.name }} 
              <span v-if="player.isLocal" class="text-primary font-black ml-1">(LOCAL)</span>
            </span>
            <!-- Known Identity Badge -->
            <span v-if="!player.isLocal && knownIdentityStatus[player.id]" 
                  class="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-wider">
              Known Identity
            </span>
          </div>
          
          <div v-if="!player.isLocal && player.isConnected && !knownIdentityStatus[player.id]" 
               class="flex items-center gap-2 mt-2">
            <button
              @click="handleToggleSave(player)"
              :class="[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200',
                saveIdentityFlags[player.id] ? 'bg-primary' : 'bg-white/10'
              ]"
              role="switch"
              :aria-checked="saveIdentityFlags[player.id]"
            >
              <span
                :class="[
                  'inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200',
                  saveIdentityFlags[player.id] ? 'translate-x-5' : 'translate-x-1'
                ]"
              />
            </button>
            <span class="text-[9px] text-white/40 uppercase tracking-wider font-medium">
              {{ saveIdentityFlags[player.id] ? 'Saved for auto-approve' : 'Auto-approve next time' }}
            </span>
          </div>
        </div>
        
        <div v-if="!player.isConnected" class="ml-auto flex items-center gap-3">
          <span class="text-[9px] text-rose-500 font-black uppercase tracking-widest">Node Disconnected</span>
          <button
            v-if="onRemove && !player.isLocal"
            class="h-8 w-8 flex items-center justify-center text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/30 rounded-xl"
            @click="onRemove(player.id)"
            title="Sever entry"
          >
            <UserMinus class="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <p v-if="players.length === 0" class="text-[10px] text-white/20 uppercase font-black tracking-[0.3em] text-center py-6 animate-pulse">
        Scanning for incoming nodes...
      </p>
    </div>
  </div>
</template>

