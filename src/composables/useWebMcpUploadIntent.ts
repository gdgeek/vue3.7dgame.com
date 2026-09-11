import { nextTick, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const QUERY_KEY = "webmcpUpload";

/**
 * Opens an existing resource page's real upload dialog when WebMCP routes a
 * user there. The query flag is consumed immediately so refresh does not open
 * the system file picker workflow again.
 */
export const useWebMcpUploadIntent = (openUploadDialog: () => void) => {
  const route = useRoute();
  const router = useRouter();

  onMounted(async () => {
    if (route.query[QUERY_KEY] !== "1") return;

    await nextTick();
    openUploadDialog();

    const query = { ...route.query };
    delete query[QUERY_KEY];
    await router.replace({ path: route.path, query, hash: route.hash });
  });
};
