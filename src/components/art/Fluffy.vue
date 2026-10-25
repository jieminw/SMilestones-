<script setup lang="ts">
/** Fluffy, the couple's companion (redrawn from the SMilestones Figma as SVG). */
withDefaults(defineProps<{ size?: number; mood?: "happy" | "content" | "sad"; outfit?: number }>(), { size: 160, mood: "happy", outfit: 1 });
</script>

<template>
  <svg viewBox="0 0 190 200" :width="size" :height="(size * 200) / 190" aria-label="Fluffy the companion" role="img">
    <defs>
      <radialGradient id="fur" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#f4fbfb" />
        <stop offset="100%" stop-color="#f1e3cf" />
      </radialGradient>
      <linearGradient id="ear" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#d9b48f" />
        <stop offset="100%" stop-color="#f6e6d2" />
      </linearGradient>
    </defs>
    <!-- tail -->
    <path d="M140 170 C180 160 182 112 160 98 C172 128 156 150 132 156 Z" fill="url(#fur)" stroke="#fcd3bf" stroke-width="1.5" />
    <path d="M160 98 C168 108 170 118 168 128 C162 118 158 108 160 98 Z" fill="#e7cfb3" />
    <!-- body -->
    <ellipse cx="95" cy="150" rx="46" ry="40" fill="url(#fur)" stroke="#fcd3bf" stroke-width="1.5" />
    <ellipse cx="95" cy="160" rx="26" ry="26" fill="#f4fbfb" />
    <!-- paws -->
    <ellipse cx="78" cy="186" rx="12" ry="8" fill="#f4fbfb" stroke="#fcd3bf" stroke-width="1.5" />
    <ellipse cx="112" cy="186" rx="12" ry="8" fill="#f4fbfb" stroke="#fcd3bf" stroke-width="1.5" />
    <!-- ears -->
    <path d="M52 70 L46 18 L86 52 Z" fill="url(#fur)" stroke="#fcd3bf" stroke-width="1.5" />
    <path d="M57 62 L54 30 L78 52 Z" fill="url(#ear)" />
    <path d="M138 70 L144 18 L104 52 Z" fill="url(#fur)" stroke="#fcd3bf" stroke-width="1.5" />
    <path d="M133 62 L136 30 L112 52 Z" fill="url(#ear)" />
    <!-- head -->
    <path d="M40 92 C40 58 66 46 95 46 C124 46 150 58 150 92 C150 116 126 130 95 130 C64 130 40 116 40 92 Z" fill="url(#fur)" stroke="#fcd3bf" stroke-width="1.5" />
    <path d="M40 98 L26 104 L44 108 Z M150 98 L164 104 L146 108 Z" fill="#e8f6f6" />
    <g v-if="mood === 'sad'" stroke="#0a5059" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M70 92 q6 4 12 0" />
      <path d="M108 92 q6 4 12 0" />
    </g>
    <g v-else stroke="#0a5059" stroke-width="3.2" stroke-linecap="round" fill="none">
      <path d="M69 94 q7 -8 14 0" />
      <path d="M107 94 q7 -8 14 0" />
    </g>
    <ellipse cx="64" cy="108" rx="8" ry="5" fill="#fca47c" opacity="0.55" />
    <ellipse cx="126" cy="108" rx="8" ry="5" fill="#fca47c" opacity="0.55" />
    <path d="M91 104 L99 104 L95 109 Z" fill="#c98a76" />
    <path v-if="mood === 'sad'" d="M89 118 q6 -4 12 0" stroke="#0a5059" stroke-width="2.5" fill="none" stroke-linecap="round" />
    <path v-else d="M86 113 q4.5 5 9 0 q4.5 5 9 0" stroke="#0a5059" stroke-width="2.5" fill="none" stroke-linecap="round" />
    <!-- collar + pendant, or unlocked outfit -->
    <path v-if="outfit >= 2" d="M60 128 Q95 146 130 128 L132 138 Q95 156 58 138 Z" fill="#e0764a" />
    <path v-else d="M66 128 Q95 140 124 128" stroke="#f4895a" stroke-width="3" fill="none" />
    <circle cx="95" cy="141" r="8" fill="#e6a05a" stroke="#f4895a" stroke-width="2" />
    <path d="M95 137 v8 M92 140 l3 -3 l3 3" stroke="#fff6e8" stroke-width="1.5" fill="none" />
    <g v-if="outfit >= 3">
      <path d="M60 52 L95 38 L130 52 L95 64 Z" fill="#1c2d44" />
      <rect x="84" y="52" width="22" height="10" rx="2" fill="#1c2d44" />
      <path d="M128 52 v16" stroke="#d99a3a" stroke-width="2" />
      <circle cx="128" cy="70" r="3" fill="#d99a3a" />
    </g>
  </svg>
</template>
