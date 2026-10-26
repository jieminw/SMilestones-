import { createRouter, createWebHistory } from "vue-router";
import { useApp } from "@/stores/app";
import { supabase } from "@/lib/supabase";
import { cloudEnabled } from "@/lib/config";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to) => (to.hash ? { el: to.hash, behavior: "smooth" } : { top: 0 }),
  routes: [
    { path: "/", component: () => import("@/views/LandingView.vue") },
    { path: "/login", component: () => import("@/views/LoginView.vue") },
    {
      // Email-confirmation links land here; supabase-js turns the URL into a session.
      path: "/auth/callback",
      beforeEnter: async () => {
        if (cloudEnabled) await supabase().auth.getSession();
        return "/home";
      },
      component: () => import("@/views/LandingView.vue"),
    },
    {
      path: "/",
      component: () => import("@/layouts/AppShell.vue"),
      meta: { app: true },
      children: [
        { path: "home", component: () => import("@/views/HomeView.vue") },
        { path: "navigator", component: () => import("@/views/NavigatorView.vue") },
        { path: "timeline", component: () => import("@/views/TimelineView.vue") },
        { path: "wedding", component: () => import("@/views/WeddingView.vue") },
        { path: "renovation", component: () => import("@/views/RenovationView.vue") },
        { path: "wallet", component: () => import("@/views/WalletView.vue") },
        { path: "pet", component: () => import("@/views/PetView.vue") },
        { path: "inbox", component: () => import("@/views/InboxView.vue") },
        { path: "settings", component: () => import("@/views/SettingsView.vue") },
        { path: "pots/new", component: () => import("@/views/NewPotView.vue") },
        { path: "pots/:id", component: () => import("@/views/PotView.vue"), props: true },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

/** Everything inside the shell needs either the demo or a signed-in session. */
router.beforeEach(async (to) => {
  if (!to.matched.some((r) => r.meta.app)) return true;
  const ok = await useApp().boot();
  return ok ? true : "/login";
});

export default router;
