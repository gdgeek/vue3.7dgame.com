<template>
  <TransitionWrapper>
    <div class="document-index">
      <el-row :gutter="20" style="margin: 28px 18px 0">
        <el-col :sm="16">
          <el-card class="box-card">
            <template #header>
              <b id="title">{{ t("video.view.title") }}</b>
              <span v-if="videoData">{{ videoData.name }}</span>
            </template>
            <div class="box-item" style="text-align: center">
              <video id="video" controls="true" style="height: 300px; width: auto">
                <source v-if="file !== null" id="src" :src="file" />
              </video>
              <video id="new_video" style="height: 100%; width: auto" hidden @canplaythrough="dealWith"></video>
            </div>
          </el-card>
          <br />
        </el-col>
        <el-col :sm="8">
          <el-card class="box-card">
            <template #header>
              <b>{{ $t("video.view.info.title") }}</b>:
            </template>
            <div class="box-item">
              <el-table :data="tableData" stripe>
                <el-table-column prop="item" :label="$t('video.view.info.label1')"></el-table-column>
                <el-table-column prop="text" :label="$t('video.view.info.label2')"></el-table-column>
              </el-table>
              <aside style="margin-top: 10px; margin-bottom: 30px">
                <el-button-group style="float: right">
                  <el-button type="success" size="small" @click="namedWindow">
                    <i class="el-icon-edit"></i>
                    {{ $t("video.view.info.name") }}
                  </el-button>
                  <el-button type="danger" size="small" @click="deleteWindow">
                    <i class="el-icon-delete"></i>
                    {{ $t("video.view.info.delete") }}
                  </el-button>
                </el-button-group>
              </aside>
            </div>
          </el-card>
          <br />
        </el-col>
      </el-row>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { getVideo, putVideo, deleteVideo } from "@/api/v1/resources/index";
import { postFile } from "@/api/v1/files";
import { UploadFileType } from "@/api/user/model";
import { printVector2 } from "@/assets/js/helper";
import { useFileStore } from "@/store/modules/config";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const route = useRoute();
const router = useRouter();
const store = useFileStore().store;

const videoData = ref<ResourceInfo | null>(null);
const file = ref<string | null>(null);
const expire = ref(true);

const { t } = useI18n();

const id = computed(() => route.query.id as string);
const prepare = computed(
  () => videoData.value !== null && videoData.value.info !== null
);

onMounted(async () => {
  expire.value = true;
  const response = await getVideo(id.value);
  console.log("video:", response.data);
  videoData.value = response.data;
  file.value = response.data.file.url;
  setTimeout(() => {
    init();
  }, 0);
});

const tableData = computed(() => {
  if (videoData.value && prepare.value) {
    return [
      {
        item: t("video.view.info.item1"),
        text: videoData.value.name,
      },
      {
        item: t("video.view.info.item2"),
        text: videoData.value.author?.username,
      },
      {
        item: t("video.view.info.item3"),
        text: convertToLocalTime(videoData.value.created_at),
      },
      {
        item: t("video.view.info.item4"),
        text: formatFileSize(videoData.value.file.size),
      },
      {
        item: t("video.view.info.item5"),
        text: printVector2(JSON.parse(videoData.value.info).size),
      },
    ];
  } else {
    return [];
  }
});
console.log("tableData", tableData);

const init = () => {
  const video = document.getElementById("video") as HTMLVideoElement;
  const source = document.getElementById("src") as HTMLSourceElement;

  const new_video = document.getElementById("new_video") as HTMLVideoElement;
  new_video.src = source.src + "?t=" + new Date();
  new_video.crossOrigin = "anonymous";
  new_video.currentTime = 0.000001;
  video.addEventListener(
    "timeupdate",
    () => {
      new_video.currentTime = video.currentTime;
    },
    false
  );
};

const save = async (
  md5: string,
  extension: string,
  info: string,
  file: File,
  handler: any
) => {

  extension = extension.startsWith(".") ? extension : `.${extension}`;
  const data: UploadFileType = {
    md5,
    key: md5 + extension,
    filename: file.name,
    url: store.fileUrl(md5, extension, handler, "screenshot/video"),
  };
  try {
    const response1 = await postFile(data);
    const video = { image_id: response1.data.id, info };
    const response2 = await putVideo(videoData.value!.id, video);

    videoData.value!.image_id = response2.data.image_id;
    videoData.value!.info = response2.data.info;
    expire.value = false;
  } catch (e) {
    console.error(e);
  }
};

const dealWith = () => {
  if (!prepare.value) {
    const video = document.getElementById("video") as HTMLVideoElement;
    const new_video = document.getElementById("new_video") as HTMLVideoElement;
    const size = { x: video.videoWidth, y: video.videoHeight };
    setup(new_video, size);
  } else {
    expire.value = false;
  }
};

const thumbnail = (
  video: HTMLVideoElement,
  width: number,
  height: number
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const imageType = "image/jpeg";
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "thumbnail.jpg", {
            type: imageType,
            lastModified: new Date().getTime(),
          });
          resolve(file);
        } else {
          console.error("Failed to create blob");
          reject("Failed to create blob");
        }
      }, imageType);
    }
  });
};

const setup = async (
  video: HTMLVideoElement,
  size: { x: number; y: number }
) => {
  if (size.x !== 0) {
    const info = JSON.stringify({ size });

    // const blob = await thumbnail(video, size.x * 0.5, size.y * 0.5);
    // blob.name = data.value.name + ".thumbnail";
    // blob.extension = ".jpg";
    const file = await thumbnail(video, size.x * 0.5, size.y * 0.5);

    const md5 = await store.fileMD5(file);

    const handler = await store.publicHandler();
    const has = await store.fileHas(
      md5,
      file.type.split("/").pop()!,
      handler,
      "screenshot/video"
    );
    if (!has) {
      await store.fileUpload(
        md5,
        file.type.split("/").pop()!,
        file,
        (p: any) => { },
        handler,
        "screenshot/video"
      );
    }

    await save(md5, file.type.split("/").pop()!, info, file, handler);
  }
};

const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm(
      t("video.view.confirm.message1"),
      t("video.view.confirm.message2"),
      {
        confirmButtonText: t("video.view.confirm.confirm"),
        cancelButtonText: t("video.view.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteVideo(videoData.value!.id);
    ElMessage.success(t("video.view.confirm.success"));
    router.push({ path: "/resource/video/index" });
  } catch {
    ElMessage.info(t("video.view.confirm.info"));
  }
};

const namedWindow = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("video.view.namePrompt.message1"),
      t("video.view.namePrompt.message2"),
      {
        confirmButtonText: t("video.view.namePrompt.confirm"),
        cancelButtonText: t("video.view.namePrompt.cancel"),
        closeOnClickModal: false,
        inputValue: videoData.value!.name,
      }
    );

    if (value) {
      await named(videoData.value!.id, value);
      ElMessage.success(t("video.view.namePrompt.success") + value);
    } else {
      ElMessage.info(t("video.view.namePrompt.info"));
    }
  } catch {
    ElMessage.info(t("video.view.namePrompt.info"));
  }
};

const named = async (id: number, name: string) => {
  try {
    const response = await putVideo(id, { name });
    videoData.value!.name = response.data.name;
  } catch (err) {
    console.error(err);
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/view-style.scss" as *;
</style>
