<script setup lang="ts">
import Fluffy from "./Fluffy.vue";

/** The arched alcove with leaves that frames Fluffy in the Figma. */
withDefaults(defineProps<{ size?: number; mood?: "happy" | "content" | "sad"; outfit?: number }>(), { size: 220 });
</script>

<template>
  <div class="relative" :style="{ width: size + 'px', height: size * 1.05 + 'px' }">
    <svg viewBox="0 0 220 230" :width="size" :height="size * 1.05" class="absolute inset-0" aria-hidden="true">
      <path d="M14 230 V108 C14 50 58 10 110 10 C162 10 206 50 206 108 V230 Z" fill="#1c2d44" />
      <path d="M26 230 V110 C26 58 64 22 110 22 C156 22 194 58 194 110 V230" fill="none" stroke="#d99a3a" stroke-width="2" />
      <g v-for="i in [0, 1, 2, 3, 4]" :key="i" fill="#d99a3a" opacity="0.9">
        <ellipse :cx="40 + i * 4" :cy="196 - i * 26" rx="12" ry="5" :transform="`rotate(-40 ${40 + i * 4} ${196 - i * 26})`" />
        <ellipse :cx="180 - i * 4" :cy="196 - i * 26" rx="12" ry="5" :transform="`rotate(40 ${180 - i * 4} ${196 - i * 26})`" />
      </g>
      <rect x="46" y="200" width="128" height="20" rx="10" fill="#e8906a" />
      <rect x="56" y="196" width="108" height="10" rx="5" fill="#e08b6e" />
    </svg>
    <div class="anim-bob absolute left-1/2 -translate-x-1/2" :style="{ bottom: size * 0.1 + 'px' }">
      <Fluffy :size="size * 0.58" :mood="mood" :outfit="outfit" />
    </div>
  </div>
</template>
