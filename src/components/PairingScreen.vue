<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Check, Clock, Copy, Link2, Plus } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useApp } from "@/stores/app";
import { createInviteAction, joinInviteAction } from "@/lib/api";
import { INVITE_TTL_MINUTES } from "@/data/pairing-constants";
import { cx } from "@/lib/cx";
import Avatar from "@/components/ui/Avatar.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Modal from "@/components/ui/Modal.vue";
import Progress from "@/components/ui/Progress.vue";

/** Figma 01–04: Home (not paired) → Pair → Pairing successful. */
const app = useApp();
const router = useRouter();
const invite = ref<{ code: string; expires_at: string } | null>(null);
const now = ref(Date.now());
const digits = ref<string[]>(Array(6).fill(""));
const busy = ref<"invite" | "join" | null>(null);
const error = ref<string | null>(null);
const copied = ref(false);
const success = ref(false);
const joinedPot = ref(false);
const inputs = ref<(HTMLInputElement | null)[]>([]);

let tick: ReturnType<typeof setInterval>;
let check: ReturnType<typeof setInterval> | undefined;
onMounted(() => (tick = setInterval(() => (now.value = Date.now()), 1000)));
onBeforeUnmount(() => {
  clearInterval(tick);
  clearInterval(check);
});
// While a code is live, check often whether the partner has joined.
watch(invite, (inv) => {
  clearInterval(check);
  if (inv) check = setInterval(() => void app.refresh(), 4000);
});

// The partner joined our code: the next refresh brings a couple state.
const showSuccess = computed(() => success.value || (!!app.state && !!invite.value));
const msLeft = computed(() => (invite.value ? new Date(invite.value.expires_at).getTime() - now.value : 0));
const expired = computed(() => !!invite.value && msLeft.value <= 0);
const greet = computed(() => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
});

async function makeCode() {
  busy.value = "invite";
  error.value = null;
  const r = await createInviteAction();
  busy.value = null;
  if (r.ok && r.data) invite.value = r.data;
  else if (!r.ok) error.value = r.error;
}

async function join() {
  busy.value = "join";
  error.value = null;
  const r = await joinInviteAction(digits.value.join(""));
  busy.value = null;
  if (!r.ok) {
    error.value = r.error;
    return;
  }
  joinedPot.value = r.data?.kind === "pot";
  success.value = true;
}

function setDigit(i: number, v: string) {
  const clean = v.replace(/\D/g, "");
  if (clean.length > 1) {
    // pasted the whole code
    const next = clean.slice(0, 6).split("");
    digits.value = [...next, ...Array(6 - next.length).fill("")];
    inputs.value[Math.min(next.length, 5)]?.focus();
    return;
  }
  const next = [...digits.value];
  next[i] = clean;
  digits.value = next;
  if (clean && i < 5) inputs.value[i + 1]?.focus();
}

function onKeydown(e: KeyboardEvent, i: number) {
  if (e.key === "Backspace" && !digits.value[i] && i > 0) inputs.value[i - 1]?.focus();
}

function copy() {
  if (!invite.value) return;
  void navigator.clipboard.writeText(invite.value.code);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}

async function finish() {
  await app.refresh();
  success.value = false;
  invite.value = null;
}
</script>

<template>
  <div class="mx-auto max-w-[980px] px-10 py-12">
    <p class="text-muted">{{ greet }},</p>
    <h1 class="font-serif text-[38px] text-ink">Hi {{ app.me?.display_name.split(" ")[0] }}</h1>
    <Card class="mt-8 flex items-center gap-8 p-8">
      <div class="flex items-center">
        <Avatar :name="app.me?.display_name ?? '?'" :size="68" />
        <span class="h-0.5 w-12 border-t-2 border-dashed border-line" />
        <span class="flex size-[68px] items-center justify-center rounded-full border-2 border-dashed border-terra/50 text-terra">
          <Plus :size="26" />
        </span>
      </div>
      <div>
        <h2 class="text-xl font-semibold">Pair with your partner</h2>
        <p class="mt-1 max-w-lg text-muted">Link your accounts to share milestones, agree on who saves what, and approve withdrawals together. Explore the BTO Navigator while you wait.</p>
      </div>
    </Card>

    <div class="mt-6 grid grid-cols-2 gap-6">
      <Card class="p-7">
        <div class="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Option 1</div>
        <h3 class="text-lg font-semibold">Send your code</h3>
        <p class="mt-1 text-sm text-muted">Create a 6-digit code and send it to your partner.</p>
        <template v-if="invite && !expired">
          <div class="mt-5 flex items-center justify-between rounded-2xl bg-surface-2 px-5 py-4">
            <span class="tabular font-serif text-[40px] tracking-[0.3em] text-ink">{{ invite.code }}</span>
            <button type="button" class="cursor-pointer rounded-full p-2.5 text-muted hover:bg-surface" aria-label="Copy code" @click="copy">
              <Check v-if="copied" :size="18" class="text-ok" />
              <Copy v-else :size="18" />
            </button>
          </div>
          <div class="mt-4 flex items-center gap-2 text-sm text-muted">
            <Clock :size="14" /> Expires in {{ Math.floor(msLeft / 60000) }}:{{ String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0") }}
          </div>
          <Progress class="mt-2" :value="(msLeft / (INVITE_TTL_MINUTES * 60_000)) * 100" tone="terra" :height="6" />
          <p class="mt-4 text-sm text-faint">Waiting for your partner to enter it…</p>
        </template>
        <Button v-else class="mt-6 w-full" :loading="busy === 'invite'" @click="makeCode">
          <Link2 :size="18" /> {{ expired ? "Create a new code" : "Create invitation code" }}
        </Button>
      </Card>

      <Card class="p-7">
        <div class="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Option 2</div>
        <h3 class="text-lg font-semibold">Join with a code</h3>
        <p class="mt-1 text-sm text-muted">Got a code from your partner? Enter it here.</p>
        <div class="mt-5 flex gap-2.5">
          <input
            v-for="(d, i) in digits"
            :key="i"
            :ref="(el) => (inputs[i] = el as HTMLInputElement | null)"
            :value="d"
            inputmode="numeric"
            :aria-label="`Digit ${i + 1}`"
            :class="cx('tabular h-14 w-full rounded-xl border border-line bg-white/10 text-center font-serif text-2xl outline-none focus:border-navy focus:ring-2 focus:ring-navy/10')"
            @input="setDigit(i, ($event.target as HTMLInputElement).value)"
            @keydown="onKeydown($event, i)"
          />
        </div>
        <Button variant="navy" class="mt-5 w-full" :disabled="digits.join('').length !== 6" :loading="busy === 'join'" @click="join">Connect</Button>
      </Card>
    </div>
    <p v-if="error" class="mt-4 text-center text-sm text-bad">{{ error }}</p>

    <Modal :open="showSuccess" :width="420" hide-close @close="finish">
      <div class="text-center">
        <div class="anim-pop mx-auto flex size-16 items-center justify-center rounded-full bg-navy text-white">
          <Check :size="32" />
        </div>
        <h2 class="mt-5 text-2xl font-semibold">Pairing successful</h2>
        <p class="mt-2 text-muted">Your accounts are linked. Start your first shared milestone together.</p>
        <Button class="mt-6 w-full" @click="finish">Continue</Button>
      </div>
    </Modal>
  </div>
</template>
