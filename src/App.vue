<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>

<template>
  <div class="min-h-screen bg-background font-sans antialiased">
    <router-view v-slot="{ Component }">
      <transition 
        name="fade" 
        mode="out-in"
      >
        <component :is="Component" />
      </transition>
    </router-view>
    <Toaster position="top-center" richColors />
  </div>
</template>

