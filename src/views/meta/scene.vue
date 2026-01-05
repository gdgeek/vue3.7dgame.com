<template>
  <div class="verse-scene">
    <phototype-dialog @selected="selectedPhototype" ref="phototypeDialogRef"></phototype-dialog>
    <resource-dialog @selected="selected" :on-get-datas="getDatas" ref="dialog">
      <template #bar="{ item }">
        <div v-if="item.type === 'audio'" class="info-container">
          <audio id="audio" controls style="width: 100%; height: 30px" :src="item.context.file.url"
            @play="handleAudioPlay"></audio>
        </div>
      </template>
    </resource-dialog>
    <el-container>
      <el-main>
        <iframe ref="editor" id="editor" :src="src" class="content" height="100%" width="100%"></iframe>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import type { CardInfo, DataInput, DataOutput } from "@/utils/types";
import { getResources } from "@/api/v1/resources";
import { getPhototypes, PhototypeType } from "@/api/v1/phototype";

const currentPlayingAudio = ref<HTMLAudioElement | null>(null);

const handleAudioPlay = (event: Event) => {
  const audioElement = event.target as HTMLAudioElement;
  if (currentPlayingAudio.value && currentPlayingAudio.value !== audioElement) {
    currentPlayingAudio.value.pause();
  }
  currentPlayingAudio.value = audioElement;
};

const getDatas = (input: DataInput): Promise<DataOutput> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (input.type === "phototype") {
        const response = await getPhototypes(
          input.sorted,
          input.searched,
          input.current
        );

        console.error(response.data);
        // 处理响应数据，转换为 CardInfo 数组
        const items = response.data.map((item: any) => {
          return {
            id: item.id,
            context: item,
            type: "phototype",
            created_at: item.created_at,
            name: item.name ? item.name : item.title, // 使用name或title
            image: item.image ? { url: item.image.url } : null,
            enabled: true,
          } as CardInfo;
        });

        const pagination = {
          current: parseInt(response.headers["x-pagination-current-page"]),
          count: parseInt(response.headers["x-pagination-page-count"]),
          size: parseInt(response.headers["x-pagination-per-page"]),
          total: parseInt(response.headers["x-pagination-total-count"]),
        };
        resolve({ items, pagination });
      } else {
        const response = await getResources(
          input.type,
          input.sorted,
          input.searched,
          input.current,
          "image"
        );

        const items = response.data.map((item: any) => {
          let enabled: boolean = true;
          if (item.type === "polygen" && !item.image) {
            enabled = false;
          }
          return {
            id: item.id,
            context: item,
            type: item.type,
            created_at: item.created_at,
            name: item.name ? item.name : item.title, // 使用name或title
            image: item.image ? { url: item.image.url } : null,
            enabled,
          } as CardInfo;
        });

        const pagination = {
          current: parseInt(response.headers["x-pagination-current-page"]),
          count: parseInt(response.headers["x-pagination-page-count"]),
          size: parseInt(response.headers["x-pagination-per-page"]),
          total: parseInt(response.headers["x-pagination-total-count"]),
        };
        resolve({ items, pagination });
      }
    } catch (error) {
      console.error("获取数据失败", error);
      reject(error);
    }
  });
};
import { useRoute, useRouter } from "vue-router";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import PhototypeDialog from "@/components/MrPP/PhototypeDialog.vue";
import { putMeta, getMeta } from "@/api/v1/meta";
import { useAppStore } from "@/store/modules/app";
import { translateRouteTitle } from "@/utils/i18n";
import env from "@/environment";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { AbilityEdit } from "@/utils/ability";
import { useAbility } from "@casl/vue";
import { useUserStore } from "@/store/modules/user";
import { until } from "@vueuse/core";
import { da } from "element-plus/es/locale";

import qs from "querystringify";

// 组件状态
const appStore = useAppStore();
const route = useRoute();
const router = useRouter();
const fileStore = useFileStore();
const { t } = useI18n();
const dialog = ref();
const phototypeDialogRef = ref<InstanceType<typeof PhototypeDialog>>();
const editor = ref<HTMLIFrameElement | null>();
let init = false;
const ability = useAbility();
const userStore = useUserStore();

