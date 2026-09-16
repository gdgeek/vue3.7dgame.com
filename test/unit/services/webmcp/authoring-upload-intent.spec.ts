/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic tool payloads and deliberately malformed mock inputs. */
import { describe, it, expect, vi } from "vitest";
import { reactive, ref, defineComponent, createApp } from "vue";
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
const mount = (component: Parameters<typeof createApp>[0]) => {
  const app = createApp(component);
  app.mount(document.createElement("div"));
  return app;
};
const state = vi.hoisted(() => ({
  route: {} as any,
  user: {} as any,
  replace: vi.fn(),
}));
vi.mock("vue-router", () => ({
  useRoute: () => state.route,
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("@/store/modules/user", () => ({ useUserStore: () => state.user }));
import { useWebMcpUploadIntent } from "@/composables/useWebMcpUploadIntent";
import {
  beginAuthoringUpload,
  authoringUploadStatus,
} from "@/services/webmcp/authoring-upload";
describe("upload dialog tracking lifecycle", () => {
  it.each(["close", "account"])(
    "does not attribute later manual uploads after %s",
    async (reason) => {
      const id = beginAuthoringUpload("3", "picture");
      state.route = reactive({
        path: "/resource/picture/index",
        query: { webmcpUpload: "1", webmcpUploadId: id },
        hash: "",
      });
      state.user = reactive({ userInfo: { id: 3 } });
      state.replace.mockResolvedValue(undefined);
      const open = ref(false);
      let track!: ReturnType<typeof useWebMcpUploadIntent>;
      const wrapper = mount(
        defineComponent({
          setup() {
            track = useWebMcpUploadIntent(
              () => {
                open.value = true;
              },
              () => open.value
            );
            return () => null;
          },
        })
      );
      await flushPromises();
      expect(open.value).toBe(true);
      await track(async () => ({ data: { id: 11 } }));
      expect(authoringUploadStatus(id, "3")).toMatchObject({
        completedResourceIds: [11],
      });
      if (reason === "close") open.value = false;
      else state.user.userInfo.id = 4;
      await track(async () => ({ data: { id: 12 } }));
      expect(authoringUploadStatus(id, "3")).toMatchObject({
        status: "closed",
        completedResourceIds: [11],
      });
      expect(state.replace).toHaveBeenCalledWith({
        path: "/resource/picture/index",
        query: {},
        hash: "",
      });
      wrapper.unmount();
    }
  );
});
