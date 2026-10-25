<script setup lang="ts">
/** A piggy bank with the saved amount written on its side and a coin that drops in every few seconds. */
withDefaults(defineProps<{ amount: string; size?: number }>(), { size: 280 });
</script>

<template>
  <svg :viewBox="'0 0 300 230'" :width="size" :height="(size * 230) / 300" role="img" :aria-label="`Piggy bank holding ${amount}`" class="pig overflow-visible">
    <defs>
      <linearGradient id="pigBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f1dfc6" />
        <stop offset="100%" stop-color="#fca47c" />
      </linearGradient>
      <linearGradient id="coinFace" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f6dc8c" />
        <stop offset="100%" stop-color="#c9953a" />
      </linearGradient>
    </defs>

    <!-- shadow -->
    <ellipse cx="150" cy="214" rx="104" ry="9" fill="#06363c" opacity="0.12" />

    <!-- falling coin -->
    <g class="pig-coin">
      <ellipse cx="150" cy="0" rx="19" ry="19" fill="url(#coinFace)" stroke="#9a7228" stroke-width="2" />
      <text x="150" y="6" text-anchor="middle" font-size="19" font-weight="700" fill="#7a5a1c" font-family="DM Sans Variable, sans-serif">$</text>
    </g>

    <g class="pig-body">
      <!-- tail -->
      <path d="M52 104 C26 98 24 128 44 124 C34 118 38 106 52 112" fill="none" stroke="#b98a5e" stroke-width="6" stroke-linecap="round" />
      <!-- back legs -->
      <rect x="78" y="168" width="30" height="40" rx="12" fill="#f6965f" />
      <rect x="176" y="168" width="30" height="40" rx="12" fill="#f6965f" />
      <!-- body -->
      <ellipse cx="150" cy="118" rx="108" ry="78" fill="url(#pigBody)" stroke="#06363c" stroke-width="2.5" />
      <!-- front legs -->
      <rect x="104" y="172" width="30" height="38" rx="12" fill="#fcc3a5" stroke="#06363c" stroke-width="2.5" />
      <rect x="196" y="172" width="30" height="38" rx="12" fill="#fcc3a5" stroke="#06363c" stroke-width="2.5" />
      <!-- ear -->
      <path d="M208 52 L232 22 L246 66 Z" fill="#fca47c" stroke="#06363c" stroke-width="2.5" stroke-linejoin="round" />
      <!-- snout -->
      <ellipse cx="258" cy="116" rx="28" ry="24" fill="#ecd3b0" stroke="#06363c" stroke-width="2.5" />
      <ellipse cx="266" cy="110" rx="4" ry="6" fill="#06363c" />
      <ellipse cx="266" cy="126" rx="4" ry="6" fill="#06363c" />
      <!-- eye -->
      <circle cx="226" cy="92" r="6" fill="#06363c" />
      <circle cx="228" cy="90" r="2" fill="#fff" />
      <!-- cheek -->
      <ellipse cx="214" cy="116" rx="10" ry="6" fill="#f4895a" opacity="0.4" />
      <!-- coin slot -->
      <rect x="120" y="46" width="60" height="9" rx="4.5" fill="#06363c" />
      <!-- amount, written on the side -->
      <text x="142" y="126" text-anchor="middle" font-size="34" font-weight="600" fill="#06363c" font-family="Fraunces Variable, serif">{{ amount }}</text>
      <text x="142" y="148" text-anchor="middle" font-size="11" letter-spacing="2.2" fill="#6c4629" font-family="Inter Variable, sans-serif">SAVED TOGETHER</text>
    </g>
  </svg>
</template>

<style scoped>
.pig-body {
  transform-origin: 150px 200px;
  animation: pig-bob 3.6s ease-in-out infinite;
}
.pig-coin {
  animation: coin-drop 3.6s cubic-bezier(0.5, 0, 0.8, 0.6) infinite;
}
@keyframes pig-bob {
  0%, 62%, 100% { transform: translateY(0) scale(1, 1); }
  70% { transform: translateY(2px) scale(1.015, 0.985); }
  80% { transform: translateY(-3px) scale(0.99, 1.01); }
}
@keyframes coin-drop {
  0% { transform: translateY(-30px) scale(1, 1); opacity: 0; }
  8% { opacity: 1; }
  52% { transform: translateY(40px) scale(1, 1); opacity: 1; }
  60% { transform: translateY(50px) scale(1, 0.15); opacity: 0; }
  100% { transform: translateY(50px) scale(1, 0.15); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .pig-body, .pig-coin { animation: none; }
  .pig-coin { opacity: 0; }
}
</style>
