<template>
  <div class="verse-scene">
    <KnightDataDialog ref="knightDataRef"></KnightDataDialog>
    <MetaDialog @selected="selected" ref="metaDialogRef"></MetaDialog>
    <!--<PrefabDialog @selected="selected" ref="prefabDialogRef"></PrefabDialog>-->
    <el-container>
      <el-main>
        <iframe id="editor" ref="editor" :src="src" class="content" height="100%" width="100%"></iframe>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { takePhoto } from '@/api/v1/verse'
import { useRoute, useRouter } from "vue-router";
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
//import PrefabDialog from "@/components/MrPP/PrefabDialog.vue";
import MetaDialog from "@/components/MrPP/MetaDialog.vue";
import KnightDataDialog from "@/components/MrPP/KnightDataDialog.vue";
import { putVerse, getVerse, VerseData } from "@/api/v1/verse";
import { getPrefab } from "@/api/v1/prefab";
import { useAppStore } from "@/store/modules/app";
import { useUserStore } from "@/store/modules/user";
import { translateRouteTitle } from "@/utils/i18n";
import env from "@/environment";
import { useFileStore } from "@/store/modules/config"

// 组件状态
const userStore = useUserStore();
const appStore = useAppStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const editor = ref<HTMLIFrameElement>();
import qs from "querystringify";
let init = false;
const saveable = ref(false);

// 对话框引用
const knightDataRef = ref<InstanceType<typeof KnightDataDialog>>();
//const prefabDialogRef = ref<InstanceType<typeof PrefabDialog>>();
const metaDialogRef = ref<InstanceType<typeof MetaDialog>>();

// 计算属性
const title = computed(() => {
  const match = (route.query.title as string)?.match(/【(.*?)】/);
  return match ? match[0] : "";
});

const id = computed(() => parseInt(route.query.id as string));

const src = computed(() => {
  const query: Record<string, any> = {
    language: appStore.language,
    timestamp: Date.now(),
    a1_api: env.a1
  };

  const url = `${env.editor}/three.js/editor/verse-editor.html` + qs.stringify(query, true);

  return url;
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
      role: userStore.getRole()
    });
  },
  { deep: true }
);
// 刷新场景数据
const refresh = async () => {
  const response = await getVerse(id.value, "metas, resources");
  const verse = response.data;
  saveable.value = verse ? verse.editable : false;

  postMessage("load", {
    id: id.value,
    data: verse,
    saveable: saveable.value,
    user: {
      id: userStore.userInfo?.id || null,
      //roles: userStore.userInfo?.roles || [],
      role: userStore.getRole()
    },
  });
};

// 向编辑器发送消息
const postMessage = (action: string, data: any) => {
  if (editor.value && editor.value.contentWindow) {
    editor.value.contentWindow.postMessage(
      {
        from: "scene.verse.web",
        action,
        data: JSON.parse(JSON.stringify(data)),
      },
      "*"
    );
  } else {
    ElMessage.error(t("verse.view.sceneEditor.error1"));
  }
};

// 设置预制件属性
const setupPrefab = async ({ meta_id, data, uuid }: any) => {
  const response = await getPrefab(meta_id);
  knightDataRef.value?.open({
    schema: JSON.parse(response.data.data!),
    data: JSON.parse(data),
    callback: (setup: any) => {
      postMessage("setup-module", { uuid, setup });
    },
  });
};

// 添加预制件
//const addPrefab = () => {
//  prefabDialogRef.value?.open(id.value);
//  ElMessage.info(t("verse.view.sceneEditor.info1"));
//};

// 添加实体
const addMeta = () => {
  metaDialogRef.value?.open(id.value);

};

// 选择元素后的回调
const selected = async ({ data, setup, title }: any) => {
  postMessage("add-module", { data, setup, title });
};

