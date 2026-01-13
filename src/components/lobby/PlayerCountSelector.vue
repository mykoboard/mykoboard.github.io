<script setup lang="ts">
import { Users } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
}>(), {
  min: 2,
  max: 4,
  label: 'Players'
})

const options = Array.from({ length: props.max - props.min + 1 }, (_, i) => props.min + i)
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <span class="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
      <Users class="w-3 h-3" />
      {{ label }} Node Capacity
    </span>
    <div class="flex bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
      <button
        v-for="option in options"
        :key="option"
        @click.stop="onChange(option)"
        :class="[
          'h-10 w-12 rounded-xl text-xs font-black transition-all duration-300',
          value === option
            ? 'bg-primary text-primary-foreground shadow-neon'
            : 'text-white/30 hover:text-white hover:bg-white/5'
        ]"
      >
        {{ option }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.shadow-neon {
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
}
</style>
