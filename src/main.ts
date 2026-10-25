import { createApp } from "vue";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/fraunces";
import "./assets/main.css";
import App from "./App.vue";
import router from "./router";
import { reveal } from "./directives/reveal";

createApp(App).use(router).directive("reveal", reveal).mount("#app");
