<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ item: { type: Object, default: () => ({}) }, decorative: Boolean })
const failed = ref(false)
watch(
  () => props.item.cover,
  () => {
    failed.value = false
  }
)
</script>

<template>
  <div
    class="cover-art"
    :class="`palette-${item.palette || 'sage'}`"
    :aria-hidden="decorative || undefined"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : `Pochette de ${item.title || item.name || 'la playlist'}`"
  >
    <img
      v-if="item.cover && !failed"
      :src="item.cover"
      alt=""
      loading="lazy"
      @error="failed = true"
    />
    <template v-else>
      <div class="cover-orbit orbit-one"></div>
      <div class="cover-orbit orbit-two"></div>
      <span class="cover-mark">{{ item.mark || 'o' }}</span>
      <span class="cover-caption">{{ item.artist || 'une sélection Moussiqa' }}</span>
      <span class="cover-corner">{{ item.year || '01 — 08' }}</span>
    </template>
  </div>
</template>
