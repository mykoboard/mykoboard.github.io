<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { UserPlus, UserMinus, ShieldCheck, Zap, Sword, Network, Share2, Globe } from 'lucide-vue-next'
import type { PlayerInfo } from '@mykoboard/integration'

const props = defineProps<{
  players: PlayerInfo[]
  connections?: { from: string; to: string }[]
  topologyMode?: 'star' | 'mesh'
  isInitiator?: boolean
  onSetTopologyMode?: (mode: 'star' | 'mesh') => void
  currentTurnPlayerId?: string
  onRemove?: (id: string) => void
  onSaveIdentity?: (player: PlayerInfo) => Promise<void>
  isKnownIdentity?: (publicKey: string) => Promise<boolean>
}>()

const knownIdentityStatus = ref<Record<string, boolean>>({})
const saveIdentityFlags = ref<Record<string, boolean>>({})
const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const itemRefs = ref<Record<string, HTMLElement>>({})

const setItemRef = (id: string) => (el: any) => {
  if (el) itemRefs.value[id] = el as HTMLElement
}

// Mesh Engine State
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null
const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = []
const dataPulses: { from: string; to: string; progress: number; speed: number }[] = []

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
  
  if (newState) {
    await handleSaveIdentity(player)
  } else {
    saveIdentityFlags.value[player.id] = false
  }
}

const handleSaveIdentity = async (player: PlayerInfo) => {
  if (!player.publicKey || !props.onSaveIdentity) return
  
  try {
    saveIdentityFlags.value[player.id] = true
    await props.onSaveIdentity(player)
    knownIdentityStatus.value[player.id] = true
  } catch (error) {
    console.error('[LobbyPlayerList] Error saving identity:', error)
    saveIdentityFlags.value[player.id] = false
  }
}

// Canvas Mesh Engine Logic
const initMesh = () => {
  if (!canvasRef.value) return
  ctx = canvasRef.value.getContext('2d')
  resizeCanvas()
  
  // Create ambient particles (just for background drift, no fake connections)
  particles.length = 0
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: Math.random() * canvasRef.value.width,
      y: Math.random() * canvasRef.value.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.5 + 0.5
    })
  }

  animate()
}