// 计算属性
const id = computed(() => parseInt(route.query.id as string));
const title = computed(() => route.query.title?.slice(4) as string);
const src = computed(() => {

  const query: Record<string, any> = {
    language: appStore.language,
    timestamp: Date.now(),
    api: env.api,
  };

  const url =
    `${env.editor}/three.js/editor/meta-editor.html` +
    qs.stringify(query, true);

  return url;
  //return `${env.editor}/three.js/editor/meta-editor.html?language=${appStore.language}&timestamp=${Date.now()}`;
});
// 监听语言变化
watch(
  () => appStore.language,
  async () => {
    await refresh();
  }
);

// 监听用户信息变化
watch(
  () => userStore.userInfo,
  () => {
    // 用户信息变化时，向编辑器发送最新用户信息
    postMessage("user-info", {
      id: userStore.userInfo?.id || null,
      //roles: userStore.userInfo?.roles || [],
      role: userStore.getRole(),
    });
  },
  { deep: true }
);

const selectedPhototype = async (
  phototype: PhototypeType,
  replace: boolean = false
) => {
  console.error(phototype.resource);
  phototypeDialogRef.value?.open(phototype.schema.root, (data: any) => {
    // const d = { ...data, id: phototype.id };
    postMessage("load-phototype", {
      data: {
        type: phototype.type,
        context: JSON.stringify(data),
      },
      type: "phototype",
      title: phototype.title,
    });
  });
};
// 资源操作相关函数
const selected = async (info: CardInfo, replace: boolean = false) => {
  if (info.type === "phototype") {
    console.error(info.context);
    selectedPhototype(info.context as PhototypeType, replace);
    return;
  }
  if (replace) {
    postMessage("replace-resource", info.context);
  } else {
    postMessage("load-resource", info.context);
  }
};

const loadResource = (data: any) => {
  dialog.value.open(null, id.value, data.type);
};

const replaceResource = (data: any) => {
  dialog.value.open(null, id.value, data.type, "replace");
};

// 权限检查
const saveable = (data: any) => {
  if (data === null) {
    return false;
  }
  return data.editable;
};

// 向编辑器发送消息
const postMessage = (action: string, data: any = {}) => {
  if (editor.value && editor.value.contentWindow) {
    editor.value.contentWindow.postMessage(
      {
        from: "scene.meta.web",
        action,
        data: JSON.parse(JSON.stringify(data)),
      },
      "*"
    );
  } else {
    ElMessage.error(t("meta.scene.error"));
  }
};

// 获取可用的资源类型
const getAvailableResourceTypes = () => {
  const resourceTypes = [
    "polygen",
    "picture",
    "video",
    "voxel",
    "audio",
    "particle",
    "phototype",
  ]; // 所有资源类型

  return resourceTypes.filter((type) =>
    ability.can("edit", new AbilityEdit(type))
  );
};

// 保存元数据
const saveMeta = async ({ meta, events }: { meta: any; events: any }) => {
  if (!saveable) {
    ElMessage.info(t("meta.scene.info"));
    return;
  }

  // 在上传前处理 meta 数据，确保 name 唯一
  const renameEntities = (entities: any[]) => {
    const nameCount: Record<string, number> = {};

    entities.forEach((entity) => {
      let name = entity.parameters.name;

      // 提取基础名称和当前计数
      const match = name.match(/^(.*?)(?: \((\d+)\))?$/);
      let baseName = match?.[1]?.trim() || name;
      let currentCount = match?.[2] ? parseInt(match[2], 10) : 0;

      if (!nameCount[baseName]) {
        nameCount[baseName] = currentCount > 0 ? currentCount : 1;
      } else {
        nameCount[baseName]++;
      }

      // 生成唯一名称
      const newCount = nameCount[baseName];
      entity.parameters.name =
        newCount > 1 ? `${baseName} (${newCount})` : baseName;
    });
  };

  // 调用重命名函数处理 meta.data.children.entities
  if (meta?.children?.entities) {
    renameEntities(meta.children.entities);
  }

  try {
    await putMeta(id.value, { data: meta, events });
    ElMessage.success(t("meta.scene.success"));
  } catch (error) {
    ElMessage.error(t("meta.scene.saveError"));
  }
};

