<script setup lang="ts">
import { applyReactInVue } from 'veaury'
import { defineComponent, h } from 'vue'

const props = defineProps<{
  component: any
  componentProps: any
}>()

const VueComponent = applyReactInVue(props.component)
</script>

<template>
  <VueComponent v-bind="componentProps" />
</template>
