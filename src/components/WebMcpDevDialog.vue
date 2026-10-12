<template>
  <el-dialog
    v-model="visible"
    :title="webMcpDevLabel(locale)"
    width="min(520px, 92vw)"
    append-to-body
    destroy-on-close
  >
    <div class="webmcp-connection">
      <p>{{ copy.intro }}</p>
      <p role="status" aria-live="polite">
        {{ copy.status }}{{ copy.states[state.status] }} · {{ copy.tools
        }}{{ toolCount }}
      </p>
      <p v-if="error || state.error" class="connection-error" role="alert">
        {{ error || state.error }}
      </p>
      <form v-if="state.status !== 'connected'" @submit.prevent="connect">
        <label for="webmcp-registration-token">{{ copy.token }}</label>
        <el-input
          id="webmcp-registration-token"
          v-model="token"
          type="password"
          autocomplete="off"
          :disabled="busy"
          :placeholder="copy.placeholder"
        ></el-input>
        <p class="connection-help">{{ copy.help }}</p>
        <div class="connection-actions">
          <el-button
            type="primary"
            native-type="submit"
            :disabled="busy || !token.trim()"
            :loading="busy"
            >{{ copy.connect }}</el-button
          >
          <el-button
            v-if="state.canReconnect"
            :disabled="busy"
            @click="reconnect"
            >{{ copy.reconnect }}</el-button
          >
          <el-button v-if="busy" @click="disconnect">{{
            copy.cancel
          }}</el-button>
        </div>
      </form>
      <div v-else class="connection-actions">
        <el-button @click="disconnect">{{ copy.disconnect }}</el-button>
      </div>
      <p v-if="toolCount === 0" class="connection-help">{{ copy.empty }}</p>
      <p class="connection-help">{{ copy.confirmation }}</p>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getWebMcpDevConnection } from "@/services/webmcp/dev-connection";
import { webMcpDevLabel } from "@/services/webmcp/dev-feature";

const visible = defineModel<boolean>({ required: true });
const { locale } = useI18n();
const connection = getWebMcpDevConnection();
const { state, toolCount } = connection;
const token = ref("");
const error = ref("");
const busy = computed(() => state.value.status === "connecting");
const copy = computed(() =>
  locale.value.startsWith("zh")
    ? {
        intro: "连接桌面 AI 客户端，使用当前页面的场景与脚本工具。",
        status: "状态：",
        tools: "当前工具：",
        states: {
          disconnected: "未连接",
          connecting: "连接中",
          connected: "已连接",
          error: "连接失败",
        },
        token: "连接令牌",
        placeholder: "粘贴本机 WebMCP 生成的一次性令牌",
        help: "先在 WorkBuddy 中启用 WebMCP 连接器，并让它生成连接令牌。刷新页面后需要重新配对。",
        connect: "连接",
        reconnect: "重新连接",
        disconnect: "断开连接",
        cancel: "取消连接",
        empty:
          "当前页面没有可用工具，请打开场景、实体或脚本编辑器。登录身份变更后，请重新载入编辑页。",
        confirmation:
          "修改仍需在页面确认。断开连接不会撤回已提交的保存，请通过操作回执确认结果。",
        failed: "连接失败，请检查本机桥接后重试。",
      }
    : {
        intro:
          "Connect a desktop AI client to the scene and script tools on this page.",
        status: "Status: ",
        tools: "Current tools: ",
        states: {
          disconnected: "Disconnected",
          connecting: "Connecting",
          connected: "Connected",
          error: "Connection failed",
        },
        token: "Connection token",
        placeholder: "Paste a single-use token from your local WebMCP bridge",
        help: "Enable the WebMCP connector in WorkBuddy and ask it to generate a connection token. Pair again after reloading this page.",
        connect: "Connect",
        reconnect: "Reconnect",
        disconnect: "Disconnect",
        cancel: "Cancel connection",
        empty:
          "No tools on this page. Open a scene, entity or script editor. Reload the editor after changing your signed-in identity.",
        confirmation:
          "Changes still require confirmation on this page. Disconnecting does not undo submitted saves; check the operation receipt for the result.",
        failed: "Connection failed. Check the local bridge and try again.",
      }
);

async function attempt(action: () => Promise<void>) {
  error.value = "";
  try {
    await action();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : copy.value.failed;
  }
}
function connect() {
  const registrationToken = token.value.trim();
  token.value = "";
  return attempt(() => connection.connect(registrationToken));
}
function reconnect() {
  return attempt(() => connection.reconnect());
}
function disconnect() {
  token.value = "";
  error.value = "";
  connection.disconnect();
}
</script>

<style scoped>
.webmcp-connection {
  display: grid;
  gap: 14px;
}
.webmcp-connection p {
  margin: 0;
}
.webmcp-connection form {
  display: grid;
  gap: 10px;
}
.connection-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.connection-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
.connection-help {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}
.connection-error {
  color: var(--el-color-danger);
}
</style>
