import { nextTick, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useUserStore } from "@/store/modules/user";
import {
  claimAuthoringUpload,
  setAuthoringUploadState,
  trackAuthoringUpload,
} from "@/services/webmcp/authoring-upload";

const QUERY_KEY = "webmcpUpload";

/**
 * Opens an existing resource page's real upload dialog when WebMCP routes a
 * user there. The query flag is consumed immediately so refresh does not open
 * the system file picker workflow again.
 */
export const useWebMcpUploadIntent = (
  openUploadDialog: () => void,
  isDialogOpen?: () => boolean
) => {
  const route = useRoute();
  const router = useRouter();

  const user = useUserStore();
  const actor = () => (user.userInfo?.id ? String(user.userInfo.id) : null);
  let uploadId: string | null = null;
  let owner: string | null = null;
  let disposed = false;
  const closeTracking = () => {
    if (uploadId) setAuthoringUploadState(uploadId, owner, "closed");
    uploadId = null;
  };
  if (isDialogOpen)
    watch(
      isDialogOpen,
      (open) => {
        if (!open) closeTracking();
      },
      { flush: "sync" }
    );
  watch(() => user.userInfo?.id, closeTracking, { flush: "sync" });
  onBeforeUnmount(() => {
    disposed = true;
    if (uploadId) setAuthoringUploadState(uploadId, owner, "closed");
    uploadId = null;
  });

  onMounted(async () => {
    if (route.query[QUERY_KEY] !== "1") return;

    await nextTick();
    if (disposed) return;
    const requested = route.query.webmcpUploadId;
    const type = route.path.split("/")[2];
    owner = actor();
    if (
      typeof requested === "string" &&
      claimAuthoringUpload(requested, owner, type)
    )
      uploadId = requested;
    openUploadDialog();

    const query = { ...route.query };
    delete query[QUERY_KEY];
    delete query.webmcpUploadId;
    await router.replace({ path: route.path, query, hash: route.hash });
  });
  return <T extends { data: { id?: number } }>(task: () => Promise<T>) =>
    trackAuthoringUpload(uploadId, actor(), task);
};
