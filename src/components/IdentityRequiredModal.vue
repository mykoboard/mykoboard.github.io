<script setup lang="ts">
import { ref, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Fingerprint, Sparkles, Shield } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import Input from './ui/Input.vue'
import * as Keys from '../application/InjectionKeys'

const router = useRouter()
const route = useRoute()

const identityRepo = inject(Keys.IdentityRepoKey)!

const name = ref('')
const token = ref('')
const isCreating = ref(false)

const handleCreateIdentity = async () => {
    if (!name.value.trim()) {
        toast.error('A name is required to generate your identity')
        return
    }
    isCreating.value = true
    try {
        await identityRepo.createIdentity(name.value.trim(), token.value.trim())
        toast.success('Identity Established', {
            description: 'Your decentralized node is now active.'
        })
        // Navigate back to the originally requested destination if available
        const redirectPath = route.query.redirect as string | undefined
        if (redirectPath) {
            router.replace(redirectPath)
        }
        // If on the board page itself, just reload (parent will react to identity change)
    } catch {
        toast.error('Identity generation failed')
    } finally {
        isCreating.value = false
    }
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-labelledby="identity-modal-title"
  >
    <!-- Modal panel -->
    <div class="w-full max-w-md mx-4 glass-dark rounded-[2.5rem] border border-primary/20 shadow-[0_0_80px_rgba(16,185,129,0.15)] p-10 space-y-8 animate-fade-in-up">

      <!-- Icon + heading -->
      <div class="space-y-4 text-center">
        <div class="mx-auto w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <Fingerprint class="w-10 h-10 text-primary" />
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-center gap-2">
            <Shield class="w-4 h-4 text-primary/60" />
            <span class="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Identity Required</span>
          </div>
          <h2
            id="identity-modal-title"
            class="text-3xl font-black uppercase tracking-tight text-white"
          >
            Establish <span class="text-gradient">Your Node</span>
          </h2>
          <p class="text-slate-400 font-medium text-sm leading-relaxed max-w-xs mx-auto">
            To join or start a game session, you need a local identity.
            Your keys stay <span class="text-primary font-bold italic">exclusively</span> on this device.
          </p>
        </div>
      </div>

      <!-- Form -->
      <div class="space-y-5">
        <div class="space-y-2">
          <label
            for="identity-name-input"
            class="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-1"
          >
            Identity Name
          </label>
          <Input
            id="identity-name-input"
            v-model="name"
            placeholder="How shall the network know you?"
            class-name="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary text-white font-bold"
            @keyup.enter="handleCreateIdentity"
          />
        </div>

        <div class="space-y-2">
          <label
            for="identity-token-input"
            class="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-1"
          >
            Subscription Token <span class="text-white/20 font-medium normal-case tracking-normal">(optional)</span>
          </label>
          <Input
            id="identity-token-input"
            v-model="token"
            placeholder="Paste access token if available..."
            class-name="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary text-white font-mono text-sm"
          />
        </div>

        <button
          id="identity-create-btn"
          :disabled="isCreating || !name.trim()"
          class="w-full h-16 text-sm font-black uppercase tracking-[0.4em] rounded-2xl bg-primary text-primary-foreground shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:shadow-[0_0_60px_rgba(16,185,129,0.4)] transition-all duration-500 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
          @click="handleCreateIdentity"
        >
          <div v-if="isCreating" class="flex items-center justify-center gap-3">
            <div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-b-transparent" />
            Generating Secure Node...
          </div>
          <div v-else class="flex items-center justify-center gap-3">
            Initialize Identity
            <Sparkles class="w-5 h-5" />
          </div>
        </button>
      </div>

      <p class="text-[10px] text-white/20 text-center uppercase tracking-widest font-bold">
        P2P Encryption · Local-First · Zero Server
      </p>
    </div>
  </div>
</template>
