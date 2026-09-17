import {
  createAuthoringObject,
  getAuthoringCreation,
} from "@/api/v1/authoring-create";
import { createAdvancedAuthoringTools } from "./authoringAdvancedTools";
import { onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAbility } from "@casl/vue";
import { useUserStore } from "@/store/modules/user";
import authClient from "@/services/auth/authClient";
import { AbilityRouter, AbilityEdit } from "@/utils/ability";
import { MessageBox } from "@/components/Dialog";
import { getMeta, getMetas, putMeta } from "@/api/v1/meta";
import { getVerse, getVerses, putVerse } from "@/api/v1/verse";
import { getResource, getResources } from "@/api/v1/resources";
import type { ResourceInfo } from "@/api/v1/resources/model";
import {
  getWriteReceipt,
  validRevision,
  type WriteReceipt,
} from "@/api/v1/write-protocol";
import {
  registerWebMcpTools,
  getRegisteredWebMcpTools,
} from "@/services/webmcp/model-context";
import {
  createAuthoringTools,
  ASSET_TYPES,
  type ObjectKind,
  type AuthoringObject,
  type AuthoringAsset,
} from "@/services/webmcp/authoring-tools";
import { WORKFLOW_GUIDE_INDEX_PATH } from "@/services/webmcp/workflow-guide-catalog";
import {
  beginAuthoringUpload,
  authoringUploadStatus,
  setAuthoringUploadState,
} from "@/services/webmcp/authoring-upload";

const objectPath = (kind: ObjectKind) =>
  kind === "entity" ? "/meta/scene" : "/verse/scene";
const listPath = (kind: ObjectKind) =>
  kind === "entity" ? "/meta/list" : "/verse/index";
const idOrNull = (id: unknown) =>
  typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
export const authoringObject = (
  kind: ObjectKind,
  data: {
    id: number;
    uuid?: string;
    title?: string;
    name?: string;
    editable?: boolean;
    image_id?: number | null;
    image?: { id?: number } | null;
    serverRevision?: string;
  }
): AuthoringObject => ({
  id: data.id,
  uuid: data.uuid,
  kind,
  name: String(data.title ?? data.name ?? "").slice(0, 200),
  editable: data.editable === true,
  imageId: idOrNull(
    data.image_id === undefined ? data.image?.id : data.image_id
  ),
  serverRevision: data.serverRevision,
});
export const authoringAsset = (data: ResourceInfo): AuthoringAsset => {
  if (!ASSET_TYPES.includes(data.type as AuthoringAsset["type"]))
    throw new Error("未知素材类型");
  let metadata: unknown = null;
  // Stored metadata is untrusted, size bounded and not a claim of live inspection.
  if (typeof data.info === "string" && data.info.length <= 8192) {
    try {
      metadata = JSON.parse(data.info);
    } catch {
      metadata = data.info;
    }
  }
  const animationValues =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>).animations
      : undefined;
  const animationNames = Array.isArray(animationValues)
    ? animationValues
        .slice(0, 100)
        .map((value) =>
          typeof value === "string"
            ? value
            : value && typeof value === "object"
              ? (value as Record<string, unknown>).name
              : null
        )
        .filter(
          (name): name is string =>
            typeof name === "string" && name.length <= 200
        )
    : [];
  return {
    animationNames,
    animationSource: Array.isArray(animationValues)
      ? "stored_metadata"
      : "unknown",
    id: data.id,
    type: data.type as AuthoringAsset["type"],
    name: String(data.name ?? "").slice(0, 200),
    imageId: idOrNull(
      data.image_id === undefined ? data.image?.id : data.image_id
    ),
    fileId: idOrNull(data.file?.id),
    mimeType: data.file?.type ?? null,
    size: typeof data.file?.size === "number" ? data.file.size : null,
    metadata,
  };
};
const validateReceipt = (
  receipt: WriteReceipt,
  kind: ObjectKind,
  id: number,
  operationId: string
) => {
  if (
    receipt?.targetType !== (kind === "entity" ? "meta" : "verse") ||
    receipt.targetId !== id ||
    receipt.operationId !== operationId ||
    receipt.status !== "completed" ||
    receipt.action !== "save" ||
    !validRevision(receipt.serverRevision)
  )
    throw new Error("未取得匹配的封面保存回执");
  return receipt;
};

