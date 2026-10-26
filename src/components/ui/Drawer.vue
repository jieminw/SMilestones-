<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { X } from "lucide-vue-next";

const props = withDefaults(defineProps<{ open: boolean; title: string; width?: number }>(), { width: 460 });
const emit = defineEmits<{ close: [] }>();

const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.open && emit("close");
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50">
      <div class="anim-fade absolute inset-0 bg-black/50" @click="emit('close')" />
      <aside role="dialog" aria-modal="true" class="anim-slide absolute top-0 right-0 flex h-full w-full flex-col bg-surface shadow-[var(--shadow-pop)]" :style="{ maxWidth: width + 'px' }">
        <header class="flex items-center justify-between border-b border-line px-7 py-5">
          <h2 class="font-serif text-xl">{{ title }}</h2>
          <button type="button" aria-label="Close" class="cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2" @click="emit('close')">
            <X :size="18" />
          </button>
        </header>
        <div class="flex-1 overflow-y-auto px-7 py-6"><slot /></div>
        <footer v-if="$slots.footer" class="border-t border-line px-7 py-5"><slot name="footer" /></footer>
      </aside>
    </div>
  </Teleport>
</template>
