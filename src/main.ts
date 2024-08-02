import { createApp } from "vue";
import App from "./App.vue";
import setupPlugins from "@/plugins";
import "vue-cropper/dist/index.css";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import ability from "./ability";
import VueIframe from "vue-iframes";

library.add(fas);

// 本地SVG图标
import "virtual:svg-icons-register";

// 样式
import "element-plus/theme-chalk/dark/css-vars.css";
import "@/styles/index.scss";
import "uno.css";
import "animate.css";

const app = createApp(App);
app.component("FontAwesomeIcon", FontAwesomeIcon);
app.use(setupPlugins);
// app.use(ability);
app.use(VueIframe);
app.mount("#app");
