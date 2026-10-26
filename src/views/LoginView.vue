<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { cloudEnabled } from "@/lib/config";
import { snapshotProblem } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { inputCls } from "@/lib/cx";
import { useApp } from "@/stores/app";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Field from "@/components/ui/Field.vue";
import Logo from "@/components/art/Logo.vue";

const app = useApp();
const route = useRoute();
const router = useRouter();

const signup = ref(route.query.signup === "1");
const name = ref("");
const email = ref("");
const password = ref("");
const busy = ref(false);
const error = ref<string | null>(null);
const info = ref<string | null>(null);

async function submit() {
  error.value = null;
  info.value = null;
  if (signup.value && !name.value.trim()) return void (error.value = "Tell us your name.");
  if (password.value.length < 8) return void (error.value = "Use at least 8 characters for your password.");
  busy.value = true;
  if (signup.value) {
    const { data, error: err } = await supabase().auth.signUp({
      email: email.value,
      password: password.value,
      options: { data: { display_name: name.value.trim() }, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    busy.value = false;
    if (err) return void (error.value = err.message);
    if (!data.session) return void (info.value = "Check your inbox to confirm your email, then sign in.");
  } else {
    const { error: err } = await supabase().auth.signInWithPassword({ email: email.value, password: password.value });
    busy.value = false;
    if (err) return void (error.value = err.message === "Invalid login credentials" ? "That email and password don't match." : err.message);
  }
  // a visitor who tried the demo first is switched over to their real account
  app.leaveDemo();
  // signing in worked; now load the workspace from the server, and say so if that fails instead of bouncing back here
  busy.value = true;
  const ok = await app.boot();
  busy.value = false;
  if (!ok) return void (error.value = `You're signed in, but the app couldn't load your workspace. Reason: ${await snapshotProblem()}`);
  await router.push("/home");
}

function tryDemo() {
  app.enterDemo();
  void router.push("/home");
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-6">
    <RouterLink to="/" class="mb-8 flex items-center gap-2.5">
      <Logo /> <span class="text-lg font-bold"><span class="text-who-a">S</span>Milestones</span>
    </RouterLink>
    <div class="w-full max-w-[420px]">
      <Card v-if="!cloudEnabled" class="p-8 text-center">
        <h1 class="text-xl font-semibold">Accounts aren't set up yet</h1>
        <p class="mt-2 text-muted">Add your Supabase keys to <code>.env.local</code> to enable sign-up. Meanwhile, the demo has everything.</p>
        <Button class="mt-6 w-full" @click="tryDemo">Try the demo</Button>
      </Card>

      <Card v-else class="p-8">
        <h1 class="font-serif text-3xl">{{ signup ? "Create your account" : "Welcome back" }}</h1>
        <p class="mt-1.5 text-muted">{{ signup ? "You'll pair with your partner right after." : "Sign in to your shared milestones." }}</p>
        <form class="mt-6 flex flex-col gap-4" @submit.prevent="submit">
          <Field v-if="signup" v-slot="{ id }" label="Your name">
            <input :id="id" v-model="name" :class="inputCls" autocomplete="name" />
          </Field>
          <Field v-slot="{ id }" label="Email">
            <input :id="id" v-model="email" type="email" required :class="inputCls" autocomplete="email" />
          </Field>
          <Field v-slot="{ id }" label="Password" :hint="signup ? 'At least 8 characters.' : undefined">
            <input :id="id" v-model="password" type="password" required :class="inputCls" :autocomplete="signup ? 'new-password' : 'current-password'" />
          </Field>
          <p v-if="error" class="text-sm text-bad">{{ error }}</p>
          <p v-if="info" class="text-sm text-ok">{{ info }}</p>
          <Button type="submit" :loading="busy" class="mt-1">{{ signup ? "Create account" : "Sign in" }}</Button>
        </form>
        <p class="mt-6 text-center text-sm text-muted">
          {{ signup ? "Already have an account?" : "New here?" }}
          <button type="button" class="cursor-pointer font-semibold text-terra hover:underline" @click="signup = !signup">{{ signup ? "Sign in" : "Create an account" }}</button>
        </p>
        <p class="mt-3 text-center text-sm text-muted">
          Just looking?
          <button type="button" class="cursor-pointer font-semibold text-terra hover:underline" @click="tryDemo">Try the demo</button>
        </p>
      </Card>
    </div>
  </div>
</template>