// 处理上传封面图片
const handleUploadCover = async (data: any) => {
  try {
    if (!data || !data.imageData) {
      ElMessage.error(t("meta.scene.coverUploadError"));
      return;
    }

    // 将base64图片数据转换为Blob对象
    const imageData = data.imageData;
    const byteString = atob(imageData.split(",")[1]);
    const mimeType = imageData.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeType });
    const extension = mimeType.split("/")[1];
    const fileName = `cover_${id.value}_${Date.now()}.${extension}`;
    const file = new File([blob], fileName, { type: mimeType });

    // 获取文件MD5和处理器
    const md5 = await fileStore.store.fileMD5(file);
    const handler = await fileStore.store.publicHandler();

    if (!handler) {
      ElMessage.error(t("meta.scene.handlerError"));
      return;
    }

    // 检查文件是否已存在
    const has = await fileStore.store.fileHas(
      md5,
      extension,
      handler,
      "backup"
    );

    // 如果文件不存在，上传文件
    if (!has) {
      await fileStore.store.fileUpload(
        md5,
        extension,
        file,
        (p: any) => { },
        handler,
        "backup"
      );
    }

    // 保存图片信息到服务器
    const fileData = {
      md5,
      key: md5 + `.${extension}`,
      filename: fileName,
      url: fileStore.store.fileUrl(md5, extension, handler, "backup"),
    };

    const response = await postFile(fileData);

    if (response && response.data) {
      // 更新Meta的image_id
      const meta = await getMeta(id.value);
      if (meta && meta.data) {
        meta.data.image_id = response.data.id;
        await putMeta(id.value, meta.data);
        ElMessage.success(t("meta.scene.coverUploadSuccess"));
        await refresh();
      }
    }
  } catch (error) {
    console.error("上传封面图片失败:", error);
    ElMessage.error(t("meta.scene.coverUploadFailed"));
  }
};

// 处理编辑器发来的消息
const handleMessage = async (e: MessageEvent) => {
  if (!e.data || !e.data.action) {
    return;
  }

  const action = e.data.action;
  const data = e.data.data;

  switch (action) {
    case "save-meta":
      saveMeta(data);
      // ElMessage.success("储存完成");
      break;

    case "save-meta-none":
      ElMessage.warning("项目没有改变");
      break;

    case "load-resource":
      loadResource(data);
      break;

    case "replace-resource":
      replaceResource(data);
      break;

    case "goto":
      if (data.target === "blockly.js") {
        const scriptRoute = router
          .getRoutes()
          .find((route) => route.path === "/meta/script");

        if (scriptRoute && scriptRoute.meta.title) {
          const metaTitle = translateRouteTitle(
            scriptRoute.meta.title
          ).toLowerCase();

          router.push({
            path: "/meta/script",
            query: {
              id: id.value,
              title: metaTitle + title.value,
            },
          });
        }
      } else if (data.data === "rete.js") {
        router.push({
          path: "/meta/rete-meta",
          query: { id: id.value, title: title.value },
        });
      }
      break;

    case "get-available-resource-types":
      // 如果编辑器明确请求可用资源类型，就发送它们

      await until(() => userStore.userInfo != null).toBeTruthy();
      const availableTypes = getAvailableResourceTypes();

      postMessage("available-resource-types", availableTypes);
      break;

    case "ready":
      if (!init) {
        init = true;
        await refresh();
      } else {
        console.log("post user info to editor");
        postMessage("user-info", {
          id: userStore.userInfo?.id || null,
          //roles: userStore.userInfo?.roles || [],
          role: userStore.getRole(),
        });
      }
      break;

    case "upload-cover":
      handleUploadCover(data);
      break;
  }
};

// 刷新元数据
const refresh = async () => {
  try {
    const meta = await getMeta(id.value);
    const availableTypes = getAvailableResourceTypes();
    console.log(availableTypes);

    // 发送元数据和可用资源类型到编辑器
    postMessage("load", {
      data: meta.data,
      saveable: saveable(meta.data),
      availableResourceTypes: availableTypes,
      user: {
        id: userStore.userInfo?.id || null,
        //roles: userStore.userInfo?.roles || [],
        role: userStore.getRole(), // 获取用户角色
      },
      system: {
        a1: import.meta.env.VITE_APP_A1_API,
      },
    });
  } catch (error) {
    console.error(error);
  }
};
// 生命周期钩子
onMounted(() => {
  window.addEventListener("message", handleMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});
</script>

<style lang="scss" scoped>
.content {
  height: calc(100vh - 140px);
  border-style: solid;
  border-width: 1px;
}
</style>
