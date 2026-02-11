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
              <video
                id="video"
                controls="true"
                style="height: 300px; width: auto"
              >
                <source v-if="file !== null" id="src" :src="file" />
              </video>
              <video
                id="new_video"
                style="height: 100%; width: auto"
                hidden
                @canplaythrough="dealWith"
              ></video>
            </div>
          </el-card>
          <br />
        </el-col>
        <el-col :sm="8">
          <MrppInfo
            v-if="videoData"
            :title="$t('video.view.info.title')"
            titleSuffix=" :"
            :tableData="tableData"
            :itemLabel="$t('video.view.info.label1')"
            :textLabel="$t('video.view.info.label2')"
            :downloadText="$t('video.view.info.download')"
            :renameText="$t('video.view.info.name')"
            :deleteText="$t('video.view.info.delete')"
            @download="downloadVideo"
            @rename="namedWindow"
            @delete="deleteWindow"
          ></MrppInfo>
          <br />
        </el-col>
      </el-row>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { getVideo, putVideo, deleteVideo } from "@/api/v1/resources/index";
import { printVector2 } from "@/assets/js/helper";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import MrppInfo from "@/components/MrPP/MrppInfo/index.vue";
import { downloadResource } from "@/utils/downloadHelper";

const route = useRoute();
const router = useRouter();

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
    const base = [
      {
        item: t("video.view.info.item1"),
        text: videoData.value.name,
      },
      {
        item: t("video.view.info.item2"),
        text:
          videoData.value.author?.username || videoData.value.author?.nickname,
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
    let info: any = {};
    try {
      info = JSON.parse(videoData.value.info || "{}");
    } catch {}
    if (info.length) {
      base.push({
        item: t("video.view.info.item6"),
        text: info.length.toFixed(2) + "s",
      });
    }
    return base;
  } else {
    return [];
  }
});

const downloadVideo = async () => {
  if (!videoData.value) return;

  const fileName = videoData.value.file.filename || "";
  const fileExt =
    fileName.substring(fileName.lastIndexOf(".")).toLowerCase() || ".mp4";
  await downloadResource(
    {
      name: videoData.value.name || "video",
      file: videoData.value.file,
    },
    fileExt,
    t,
    "video.view.download"
  );
};

const init = () => {
  const video = document.getElementById("video") as HTMLVideoElement;
  const source = document.getElementById("src") as HTMLSourceElement;

  const new_video = document.getElementById("new_video") as HTMLVideoElement;
  new_video.src = source.src + "?t=" + new Date();
  new_video.crossOrigin = "anonymous";
  new_video.currentTime = 0.000001;
};

const dealWith = () => {
  if (!prepare.value) {
    const video = document.getElementById("video") as HTMLVideoElement;
    const new_video = document.getElementById("new_video") as HTMLVideoElement;
    // Wait for metadata to be loaded to ensure duration is available
    if (new_video.readyState >= 1) {
      const size = { x: new_video.videoWidth, y: new_video.videoHeight };
      setup(new_video, size);
    } else {
      new_video.onloadedmetadata = () => {
        const size = { x: new_video.videoWidth, y: new_video.videoHeight };
        setup(new_video, size);
      };
    }
  } else {
    expire.value = false;
  }
};

const setup = async (
  video: HTMLVideoElement,
  size: { x: number; y: number }
) => {
  if (size.x !== 0) {
    const length = video.duration;
    const info = JSON.stringify({ size, length });

    // Update info and use original file ID as image_id (using COS snapshot)
    const videoDataUpdate = { image_id: videoData.value!.file.id, info };
    const response = await putVideo(videoData.value!.id, videoDataUpdate);

    videoData.value!.image_id = response.data.image_id;
    videoData.value!.info = response.data.info;
    expire.value = false;
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
    const { value } = (await ElMessageBox.prompt(
      t("video.view.namePrompt.message1"),
      t("video.view.namePrompt.message2"),
      {
        confirmButtonText: t("video.view.namePrompt.confirm"),
        cancelButtonText: t("video.view.namePrompt.cancel"),
        closeOnClickModal: false,
        inputValue: videoData.value!.name,
      }
    )) as { value: string };

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
