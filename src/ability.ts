import { defineAbility } from "@casl/ability";
import { createApp } from "vue";
import App from "./App.vue";
import { abilitiesPlugin } from "@casl/vue";
import { UpdateAbility } from "@/ability/ability";

// 定义权限
const ability = defineAbility((can, cannot) => {
  // 在这里定义权限
});

// 更新权限
UpdateAbility(ability, [], -1);

// 创建 Vue 应用实例
const app = createApp(App);

// 使用 CASL 插件
app.use(abilitiesPlugin, ability, {
  useGlobalProperties: true,
});

export default ability;
