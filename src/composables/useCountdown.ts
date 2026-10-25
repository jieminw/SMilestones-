import { computed, onBeforeUnmount, onMounted, ref, type MaybeRefOrGetter, toValue } from "vue";

/** Time left until `expires`, refreshed every 30 seconds. */
export function useCountdown(expires: MaybeRefOrGetter<string>) {
  const now = ref(Date.now());
  let t: ReturnType<typeof setInterval>;
  onMounted(() => (t = setInterval(() => (now.value = Date.now()), 30_000)));
  onBeforeUnmount(() => clearInterval(t));
  const ms = computed(() => Math.max(new Date(toValue(expires)).getTime() - now.value, 0));
  const label = computed(() => `${Math.floor(ms.value / 3600_000)}h ${String(Math.floor((ms.value % 3600_000) / 60_000)).padStart(2, "0")}m`);
  return { ms, label };
}