// 保存场景数据
const saveVerse = async (data: any) => {
  if (!data.verse) {
    return;
  }

  const verse = data.verse;

  if (!saveable.value) {
    ElMessage.info(t("verse.view.sceneEditor.info3"));
    return;
  }

  // 处理重复标题，确保标题唯一
  const retitleVerses = (verses: any[]) => {

    const titleCount: Record<string, number> = {};

    verses.forEach((verse) => {
      let title = verse.parameters.title;

      // 提取基础标题和计数
      const match = title.match(/^(.*?)(?: \((\d+)\))?$/);
      const baseTitle = match?.[1]?.trim() || title;
      const currentCount = match?.[2] ? parseInt(match[2], 10) : 0;

      if (!titleCount[baseTitle]) {
        titleCount[baseTitle] = currentCount > 0 ? currentCount : 1;
      } else {
        titleCount[baseTitle]++;
      }

      // 生成唯一标题
      const newCount = titleCount[baseTitle];
      verse.parameters.title =
        newCount > 1 ? `${baseTitle} (${newCount})` : baseTitle;
    });
  };

  if (verse?.children?.modules) {
    retitleVerses(verse.children.modules);
  }
  await putVerse(id.value, { data: verse });

  ElMessageBox.confirm(
    '保存成功，是否发布？',
    '发布场景',
    {
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      type: 'warning',
    }
  )
    .then(async () => {
      await takePhoto(id.value)
      ElMessage({
        type: 'success',
        message: '发布成功',
      })
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: '取消发布',
      })
    })
};

//发布场景
const releaseVerse = async (data: any) => {
  if (!data.verse) {

    ElMessage.error("没有可发布的项目");
    return;
  }

  if (!saveable.value) {
    ElMessage.info("没有发布权限");
    return;
  }

  try {
    await ElMessageBox.confirm(
      t("verse.page.list.releaseConfirm.message1"),
      t("verse.page.list.releaseConfirm.message2"),
      {
        confirmButtonText: t("verse.page.list.releaseConfirm.confirm"),
        cancelButtonText: t("verse.page.list.releaseConfirm.cancel"),
        type: "warning",
      }
    );

    await takePhoto(id.value);

    ElMessage.success(t("verse.page.list.releaseConfirm.success"));
  } catch {
    ElMessage.info(t("verse.page.list.releaseConfirm.info"));
  }
}

// 处理来自编辑器的消息
const handleMessage = async (e: MessageEvent) => {
  if (!e.data || !e.data.action) return;

  const action = e.data.action;
  const data = e.data.data;

  switch (action) {
    case "edit-meta":
      router.push({
        path: "/meta/scene",
        query: { id: data.meta_id },
      });
      break;

    case "setup-prefab":
      setupPrefab(data);
      break;

    case "add-meta":
      addMeta();
      break;

    //  case "add-prefab":
    //    addPrefab();
    //    break;

    case "save-verse":

      saveVerse(data);
      ElMessage.success("储存完成");

      break;

    case "release-verse":
      releaseVerse(data);
      break;

    case "save-verse-none":
      ElMessage.warning("项目没有改变");
      break;

    case "goto":
      if (data.target === "blockly.js") {
        const scriptRoute = router
          .getRoutes()
          .find((route) => route.path === "/verse/script");

        if (scriptRoute && scriptRoute.meta.title) {
          const metaTitle = translateRouteTitle(
            scriptRoute.meta.title
          ).toLowerCase();

          router.push({
            path: "/verse/script",
            query: {
              id: id.value,
              title: metaTitle + title.value,
            },
          });
        }
      }
      break;

    case "ready":
      if (!init) {
        init = true;
        refresh();
      }
      else {
        postMessage("user-info", {
          id: userStore.userInfo?.id || null,
          //roles: userStore.userInfo?.roles || [],
          role: userStore.getRole()
        });
      }
      break;

    case "upload-cover":
      handleUploadCover(data);
      break;
  }
};

// 处理上传封面图片
const handleUploadCover = async (data: any) => {
  try {
    if (!data || !data.imageData) {
      ElMessage.error(t("verse.view.sceneEditor.coverUploadError"));
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
    const fileName = `cover_verse_${id.value}_${Date.now()}.${extension}`;
    const file = new File([blob], fileName, { type: mimeType });

    // 处理文件上传
    const fileStore = useFileStore();
    const { postFile } = await import("@/api/v1/files");

    // 获取文件MD5和处理器
    const md5 = await fileStore.store.fileMD5(file);
    const handler = await fileStore.store.publicHandler();

    if (!handler) {
      ElMessage.error(t("verse.view.sceneEditor.handlerError"));
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
      // 更新Verse的image_id
      const verse = await getVerse(id.value);
      if (verse && verse.data) {
        verse.data.image_id = response.data.id;
        await putVerse(id.value, verse.data);
        ElMessage.success(t("verse.view.sceneEditor.coverUploadSuccess"));
        await refresh();
      }
    }
  } catch (error) {
    console.error("上传封面图片失败:", error);
    ElMessage.error(t("verse.view.sceneEditor.coverUploadFailed"));
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
