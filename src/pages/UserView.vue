<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { User, Key, Fingerprint, Sparkles, Save, Shield, History, AlertTriangle, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import Header from '../components/HeaderView.vue'
import Input from '../components/ui/Input.vue'
import PastMatches from '../components/PastMatchesView.vue'
import { SecureWallet, type PlayerIdentity } from '../lib/wallet'
import { SessionManager } from '../lib/sessions'
import { sanitizeAvatarUrl } from '../lib/utils'
import { 
  AlertDialogRoot, 
  AlertDialogTrigger, 
  AlertDialogPortal, 
  AlertDialogOverlay, 
  AlertDialogContent, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogCancel, 
  AlertDialogAction 
} from 'radix-vue'

const router = useRouter()
const identity = ref<PlayerIdentity | null>(null)
const name = ref("")
const avatar = ref("")
const token = ref("")
const isSaving = ref(false)
const isClearing = ref(false)
const activeSessions = ref<any[]>([])

onMounted(async () => {
    const wallet = SecureWallet.getInstance()
    const id = await wallet.getIdentity()
    if (id) {
        identity.value = id
        name.value = id.name
        avatar.value = id.avatar || ""
        token.value = id.subscriptionToken
    }
    activeSessions.value = await SessionManager.getSessions()
})

const hasChanges = computed(() => {
    if (!identity.value) return false
    return name.value !== identity.value.name ||
           avatar.value !== (identity.value.avatar || "") ||
           token.value !== identity.value.subscriptionToken
})

const handleUpdateProfile = async () => {
    if (!name.value.trim()) {
        toast.error("Identity match requires a name")
        return
    }
    isSaving.value = true
    try {
        const wallet = SecureWallet.getInstance()
        await wallet.updateIdentity({
            name: name.value,
            avatar: avatar.value,
            subscriptionToken: token.value
        })
        identity.value = await wallet.getIdentity()
        toast.success("Identity Reconfigured", {
            description: "Your neural profile has been updated."
        })
    } catch (error) {
        toast.error("Encryption Phase Failed")
    } finally {
        isSaving.value = false
    }
}

const onDeleteSession = async (id: string) => {
    await SessionManager.removeSession(id)
    activeSessions.value = await SessionManager.getSessions()
    toast.success("Match history deleted")
}

const handleClearAllData = async () => {
    isClearing.value = true
    try {
        const wallet = SecureWallet.getInstance()
        await wallet.clearIdentity()
        await SessionManager.clearAllSessions()
        toast.success("All Data Cleared")
        router.replace('/')
    } catch (error) {
        toast.error("Wipe Operation Failed")
    } finally {
        isClearing.value = false
    }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-4xl mx-auto p-6 space-y-12">
      <Header />

      <div v-if="identity" class="space-y-10 animate-fade-in-up">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-neon">
            <User class="w-8 h-8 text-primary" />
          </div>
          <h1 class="text-4xl font-black tracking-tight text-white uppercase">User <span class="text-gradient">Profile</span></h1>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Identity Card -->
          <div class="glass-dark p-8 rounded-3xl space-y-8 border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500">
            <div class="flex items-center gap-4">
              <div class="relative">
                <div class="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shadow-neon">
                  <img v-if="sanitizeAvatarUrl(avatar)" :src="sanitizeAvatarUrl(avatar)" alt="Avatar" class="w-full h-full object-cover" />
                  <User v-else class="w-8 h-8 text-primary" />
                </div>
                <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-[#0A0A0A] shadow-neon" />
              </div>
              <div class="space-y-1">
                <h2 class="text-2xl font-bold text-white uppercase tracking-wide">Identity</h2>
                <p class="text-[10px] text-primary font-black uppercase tracking-widest">Active Node</p>
              </div>
            </div>

            <div class="space-y-6">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Display Keyname</label>
                <Input v-model="name" placeholder="Enter identity name..." className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-bold" />
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Avatar Vector (URL)</label>
                <Input v-model="avatar" placeholder="https://images.unsplash.com/..." className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono text-sm" />
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Node Identifier</label>
                <div class="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 group-hover:neon-border transition-all duration-500">
                  <Fingerprint class="w-5 h-5 text-primary/60 shrink-0" />
                  <code class="text-sm text-white/70 break-all select-all font-mono">{{ identity.id }}</code>
                </div>
              </div>
            </div>
          </div>

          <!-- System Settings Card -->
          <div class="glass-dark p-8 rounded-3xl space-y-8 border border-white/5 shadow-glass-dark group hover:border-primary/20 transition-all duration-500">
            <div class="flex items-center gap-3">
              <Sparkles class="w-6 h-6 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
              <h2 class="text-2xl font-bold text-white uppercase tracking-wide">System Auth</h2>
            </div>

            <div class="space-y-6">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Public Key Vector</label>
                <div class="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 group-hover:neon-border transition-all duration-500">
                  <Key class="w-5 h-5 text-primary/60 shrink-0 mt-1" />
                  <code class="text-[11px] text-white/50 break-all select-all font-mono leading-relaxed">{{ identity.publicKey }}</code>
                </div>
              </div>

              <div class="space-y-3">
                <label class="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Access Token</label>
                <Input v-model="token" placeholder="Paste your node token..." className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-mono" />
              </div>
            </div>
          </div>
        </div>

        <div class="pt-8">
          <button
            @click="handleUpdateProfile"
            :disabled="isSaving || !hasChanges"
            class="w-full h-16 text-sm font-black uppercase tracking-[0.4em] rounded-2xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_50px_rgba(16,185,129,0.4)] transition-all duration-500 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <template v-if="isSaving">
              <div class="flex items-center justify-center gap-3">
                <div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-b-transparent" />
                Encrypting Profile Data...
              </div>
            </template>
            <template v-else>COMMIT NEURAL CONFIGURATION</template>
          </button>
        </div>

        <!-- Game History -->
        <div v-if="activeSessions.length > 0" class="space-y-8 pt-8">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-neon">
              <History class="w-6 h-6 text-primary" />
            </div>
            <h2 class="text-3xl font-black tracking-tight text-white uppercase">Game <span class="text-gradient">History</span></h2>
          </div>
          <div class="max-w-3xl">
            <PastMatches :active-sessions="activeSessions" @delete-session="onDeleteSession" />
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="pt-12 mt-12 border-t border-destructive/20 space-y-8 animate-fade-in-up" style="animation-delay: 0.2s">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-destructive/10 rounded-2xl border border-destructive/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <AlertTriangle class="w-6 h-6 text-destructive" />
            </div>
            <h2 class="text-3xl font-black tracking-tight text-white uppercase italic">Danger <span class="text-destructive">Zone</span></h2>
          </div>

          <div class="glass-dark p-8 rounded-3xl border border-destructive/10 shadow-glass-dark space-y-6">
            <div class="space-y-2">
              <h3 class="text-xl font-bold text-white uppercase tracking-tight">Purge All Neural Records</h3>
              <p class="text-sm text-slate-400 font-medium leading-relaxed">
                This action will permanently delete your <span class="text-destructive font-bold">decentralized identity</span>,
                private keys, and <span class="text-destructive font-bold">all match history</span> from this device.
                This cannot be undone.
              </p>
            </div>

            <AlertDialogRoot>
              <AlertDialogTrigger asChild>
                <button
                  :disabled="isClearing"
                  class="h-14 px-8 text-xs font-black uppercase tracking-[0.2em] rounded-xl border border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all duration-300 disabled:opacity-50"
                >
                  {{ isClearing ? "PURGING DATA..." : "INITIATE FULL DATA WIPE" }}
                </button>
              </AlertDialogTrigger>
              <AlertDialogPortal>
                <AlertDialogOverlay class="bg-black/80 fixed inset-0 z-[100] backdrop-blur-sm" />
                <AlertDialogContent class="glass-dark border border-destructive/20 rounded-[2rem] p-8 max-w-md fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]">
                  <div class="space-y-4">
                    <div class="mx-auto h-20 w-20 bg-destructive/10 rounded-[2.5rem] border border-destructive/20 flex items-center justify-center relative group">
                      <div class="absolute inset-0 bg-destructive/20 blur-2xl rounded-full opacity-50" />
                      <AlertTriangle class="w-10 h-10 text-destructive relative z-10" />
                    </div>
                    <AlertDialogTitle class="text-2xl font-black text-center tracking-tighter text-white uppercase">
                      Confirm Neural Purge?
                    </AlertDialogTitle>
                    <AlertDialogDescription class="text-center text-slate-400 font-medium px-4">
                      You are about to erase all local data. Your identity and game history will be lost forever. Are you absolutely certain?
                    </AlertDialogDescription>
                  </div>
                  <div class="flex gap-4 pt-6 justify-end">
                    <AlertDialogCancel class="h-14 px-6 rounded-xl bg-white/5 border-white/10 text-white font-bold hover:bg-white/10 uppercase text-xs">
                      ABORT
                    </AlertDialogCancel>
                    <AlertDialogAction
                      @click="handleClearAllData"
                      class="h-14 px-6 rounded-xl bg-destructive text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-destructive/90 text-xs"
                    >
                      WIPE DATA
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialogPortal>
            </AlertDialogRoot>
          </div>
        </div>
      </div>
    </div>
  </div>
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

.shadow-neon {
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
}

.neon-border {
  border: 1px solid rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.7s ease-out forwards;
}
</style>