const resizeCanvas = () => {
  if (!canvasRef.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  canvasRef.value.width = rect.width
  canvasRef.value.height = rect.height
}

const getPlayerPos = (id: string) => {
  if (!containerRef.value || !itemRefs.value[id]) return null
  const containerRect = containerRef.value.getBoundingClientRect()
  const elRect = itemRefs.value[id].getBoundingClientRect()
  return {
    // Anchor to the right side area to stay away from text and labels
    x: elRect.right - 80 - containerRect.left,
    y: elRect.top + elRect.height / 2 - containerRect.top
  }
}

const animate = () => {
  if (!ctx || !canvasRef.value) return
  
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  
  // 1. Draw Ambient Particles (Barely visible drift)
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    
    if (p.x < 0) p.x = canvasRef.value.width
    if (p.x > canvasRef.value.width) p.x = 0
    if (p.y < 0) p.y = canvasRef.value.height
    if (p.y > canvasRef.value.height) p.y = 0
    
    ctx.fillStyle = '#6366f122'
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // 2. Draw Explicit Connections
  const activeConnections = props.connections || []
  
  activeConnections.forEach((link, idx) => {
    const p1 = getPlayerPos(link.from)
    const p2 = getPlayerPos(link.to)
    
    if (!p1 || !p2) return
    
    // Calculate curvature: perpendicular offset from midpoint
    const midX = (p1.x + p2.x) / 2
    const midY = (p1.y + p2.y) / 2
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len = Math.sqrt(dx * dx + dy * dy)
    
    // Normalize and Rotate vector for perpendicular offset
    // Alternate offset direction based on index to spread lines
    const offsetDir = (idx % 2 === 0 ? 1 : -1)
    const curveAmount = 20 + (idx * 5) % 30 // Vary curvature slightly
    const nx = -dy / len 
    const ny = dx / len
    
    const cpX = midX + nx * curveAmount * offsetDir
    const cpY = midY + ny * curveAmount * offsetDir
    
    // Gradient line along curve
    const gradient = ctx!.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
    gradient.addColorStop(0, '#6366f111')
    gradient.addColorStop(0.5, '#6366f155')
    gradient.addColorStop(1, '#6366f111')
    
    ctx!.strokeStyle = gradient
    ctx!.lineWidth = 1
    ctx!.beginPath()
    ctx!.moveTo(p1.x, p1.y)
    ctx!.quadraticCurveTo(cpX, cpY, p2.x, p2.y)
    ctx!.stroke()
    
    // Connection glow
    ctx!.shadowBlur = 5
    ctx!.shadowColor = '#6366f133'
    ctx!.stroke()
    ctx!.shadowBlur = 0
    
    // Special effect if one of the linked players is on turn
    const isPlayerOnTurnLinked = link.from === props.currentTurnPlayerId || link.to === props.currentTurnPlayerId
    if (isPlayerOnTurnLinked) {
      ctx!.strokeStyle = '#6366f188'
      ctx!.lineWidth = 2
      ctx!.beginPath()
      ctx!.moveTo(p1.x, p1.y)
      ctx!.quadraticCurveTo(cpX, cpY, p2.x, p2.y)
      ctx!.stroke()
    }

    // Trigger data pulses randomly for real connections
    if (Math.random() < 0.005) {
      dataPulses.push({
        from: link.from,
        to: link.to,
        progress: 0,
        speed: 0.005 + Math.random() * 0.01
      })
    }
  })
  
  // 3. Draw Data Pulses
  for (let i = dataPulses.length - 1; i >= 0; i--) {
    const pulse = dataPulses[i]
    const p1 = getPlayerPos(pulse.from)
    const p2 = getPlayerPos(pulse.to)
    
    // Find connection index to replicate the same curvature
    const connIdx = activeConnections.findIndex(c => 
      (c.from === pulse.from && c.to === pulse.to) || (c.from === pulse.to && c.to === pulse.from)
    )
    
    if (!p1 || !p2 || connIdx === -1) {
      dataPulses.splice(i, 1)
      continue
    }
    
    pulse.progress += pulse.speed
    if (pulse.progress >= 1) {
      dataPulses.splice(i, 1)
      continue
    }
    
    // Calculate Quadratic Bezier Position: B(t) = (1-t)^2*P0 + 2(1-t)t*CP + t^2*P2
    const t = pulse.progress
    const midX = (p1.x + p2.x) / 2
    const midY = (p1.y + p2.y) / 2
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const offsetDir = (connIdx % 2 === 0 ? 1 : -1)
    const curveAmount = 20 + (connIdx * 5) % 30
    const nx = -dy / len
    const ny = dx / len
    const cpX = midX + nx * curveAmount * offsetDir
    const cpY = midY + ny * curveAmount * offsetDir

    const x = Math.pow(1 - t, 2) * p1.x + 2 * (1 - t) * t * cpX + Math.pow(t, 2) * p2.x
    const y = Math.pow(1 - t, 2) * p1.y + 2 * (1 - t) * t * cpY + Math.pow(t, 2) * p2.y
    
    ctx.fillStyle = '#6366f1'
    ctx.shadowBlur = 10
    ctx.shadowColor = '#6366f1'
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
  
  animationId = requestAnimationFrame(animate)
}

// Resize observer to keep canvas sized correctly
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  checkKnownIdentities()
  nextTick(() => {
    initMesh()
  })
  
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (animationId) cancelAnimationFrame(animationId)
})

watch(() => props.players, () => {
  checkKnownIdentities()
}, { deep: true })
</script>

