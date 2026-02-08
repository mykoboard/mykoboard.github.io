<script setup lang="ts">
import { applyReactInVue } from 'veaury'
import { watch, shallowRef, toRaw, onUnmounted } from 'vue'

const props = defineProps<{
  component: any
  componentProps: any
}>()

// Use shallowRef to prevent Vue from trying to make the React component constructor reactive
const WrappedComponent = shallowRef<any>(null)

watch(() => props.component, (newComp) => {
  if (newComp) {
    try {
      // toRaw(newComp) is essential to get the original React component
      // (either a function, class, or React.lazy object)
      const rawComponent = toRaw(newComp)
      
      // applyReactInVue creates a Vue component that can render the React component
      WrappedComponent.value = applyReactInVue(rawComponent)
    } catch (err) {
      console.error('[ReactComponentWrapper] Failed to apply React in Vue:', err)
      WrappedComponent.value = null
    }
  } else {
    WrappedComponent.value = null
  }
}, { immediate: true })

onUnmounted(() => {
  WrappedComponent.value = null
})
</script>

<template>
  <div class="w-full h-full">
    <component 
      :is="WrappedComponent" 
      v-bind="componentProps" 
      v-if="WrappedComponent" 
    />
    <div v-else class="p-20 text-center text-white/10 uppercase font-black tracking-[0.5em] animate-pulse">
      Initialising Game...
    </div>
  </div>
</template>
