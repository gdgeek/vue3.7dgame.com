import { computed, effectScope, shallowRef, watch } from "vue";
import authClient from "@/services/auth/authClient";
import { useUserStore } from "@/store/modules/user";
import { onWebMcpDevIdentityRevoked, webMcpDevEnabled } from "./dev-feature";
import { createWebMcpDevSession } from "./dev-session";
import { getWebMcpToolRegistry } from "./tool-registry";

function createConnection() {
  if (!webMcpDevEnabled) throw new Error("AI 工具连接尚未启用。");
  const registry = getWebMcpToolRegistry();
  if (!registry) throw new Error("AI 工具连接需要浏览器页面。");
  const userStore = useUserStore();
  const identity = () => {
    const id = userStore.userInfo?.id;
    return id && authClient.getAccessToken()
      ? `${authClient.provider}:${id}`
      : null;
  };
  const session = createWebMcpDevSession({
    registry,
    getIdentity: identity,
    subscribeIdentity(listener) {
      // Detached from the dialog's effect scope: closing it must not stop auth checks.
      const stopUser = watch(
        () => userStore.userInfo?.id,
        () => listener(),
        { flush: "sync" }
      );
      const stopToken = authClient.onTokenChanged((token, context) => {
        listener(!token || context.reason !== "refresh");
      });
      return () => {
        stopUser();
        stopToken();
      };
    },
  });
  const state = shallowRef(session.getState());
  const snapshot = shallowRef(registry.snapshot());
  const stopState = session.subscribe((value) => (state.value = value));
  const stopTools = registry.subscribe(
    () => (snapshot.value = registry.snapshot())
  );
  const stopRevoked = onWebMcpDevIdentityRevoked(session.revokeIdentity);
  return {
    state,
    toolCount: computed(() => snapshot.value.tools.length),
    connect: session.connect,
    reconnect: session.reconnect,
    disconnect: session.disconnect,
    dispose() {
      stopRevoked();
      stopState();
      stopTools();
      session.dispose();
    },
  };
}

let connection: ReturnType<typeof createConnection> | undefined;
export function getWebMcpDevConnection() {
  if (!connection) {
    const scope = effectScope(true);
    try {
      const created = scope.run(createConnection)!;
      connection = {
        ...created,
        dispose() {
          created.dispose();
          scope.stop();
        },
      };
    } catch (error) {
      scope.stop();
      throw error;
    }
  }
  return connection;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    connection?.dispose();
    connection = undefined;
  });
}