<template>
  <div 
    ref="containerRef"
    class="glass-dark p-8 rounded-[2.5rem] border border-white/5 shadow-glass-dark relative overflow-hidden group"
  >
    <!-- Connectivity Canvas Layer -->
    <canvas 
      ref="canvasRef"
      class="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40 mix-blend-screen"
    />

    <!-- Decorative background glow -->
    <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full group-hover:bg-primary/10 transition-colors duration-700 pointer-events-none" />
    
    <div class="relative z-10">
      <!-- Header & Topology Switcher -->
      <div class="flex items-center justify-between mb-8 px-2">
        <div class="space-y-1">
          <h3 class="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Globe class="w-6 h-6 text-primary" />
            Dwellers In Lobby
          </h3>
          <p class="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium">
            Synchronizing <span class="text-primary font-black">{{ players.length }}</span> nodes in the mesh
          </p>
        </div>

        <!-- Topology Toggle (Host Only) -->
        <div v-if="isInitiator" class="flex items-center bg-black/40 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
          <button 
            @click="onSetTopologyMode?.('star')"
            :class="[
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2',
              topologyMode === 'star' ? 'bg-primary text-primary-foreground shadow-neon' : 'text-white/40 hover:text-white/60'
            ]"
          >
            <Share2 class="w-3 h-3" />
            Host-Centric
          </button>
          <button 
            @click="onSetTopologyMode?.('mesh')"
            :class="[
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2',
              topologyMode === 'mesh' ? 'bg-primary text-primary-foreground shadow-neon' : 'text-white/40 hover:text-white/60'
            ]"
          >
            <Network class="w-3 h-3" />
            P2P Mesh
          </button>
        </div>
      </div>

      <div class="space-y-4">
        <TransitionGroup 
          name="list"
          enter-active-class="transition-all duration-500 ease-out"
          enter-from-class="opacity-0 -translate-x-8"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition-all duration-300 ease-in absolute"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div 
            v-for="player in players" 
            :key="player.id" 
            :ref="setItemRef(player.id)"
            :class="[
              'flex items-center gap-5 p-5 rounded-3xl transition-all duration-500 border relative group/item',
              player.id === currentTurnPlayerId 
                ? 'bg-primary/10 border-primary shadow-neon-sm animate-pulse-subtle' 
                : 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-primary/30'
            ]"
          >
            <!-- Turn Indicator Particle Effect -->
            <div v-if="player.id === currentTurnPlayerId" class="absolute inset-0 bg-primary/5 animate-pulse rounded-3xl pointer-events-none" />

            <!-- Player Avatar/Icon Area -->
            <div class="relative z-10">
              <div 
                :class="[
                  'w-12 h-12 rounded-2xl bg-gradient-to-br border flex items-center justify-center transition-all duration-500',
                  player.id === currentTurnPlayerId
                    ? 'from-primary/20 to-primary/5 border-primary shadow-neon-sm scale-110'
                    : 'from-white/10 to-white/5 border-white/10 group-hover/item:border-primary/20 group-hover/item:shadow-neon-sm'
                ]"
              >
                <span 
                  :class="[
                    'text-lg font-black transition-colors',
                    player.id === currentTurnPlayerId ? 'text-primary' : 'text-white/80 group-hover/item:text-primary'
                  ]"
                >
                  {{ player.name.charAt(0).toUpperCase() }}
                </span>
                
                <!-- On Turn Icon Overlay -->
                <div 
                  v-if="player.id === currentTurnPlayerId" 
                  class="absolute -top-1.5 -right-1.5 p-1 bg-primary rounded-lg shadow-neon-sm animate-bounce"
                >
                  <Sword class="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
              
              <!-- Status Indicator -->
              <div class="absolute -bottom-1 -right-1">
                <div class="relative flex h-4 w-4">
                  <span 
                    v-if="player.isConnected"
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"
                  ></span>
                  <span 
                    :class="[
                      'relative inline-flex rounded-full h-4 w-4 border-2 border-[#0A0A0A]',
                      player.isConnected ? 'bg-primary' : 'bg-rose-500'
                    ]"
                  ></span>
                </div>
              </div>
            </div>

            <div class="flex flex-col flex-1 min-w-0 z-10">
              <div class="flex items-center gap-2">
                <span 
                  :class="[
                    'text-base font-black uppercase tracking-tight truncate transition-colors',
                    player.id === currentTurnPlayerId ? 'text-primary' : 'text-white'
                  ]"
                >
                  {{ player.name }} 
                </span>
                <span v-if="player.isLocal" class="px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-lg text-[9px] font-black uppercase tracking-widest italic group-hover/item:shadow-neon-sm transition-shadow">
                  LOCAL
                </span>
                
                <span v-if="player.isHost" class="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  HOST
                </span>

                <!-- Known Identity Badge -->
                <div 
                  v-if="!player.isLocal && knownIdentityStatus[player.id]" 
                  class="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider"
                >
                  <ShieldCheck class="w-3 h-3" />
                  Verified
                </div>
              </div>
              
              <!-- Connection Detail / Subtext -->
              <div class="flex items-center gap-3 mt-1.5">
                <div v-if="player.isConnected" class="flex items-center gap-1.5">
                  <Zap class="w-3 h-3 text-primary animate-pulse" />
                  <span class="text-[9px] text-primary/60 font-black uppercase tracking-[0.2em]">
                    {{ player.id === currentTurnPlayerId ? 'NODE ACTIVE - ON TURN' : 'Node Synchronized' }}
                  </span>
                </div>
                <span v-else class="text-[9px] text-rose-500/60 font-black uppercase tracking-[0.2em]">Connection Lost</span>
                
                <!-- Auto-approve Toggle -->
                <div 
                  v-if="!player.isLocal && player.isConnected && !knownIdentityStatus[player.id]" 
                  class="flex items-center gap-2 ml-auto"
                >
                  <button
                    @click="handleToggleSave(player)"
                    :class="[
                      'relative inline-flex h-4 w-8 items-center rounded-full transition-all duration-300 border',
                      saveIdentityFlags[player.id] ? 'bg-primary border-primary shadow-neon-sm' : 'bg-white/5 border-white/10'
                    ]"
                  >
                    <span
                      :class="[
                        'inline-block h-2 w-2 transform rounded-full bg-white transition-transform duration-300',
                        saveIdentityFlags[player.id] ? 'translate-x-5' : 'translate-x-1'
                      ]"
                    />
                  </button>
                  <span class="text-[8px] text-white/30 uppercase tracking-widest font-black whitespace-nowrap">
                    Trust Node
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Remove Action -->
            <div v-if="!player.isLocal && onRemove" class="flex items-center z-10">
              <button
                class="w-10 h-10 flex items-center justify-center text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/30 rounded-2xl"
                @click="onRemove(player.id)"
                title="Disconnect node"
              >
                <UserMinus class="w-5 h-5" />
              </button>
            </div>
          </div>
        </TransitionGroup>
        
        <!-- Empty State -->
        <div 
          v-if="players.length === 0" 
          class="flex flex-col items-center justify-center py-12 px-4 space-y-4 border-2 border-dashed border-white/5 rounded-3xl"
        >
          <div class="relative">
            <UserPlus class="w-12 h-12 text-white/5 animate-pulse" />
            <div class="absolute inset-0 w-12 h-12 bg-primary/5 blur-xl animate-pulse" />
          </div>
          <p class="text-[10px] text-white/20 uppercase font-black tracking-[0.4em] text-center max-w-[200px] leading-relaxed">
            Awaiting peer synchronization nodes...
          </p>
        </div>
      </div>
    </div>
    
    <!-- Premium Bottom Accent -->
    <div class="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
  </div>
</template>

<style>
/* Transition Group Classes for nicer animations */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-active {
  position: absolute;
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.95; transform: scale(1.005); }
}

.animate-pulse-subtle {
  animation: pulse-subtle 4s infinite ease-in-out;
}
</style>