export function useAuthoringWebMcp() {
  const route = useRoute();
  const router = useRouter();
  const ability = useAbility();
  const user = useUserStore();
  const actor = () =>
    authClient.getAccessToken() && user.userInfo?.id
      ? String(user.userInfo.id)
      : null;
  let generation = 0;
  watch(
    [() => route.fullPath, () => user.userInfo?.id],
    () => {
      generation++;
    },
    { flush: "sync" }
  );
  const context = () => `${generation}:${route.fullPath}`;
  let lifecycle: AbortController | null = null;
  let storage: Storage | undefined;
  try {
    storage = window.sessionStorage;
  } catch {
    /* Memory-only operation status. */
  }
  const confirm = async (message: string) => {
    try {
      await MessageBox.confirm(message, "WebMCP 创作确认", {
        confirmButtonText: "确认",
        cancelButtonText: "取消",
      });
      return true;
    } catch {
      return false;
    }
  };
  const tools = createAuthoringTools({
    actor,
    context,
    storage,
    canCreate: (kind) =>
      ability.can("user", "all") &&
      ability.can("goto", new AbilityRouter(listPath(kind))),
    canUpload: (type) =>
      ability.can("edit", new AbilityEdit(type)) &&
      ability.can("goto", new AbilityRouter(`/resource/${type}/index`)),
    capabilities: () => ({
      route: route.path,
      guideIndexUrl: `${import.meta.env.BASE_URL}${WORKFLOW_GUIDE_INDEX_PATH}`,
      tools: getRegisteredWebMcpTools(),
      objectAuthorization: "server_checked_per_request",
    }),
    async search(kind, query, page, pageSize) {
      if (kind === "entity")
        return (
          await getMetas("-created_at", query, page, "image", "", pageSize)
        ).data.map((item) => authoringObject(kind, item));
      return (
        await getVerses({
          sort: "-created_at",
          search: query,
          page,
          perPage: pageSize,
          expand: "image",
        })
      ).data.map((item) => authoringObject(kind, item));
    },
    async read(kind, id) {
      const data =
        kind === "entity"
          ? (await getMeta(id, { expand: "image" })).data
          : (await getVerse(id, "image")).data;
      if (data.id !== id) throw new Error("对象响应 ID 不匹配");
      return authoringObject(kind, data);
    },
    async asset(type, id) {
      const data = (await getResource(type, id, "image,file")).data;
      if (data.id !== id || data.type !== type)
        throw new Error("素材类型或 ID 不匹配");
      return authoringAsset(data);
    },
    async searchAssets(type, query, page, pageSize) {
      return (
        await getResources(
          type,
          "-created_at",
          query,
          page,
          "image,file",
          pageSize
        )
      ).data
        .filter((item) => item.type === type)
        .map((item) => ({ ...authoringAsset(item), metadata: null }));
    },
    creationReceipt: getAuthoringCreation,
    async create(draft) {
      const data = await createAuthoringObject(
        draft.kind,
        draft.operationId,
        draft.kind === "entity"
          ? {
              title: draft.name,
              info: draft.description,
              uuid: draft.uuid,
              image_id: draft.imageId,
            }
          : {
              name: draft.name,
              description: draft.description,
              uuid: draft.uuid,
              image_id: draft.imageId,
            }
      );
      return { id: data.id, uuid: data.uuid, receipt: data.writeReceipt };
    },
    async cover(draft) {
      let receipt: WriteReceipt | undefined;
      const options = {
        operationId: draft.operationId,
        expectedRevision: draft.revision,
        onAcknowledged: (value: WriteReceipt) => {
          receipt = value;
        },
      };
      if (draft.kind === "entity")
        await putMeta(draft.id, { image_id: draft.imageId }, options);
      else await putVerse(draft.id, { image_id: draft.imageId }, options);
      if (!receipt) throw new Error("保存响应无回执");
      return validateReceipt(receipt, draft.kind, draft.id, draft.operationId);
    },
    async receipt(kind, id, operationId) {
      const data = (
        await getWriteReceipt(
          kind === "entity" ? "meta" : "verse",
          id,
          operationId
        )
      ).data;
      return validateReceipt(data, kind, id, operationId);
    },
    async open(kind, id) {
      const path = objectPath(kind);
      if (!ability.can("goto", new AbilityRouter(path))) return false;
      await router.push({
        path,
        query: {
          id: String(id),
          lang: route.query.lang,
          theme: route.query.theme,
        },
      });
      return route.path === path && String(route.query.id) === String(id);
    },
    async startUpload(type) {
      const owner = actor();
      const initial = context();
      if (!owner) return { opened: false };
      const path = `/resource/${type}/index`;
      // Existing upload composables mount once. Avoid claiming a session in a reused page.
      if (route.path === path)
        return {
          opened: false,
          reason: "already_on_upload_page",
          nextStep: "请使用当前页面上传按钮，或先切换页面再启动可跟踪上传。",
        };
      const uploadId = beginAuthoringUpload(owner, type);
      setAuthoringUploadState(uploadId, owner, "awaiting_confirmation");
      // Return the ID before showing confirmation so native callers can poll without timing out.
      void (async () => {
        try {
          if (
            !(await confirm(
              "打开素材上传页面，请选择本地文件。离开当前页仍受未保存提示保护。"
            )) ||
            context() !== initial ||
            actor() !== owner
          ) {
            setAuthoringUploadState(uploadId, owner, "not_opened");
            return;
          }
          setAuthoringUploadState(uploadId, owner, "opening");
          await router.push({
            path,
            query: {
              webmcpUpload: "1",
              webmcpUploadId: uploadId,
              lang: route.query.lang,
              theme: route.query.theme,
            },
          });
          if (route.path !== path || actor() !== owner)
            setAuthoringUploadState(uploadId, owner, "not_opened");
        } catch {
          setAuthoringUploadState(uploadId, owner, "not_opened");
        }
      })();
      return {
        status: "awaiting_confirmation",
        opened: false,
        uploadId,
        uploaded: false,
      };
    },
    uploadStatus: (id) => authoringUploadStatus(id, actor()),
    confirm,
  });
  const advanced = createAdvancedAuthoringTools({
    actor,
    context,
    confirm,
    canCreate: (kind) =>
      ability.can("user", "all") &&
      ability.can("goto", new AbilityRouter(listPath(kind))),
    getTarget: () => {
      const kind = ["/meta/scene", "/meta/script"].includes(route.path)
        ? "entity"
        : ["/verse/scene", "/verse/script"].includes(route.path)
          ? "scene"
          : null;
      const id = Number(route.query.id);
      return kind && Number.isSafeInteger(id) && id > 0 ? { kind, id } : null;
    },
  });
  onMounted(() => {
    lifecycle = registerWebMcpTools([...tools, ...advanced]);
  });
  onBeforeUnmount(() => {
    generation++;
    lifecycle?.abort();
  });
}
