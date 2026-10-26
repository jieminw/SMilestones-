<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { X } from "lucide-vue-next";

const props = withDefaults(defineProps<{ open: boolean; title?: string; width?: number; hideClose?: boolean }>(), { width: 480 });
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLElement | null>(null);

const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.open && emit("close");
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
watch(
  () => props.open,
  async (o) => {
    if (o) {
      await nextTick();
      dialog.value?.focus();
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="anim-fade absolute inset-0 bg-black/50 backdrop-blur-[2px]" @click="emit('close')" />
      <div
        ref="dialog"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        class="anim-rise relative max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-[8px] bg-surface p-7 shadow-[var(--shadow-pop)] outline-none"
        :style="{ maxWidth: width + 'px' }"
      >
        <button v-if="!hideClose" type="button" aria-label="Close" class="absolute top-4 right-4 cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2" @click="emit('close')">
          <X :size="18" />
        </button>
        <h2 v-if="title" class="mb-5 pr-8 text-xl font-semibold text-ink">{{ title }}</h2>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
