<template>
  <div class="verse-scene">
    <resource-dialog @selected="selected" @replaced="replaced" ref="dialog"></resource-dialog>
    <el-container>
      <el-main>
        <iframe ref="editor" id="editor" :src="src" class="content" height="100%" width="100%"></iframe>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import { putMeta, getMeta } from "@/api/v1/meta";
import { useAppStore } from "@/store/modules/app";
import { translateRouteTitle } from "@/utils/i18n";
import env from "@/environment"
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { AbilityRouter } from "@/utils/ability";
import { useAbility } from "@casl/vue";
import { useUserStore } from "@/store/modules/user";

// 组件状态
const appStore = useAppStore();
const route = useRoute();
const router = useRouter();
const fileStore = useFileStore();
const { t } = useI18n();
const dialog = ref();
const editor = ref<HTMLIFrameElement | null>();
let init = false;
const ability = useAbility();
const userStore = useUserStore();

// 计算属性
const id = computed(() => parseInt(route.query.id as string));
const title = computed(() => route.query.title?.slice(4) as string);
const src = computed(() => {
  return `${env.editor}/three.js/editor/meta-editor.html?language=${appStore.language}&timestamp=${Date.now()}`;
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
      roles: userStore.userInfo?.roles || [],
      role: userStore.getRole()
    });
  },
  { deep: true }
);

// 资源操作相关函数
const selected = (data: any) => {
  postMessage("load-resource", data);
};

const replaced = (data: any) => {
  postMessage("replace-resource", data);
};

const loadResource = (data: any) => {
  dialog.value.open(null, id.value, data.type);
};

const replaceResource = (data: any) => {
  dialog.value.open(null, id.value, data.type, 'replace');
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
  const resourceTypes = ['polygen', 'picture', 'video', 'voxel', 'audio', 'particle']; // 所有资源类型
  const availableTypes: string[] = [];

  const routes = router.getRoutes();
  const resourceRoute = routes.find((r) => r.path === '/resource');

  if (resourceRoute && resourceRoute.children) {
    resourceRoute.children.forEach((child) => {
      // 从路径中提取资源类型名称
      const typeName = child.path.split('/').pop();

      if (typeName && resourceTypes.includes(typeName)) {
        // 检查该路由是否被禁用 (private: true)
        const isPrivate = child.meta?.private === true;

        // 使用 ability 检查用户是否有权限访问该资源类型
        // 使用 AbilityRouter 来检查用户是否有权限打开该资源类型对应的路由
        const resourcePath = `/resource/${typeName}`;
        const hasPermission = ability.can('open', new AbilityRouter(resourcePath));

        // 只有当资源类型不是私有的且用户有权限时才添加到可用类型列表
        if (!isPrivate && hasPermission) {
          availableTypes.push(typeName);
        }
      }
    });
  }

  return availableTypes;
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
        roles: userStore.userInfo?.roles || [],
        role: userStore.getRole() // 获取用户角色
      }
    });
  } catch (error) {
    console.error(error);
  }
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
    const byteString = atob(imageData.split(',')[1]);
    const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeType });
    const extension = mimeType.split('/')[1];
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
    const has = await fileStore.store.fileHas(md5, extension, handler, "backup");

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
      ElMessage.success("储存完成");
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
      const availableTypes = getAvailableResourceTypes();
      postMessage("available-resource-types", availableTypes);
      break;

    case "ready":
      if (!init) {
        init = true;
        refresh();
      } else {
        postMessage("user-info", {
          id: userStore.userInfo?.id || null,
          roles: userStore.userInfo?.roles || [],
          role: userStore.getRole()
        });
      }
      break;

    case "upload-cover":
      handleUploadCover(data);
      break;
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
