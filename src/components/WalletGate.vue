<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  DialogRoot, 
  DialogPortal, 
  DialogOverlay, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
  DialogHeader
} from 'radix-vue'
import { Fingerprint, Sparkles, ShieldCheck, UserCircle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { SecureWallet, type PlayerIdentity } from '../lib/wallet'
import Input from './ui/Input.vue'

const isOpen = ref(false)
const name = ref("")
const subscriptionToken = ref("")
const isCreating = ref(false)
const identity = ref<PlayerIdentity | null>(null)
const isLoaded = ref(false)

onMounted(async () => {
    const wallet = SecureWallet.getInstance()
    const id = await wallet.getIdentity()
    if (id) {
        identity.value = id
    } else {
        isOpen.value = true
    }
    isLoaded.value = true
})

const handleCreateIdentity = async () => {
    if (!name.value.trim() || !subscriptionToken.value.trim()) {
        toast.error("Please enter a name and subscription token")
        return
    }

    isCreating.value = true
    try {
        const wallet = SecureWallet.getInstance()
        const newIdentity = await wallet.createIdentity(name.value, subscriptionToken.value)
        identity.value = newIdentity
        toast.success("Identity Secured!", {
            description: "Your hardware-backed wallet is ready."
        })
        isOpen.value = false
    } catch (error) {
        toast.error("Failed to create identity. Your browser may not support WebAuthn.")
    } finally {
        isCreating.value = false
    }
}
</script>

<template>
  <div v-if="isLoaded">
    <slot v-if="identity"></slot>

    <DialogRoot :open="isOpen" @update:open="(val) => !identity && (isOpen = val)">
      <DialogPortal>
        <DialogOverlay class="bg-black/80 fixed inset-0 z-[100] backdrop-blur-md" />
        <DialogContent class="sm:max-w-md fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] border border-white/10 bg-[#0a0c10] shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden p-8 outline-none">
          <!-- Ambient Glow -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div class="space-y-4 pt-4 text-center">
            <div class="mx-auto h-20 w-20 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-center justify-center relative group">
              <div class="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <ShieldCheck class="w-12 h-12 text-primary relative z-10" />
            </div>
            <DialogTitle class="text-3xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
              SECURE YOUR IDENTITY
            </DialogTitle>
            <DialogDescription class="text-slate-400 font-medium px-4">
              Create a decentralized identity. Your data stays on your device, secured by hardware-backed encryption.
            </DialogDescription>
          </div>

          <div class="space-y-6 pt-6 pb-2">
            <div class="space-y-2.5">
              <div class="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                <UserCircle class="w-4 h-4 text-slate-600" />
                Public Persona
              </div>
              <Input
                placeholder="Enter your display name..."
                v-model="name"
                className="h-14 text-lg rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 transition-all px-6 placeholder:text-slate-600 font-bold"
              />
            </div>

            <div class="space-y-2.5">
              <div class="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                <Sparkles class="w-4 h-4 text-yellow-500/60" />
                Subscription Token
              </div>
              <Input
                placeholder="Paste your token here..."
                v-model="subscriptionToken"
                className="h-14 text-lg rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 transition-all px-6 font-mono placeholder:text-slate-600"
                @keydown.enter="handleCreateIdentity"
              />
            </div>

            <div class="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 space-y-3 relative overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <div class="flex items-start gap-4 relative z-10">
                <div class="p-2 bg-slate-900 rounded-lg border border-white/5">
                  <Fingerprint class="w-5 h-5 text-slate-400" />
                </div>
                <div class="text-[11px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                  We use <span class="text-white">Web Crypto & Passkeys</span> to ensure only you can access your wallet. No seeds to save, no passwords to lose.
                </div>
              </div>
            </div>

            <button
              class="w-full h-16 text-lg font-black rounded-2xl shadow-2xl bg-primary hover:bg-emerald-400 text-primary-foreground hover:scale-[1.02] transition-all active:scale-95 uppercase tracking-widest disabled:opacity-50"
              @click="handleCreateIdentity"
              :disabled="isCreating"
            >
              <template v-if="isCreating">
                <div class="flex items-center justify-center gap-3">
                  <div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-b-transparent" />
                  SECURING...
                </div>
              </template>
              <template v-else>Claim Identity</template>
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
