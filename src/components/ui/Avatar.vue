<script setup lang="ts">
import { cx } from "@/lib/cx";

/** A little cartoon face: partner "a" is drawn as a girl, partner "b" as a guy. */
withDefaults(defineProps<{ name: string; who?: "a" | "b"; size?: number; ring?: boolean }>(), { who: "a", size: 36 });
</script>

<template>
  <span
    :title="name"
    :style="{ width: size + 'px', height: size + 'px' }"
    :class="cx('inline-block shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.3)]', ring && 'ring-2 ring-surface')"
  >
    <svg viewBox="0 0 64 64" :width="size" :height="size" role="img" :aria-label="name">
      <defs>
        <linearGradient id="av-bg-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6bd9c" /><stop offset="1" stop-color="#e58a62" /></linearGradient>
        <linearGradient id="av-bg-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfdadd" /><stop offset="1" stop-color="#82abb3" /></linearGradient>
      </defs>

      <!-- girl -->
      <g v-if="who === 'a'">
        <rect width="64" height="64" fill="url(#av-bg-a)" />
        <path d="M13 42 C10 18 21 9 32 9 C43 9 54 18 51 42 C51 51 47 57 44 60 L20 60 C17 57 13 51 13 42Z" fill="#3a2824" />
        <path d="M9 66 C9 53 20 48 32 48 C44 48 55 53 55 66Z" fill="#fdf0e6" />
        <path d="M26 48 Q32 55 38 48" fill="none" stroke="#e8cdb8" stroke-width="1.4" stroke-linecap="round" />
        <rect x="28" y="40" width="8" height="10" rx="3" fill="#ecbd9c" />
        <ellipse cx="32" cy="30" rx="12" ry="13.5" fill="#f8d8be" />
        <path d="M18.5 30 C17.5 16 26 12.5 32 12.5 C39 12.5 46.5 16 45.5 30 C42 24.5 37 21 32 21 C27 21 22 24.5 18.5 30Z" fill="#3a2824" />
        <circle cx="27" cy="32" r="1.7" fill="#2b2020" />
        <circle cx="37" cy="32" r="1.7" fill="#2b2020" />
        <circle cx="27.6" cy="31.4" r="0.55" fill="#fff" />
        <circle cx="37.6" cy="31.4" r="0.55" fill="#fff" />
        <ellipse cx="23.5" cy="36.5" rx="2.8" ry="1.7" fill="#f09a8c" opacity="0.55" />
        <ellipse cx="40.5" cy="36.5" rx="2.8" ry="1.7" fill="#f09a8c" opacity="0.55" />
        <path d="M28.5 38 Q32 41.2 35.5 38" fill="none" stroke="#b4503f" stroke-width="1.5" stroke-linecap="round" />
      </g>

      <!-- guy -->
      <g v-else>
        <rect width="64" height="64" fill="url(#av-bg-b)" />
        <path d="M8 66 C8 53 19 48 32 48 C45 48 56 53 56 66Z" fill="#33414d" />
        <path d="M25 48 L32 55 L39 48" fill="#f2f2ee" />
        <rect x="28" y="40" width="8" height="10" rx="3" fill="#e0b08b" />
        <circle cx="19.8" cy="31.5" r="2.3" fill="#f0c9a6" />
        <circle cx="44.2" cy="31.5" r="2.3" fill="#f0c9a6" />
        <ellipse cx="32" cy="30" rx="12" ry="13.5" fill="#f3cdab" />
        <path d="M19.5 28 C17.5 14.5 25.5 10 33 10 C42 10 47.5 16 44.5 28 C43.5 22.5 40 19.5 35.5 18.5 C31 20.5 25.5 20.5 21.5 23.5 C20.5 25 20 26.5 19.5 28Z" fill="#2b2220" />
        <path d="M24.5 27.5 Q27 26.3 29.5 27.5 M34.5 27.5 Q37 26.3 39.5 27.5" fill="none" stroke="#2b2220" stroke-width="1.3" stroke-linecap="round" />
        <circle cx="27" cy="32" r="1.7" fill="#2b2020" />
        <circle cx="37" cy="32" r="1.7" fill="#2b2020" />
        <circle cx="27.6" cy="31.4" r="0.55" fill="#fff" />
        <circle cx="37.6" cy="31.4" r="0.55" fill="#fff" />
        <ellipse cx="23.8" cy="36.8" rx="2.4" ry="1.5" fill="#eb9a86" opacity="0.4" />
        <ellipse cx="40.2" cy="36.8" rx="2.4" ry="1.5" fill="#eb9a86" opacity="0.4" />
        <path d="M28 38 Q32 41.8 36 38" fill="none" stroke="#a9503f" stroke-width="1.5" stroke-linecap="round" />
      </g>
    </svg>
  </span>
</template>
