<template>
  <el-dialog v-model="visible" :title="$t('video.view.title')" width="80%" append-to-body destroy-on-close
    @closed="handleClose">
    <div class="document-index" v-loading="loading">
      <el-row :gutter="20">
        <el-col :sm="16">
          <el-card class="box-card">
            <template #header>
              <span v-if="videoData">{{ videoData.name }}</span>
            </template>
            <div class="box-item" style="text-align: center">
              <video id="video" controls="true" style="height: 300px; width: auto" v-if="file">
                <source :src="file" />
              </video>
              <video id="new_video" style="height: 100%; width: auto" hidden @canplaythrough="dealWith"></video>
            </div>
          </el-card>
          <br />
        </el-col>

        <el-col :sm="8">
          <MrppInfo v-if="videoData" :title="$t('video.view.info.title')" titleSuffix=" :" :tableData="tableData"
            :itemLabel="$t('video.view.info.label1')" :textLabel="$t('video.view.info.label2')"
            :downloadText="$t('video.view.info.download')" :renameText="$t('video.view.info.name')"
            :deleteText="$t('video.view.info.delete')" @download="downloadVideo" @rename="namedWindow"
            @delete="deleteWindow" />
          <br />
        </el-col>
      </el-row>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { getVideo, putVideo, deleteVideo } from "@/api/v1/resources/index";
import { printVector2 } from "@/assets/js/helper";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import MrppInfo from "@/components/MrPP/MrppInfo/index.vue";
import { downloadResource } from "@/utils/downloadHelper";
import { ElMessage, ElMessageBox } from "element-plus";

const props = defineProps<{
  modelValue: boolean;
  id: number | null;
  autoPlay?: boolean;
}>();

const emit = defineEmits(["update:modelValue", "refresh", "deleted"]);

const { t } = useI18n();
const videoData = ref<ResourceInfo | null>(null);
const file = ref<string | null>(null);
const loading = ref(false);
const expire = ref(true);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const prepare = computed(
  () => videoData.value !== null && videoData.value.info !== null
);

const tableData = computed(() => {
  if (videoData.value && prepare.value) {
    const base = [
      {
        item: t("video.view.info.item1"),
        text: videoData.value.name,
      },
      {
        item: t("video.view.info.item2"),
        text: videoData.value.author?.username || videoData.value.author?.nickname,
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
    try { info = JSON.parse(videoData.value.info || '{}'); } catch { }
    if (info.length) {
      base.push({ item: t("video.view.info.item6"), text: info.length.toFixed(2) + 's' });
    }
    return base;
  } else {
    return [];
  }
});

const downloadVideo = async () => {
  if (!videoData.value) return;

  const fileName = videoData.value.file.filename || '';
  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase() || '.mp4';
  await downloadResource(
    {
      name: videoData.value.name || 'video',
      file: videoData.value.file
    },
    fileExt,
    t,
    'video.view.download'
  );
};

const init = () => {
  const video = document.getElementById("video") as HTMLVideoElement;
  const source = video?.querySelector("source") as HTMLSourceElement;

  if (video && source) {
    const new_video = document.getElementById("new_video") as HTMLVideoElement;
    if (new_video) {
      new_video.src = source.src + "?t=" + new Date();
      new_video.crossOrigin = "anonymous";
      new_video.currentTime = 0.000001;
    }
  }
};

const dealWith = () => {
  if (!prepare.value) {
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

const loadData = async () => {
  if (!props.id) return;
  loading.value = true;
  expire.value = true;
  try {
    const response = await getVideo(props.id);
    videoData.value = response.data;
    file.value = response.data.file.url;
    setTimeout(() => {
      init();
      if (props.autoPlay) {
        const video = document.getElementById("video") as HTMLVideoElement;
        if (video) {
          video.play().catch(e => console.error("Auto-play failed:", e));
        }
      }
    }, 0);
  } catch (err) {
    ElMessage.error(String(err));
  } finally {
    loading.value = false;
  }
};

watch(() => props.modelValue, (val) => {
  if (val) {
    loadData();
  }
});

const handleClose = () => {
  videoData.value = null;
  file.value = null;
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
    if (videoData.value) {
      await deleteVideo(videoData.value.id);
      ElMessage.success(t("video.view.confirm.success"));
      emit("deleted");
      emit("update:modelValue", false);
    }
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
      emit("refresh");
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
    if (videoData.value) {
      videoData.value.name = response.data.name;
    }
  } catch (err) {
    console.error(err);
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/view-style.scss" as *;
</style>
