<script setup lang="ts">
/** A piggy bank with the saved amount written on its side and a coin that drops in every few seconds. */
withDefaults(defineProps<{ amount: string; size?: number }>(), { size: 280 });
</script>

<template>
  <svg :viewBox="'0 0 300 230'" :width="size" :height="(size * 230) / 300" role="img" :aria-label="`Piggy bank holding ${amount}`" class="pig overflow-visible">
    <defs>
      <linearGradient id="pigBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffd6c7" />
        <stop offset="55%" stop-color="#f7ae96" />
        <stop offset="100%" stop-color="#e98c72" />
      </linearGradient>
      <linearGradient id="pigPink" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffc9b8" />
        <stop offset="100%" stop-color="#ee9a7e" />
      </linearGradient>
      <linearGradient id="coinFace" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f9e08f" />
        <stop offset="100%" stop-color="#cf9a3c" />
      </linearGradient>
    </defs>

    <!-- shadow -->
    <ellipse cx="150" cy="216" rx="108" ry="9" fill="#000" opacity="0.35" />

    <!-- falling coin -->
    <g class="pig-coin">
      <ellipse cx="150" cy="0" rx="19" ry="19" fill="url(#coinFace)" stroke="#9a7228" stroke-width="2" />
      <ellipse cx="150" cy="0" rx="13" ry="13" fill="none" stroke="#fff3c4" stroke-width="1.2" opacity="0.7" />
      <text x="150" y="6" text-anchor="middle" font-size="19" font-weight="700" fill="#7a5a1c" font-family="DM Sans Variable, sans-serif">$</text>
    </g>

    <g class="pig-body">
      <!-- curly tail -->
      <path d="M50 108 C22 96 18 134 40 130 C30 123 34 111 50 116" fill="none" stroke="#ee9a7e" stroke-width="7" stroke-linecap="round" />
      <!-- back legs -->
      <rect x="76" y="166" width="32" height="42" rx="13" fill="#d9826a" />
      <rect x="180" y="166" width="32" height="42" rx="13" fill="#d9826a" />
      <!-- body -->
      <ellipse cx="150" cy="118" rx="108" ry="78" fill="url(#pigBody)" />
      <ellipse cx="150" cy="118" rx="108" ry="78" fill="none" stroke="#e08068" stroke-width="3" />
      <!-- shine -->
      <path d="M68 86 C76 58 104 44 134 42" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.5" />
      <circle cx="58" cy="108" r="3.4" fill="#fff" opacity="0.5" />
      <!-- front legs, with a hoof line -->
      <rect x="104" y="170" width="32" height="40" rx="13" fill="url(#pigPink)" />
      <rect x="198" y="170" width="32" height="40" rx="13" fill="url(#pigPink)" />
      <path d="M110 200 H130 M204 200 H224" stroke="#d9826a" stroke-width="3" stroke-linecap="round" />
      <!-- ear -->
      <path d="M206 54 L236 18 L250 68 Z" fill="url(#pigPink)" stroke="#e08068" stroke-width="3" stroke-linejoin="round" />
      <path d="M214 54 L234 31 L242 60 Z" fill="#e8806a" opacity="0.55" />
      <!-- snout -->
      <ellipse cx="258" cy="116" rx="28" ry="24" fill="url(#pigPink)" stroke="#e08068" stroke-width="3" />
      <ellipse cx="266" cy="110" rx="4" ry="6" fill="#a84d3d" />
      <ellipse cx="266" cy="126" rx="4" ry="6" fill="#a84d3d" />
      <!-- eye, cheek, smile -->
      <circle cx="226" cy="90" r="8" fill="#2b1c1a" />
      <circle cx="229" cy="87" r="2.8" fill="#fff" />
      <path d="M216 78 q8 -7 17 -2" fill="none" stroke="#2b1c1a" stroke-width="2.4" stroke-linecap="round" />
      <ellipse cx="212" cy="116" rx="12" ry="7.5" fill="#ff7f6e" opacity="0.5" />
      <path d="M233 130 Q241 138 251 132" fill="none" stroke="#a84d3d" stroke-width="2.6" stroke-linecap="round" />
      <!-- coin slot -->
      <rect x="118" y="44" width="64" height="10" rx="5" fill="#2b1c1a" />
      <rect x="122" y="46" width="56" height="2" rx="1" fill="#fff" opacity="0.18" />
      <!-- amount, written on the side -->
      <text x="142" y="124" text-anchor="middle" font-size="36" font-weight="600" fill="#4a2119" font-family="Fraunces Variable, serif">{{ amount }}</text>
      <text x="142" y="147" text-anchor="middle" font-size="11" letter-spacing="2.2" fill="#7a3b2c" font-family="Inter Variable, sans-serif">SAVED TOGETHER</text>
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
