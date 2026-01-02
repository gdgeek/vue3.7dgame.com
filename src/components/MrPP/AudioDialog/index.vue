<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('audio.view.title')"
    width="800px"
    center
    destroy-on-close
    append-to-body
    @closed="handleClose"
  >
    <div class="document-index" v-loading="loading">
      <el-row :gutter="20">
        <el-col :sm="16">
          <el-card class="box-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span v-if="audioData">{{ audioData.name }}</span>
              </div>
            </template>
            <div class="box-item" style="text-align: center">
              <section class="audio-bgc">
                <div class="audio-box">
                  <div
                    class="audio-record"
                    :class="{ 'audio-record-playfast': isPlay }"
                    @click="handlePlayAudio"
                  ></div>
                  <div
                    class="audio-record-image"
                    :class="{ 'audio-record-play': isPlay }"
                    @click="handlePlayAudio"
                  ></div>
                </div>
                <audio
                  id="audio-dialog-player"
                  controls
                  style="width: 95%; height: 50px; margin-top: 20px"
                  :src="file"
                  preload="auto"
                  @play="listenPlay"
                  @pause="listenPause"
                  @ended="listenEnd"
                  @canplaythrough="dealWith"
                ></audio>
              </section>
            </div>
          </el-card>
        </el-col>
        <el-col :sm="8">
          <MrppInfo
            v-if="audioData"
            :title="$t('audio.view.info.title')"
            titleSuffix=" :"
            :tableData="tableData"
            :itemLabel="$t('audio.view.info.label1')"
            :textLabel="$t('audio.view.info.label2')"
            :downloadText="$t('audio.view.info.download')"
            :renameText="$t('audio.view.info.name')"
            :deleteText="$t('audio.view.info.delete')"
            @download="downloadAudio"
            @rename="namedWindow"
            @delete="deleteWindow"
          ></MrppInfo>
        </el-col>
      </el-row>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { getAudio, putAudio, deleteAudio } from "@/api/v1/resources";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { postFile } from "@/api/v1/files";
import { UploadFileType } from "@/api/user/model";
import { useFileStore } from "@/store/modules/config";
import { FileHandler } from "@/assets/js/file/server";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import MrppInfo from "@/components/MrPP/MrppInfo/index.vue";
import { downloadResource } from "@/utils/downloadHelper";
import { ElMessage, ElMessageBox } from "element-plus";

const props = defineProps<{
  modelValue: boolean;
  audioId: number | string | null;
  autoPlay?: boolean;
}>();

const emit = defineEmits(["update:modelValue", "deleted", "renamed"]);

const store = useFileStore().store;
const { t } = useI18n();
const audioData = ref<ResourceInfo | null>(null);
const file = ref<string>();
const isPlay = ref(false);
const loading = ref(false);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

// 计算属性
const prepare = computed(
  () => audioData.value !== null && audioData.value.info !== null
);

// 表格数据计算属性
const tableData = computed(() => {
  if (audioData.value) {
    const base = [
      { item: t("audio.view.info.item1"), text: audioData.value.name },
      {
        item: t("audio.view.info.item2"),
        text:
          audioData.value.author?.username || audioData.value.author?.nickname,
      },
      {
        item: t("audio.view.info.item3"),
        text: convertToLocalTime(audioData.value.created_at),
      },
      {
        item: t("audio.view.info.item4"),
        text: formatFileSize(audioData.value.file.size),
      },
    ];
    let info: any = {};
    try {
      info = JSON.parse(audioData.value.info || "{}");
    } catch {}
    if (info.length) {
      base.push({
        item: t("audio.view.info.item5"),
        text: info.length.toFixed(2) + "s",
      });
    }
    return base;
  }
  return [];
});

const downloadAudio = async () => {
  if (!audioData.value) return;

  const fileName = audioData.value.file.filename || "";
  const fileExt =
    fileName.substring(fileName.lastIndexOf(".")).toLowerCase() || ".mp3";
  await downloadResource(
    {
      name: audioData.value.name || "audio",
      file: audioData.value.file,
    },
    fileExt,
    t,
    "audio.view.download"
  );
};

// 音频播放控制函数
const handlePlayAudio = () => {
  const audio = document.getElementById(
    "audio-dialog-player"
  ) as HTMLAudioElement;
  if (!audio) return;

  if (!isPlay.value) {
    audio.play();
  } else {
    audio.pause();
  }
  isPlay.value = !isPlay.value;
};

// 音频事件监听函数
const listenPlay = () => {
  isPlay.value = true;
};

const listenPause = () => {
  isPlay.value = false;
};

const listenEnd = () => {
  isPlay.value = false;
};

// 处理音频加载完成
const dealWith = () => {
  if (!prepare.value) {
    const audio = document.getElementById(
      "audio-dialog-player"
    ) as HTMLAudioElement;
    if (audio) {
      setup(audio);
    }
  }
};

// 设置音频信息 (仅获取时长)
const setup = async (audio: HTMLAudioElement) => {
  // 获取音频时长（秒）
  const length = audio.duration;
  // 模拟 size，保持数据结构一致性
  const size = { x: 800, y: 800 };
  const info = JSON.stringify({ size, length });

  // 更新音频信息
  try {
    const response = await putAudio(audioData.value!.id, { info });
    audioData.value!.info = response.data.info;
  } catch (e) {
    console.error(e);
  }
};

// 删除音频确认对话框
const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm(
      t("audio.view.confirm.message1"),
      t("audio.view.confirm.message2"),
      {
        confirmButtonText: t("audio.view.confirm.confirm"),
        cancelButtonText: t("audio.view.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteAudio(audioData.value!.id);
    ElMessage.success(t("audio.view.confirm.success"));
    emit("deleted", audioData.value!.id);
    dialogVisible.value = false;
  } catch {
    ElMessage.info(t("audio.view.confirm.info"));
  }
};

// 重命名音频对话框
const namedWindow = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("audio.view.namePrompt.message1"),
      t("audio.view.namePrompt.message2"),
      {
        confirmButtonText: t("audio.view.namePrompt.confirm"),
        cancelButtonText: t("audio.view.namePrompt.cancel"),
        closeOnClickModal: false,
        inputValue: audioData.value!.name,
      }
    );

    if (value) {
      await named(audioData.value!.id, value);
      ElMessage.success(t("audio.view.namePrompt.success") + value);
    } else {
      ElMessage.info(t("audio.view.namePrompt.info"));
    }
  } catch {
    ElMessage.info(t("audio.view.namePrompt.info"));
  }
};

// 重命名音频API调用
const named = async (id: number, name: string) => {
  try {
    const response = await putAudio(id, { name });
    audioData.value!.name = response.data.name;
    emit("renamed", { id, name });
  } catch (err) {
    console.error(err);
  }
};

const fetchData = async () => {
  if (!props.audioId) return;
  loading.value = true;
  try {
    const response = await getAudio(props.audioId);
    audioData.value = response.data;
    file.value = response.data.file.url;

    if (props.autoPlay) {
      nextTick(() => {
        const audio = document.getElementById(
          "audio-dialog-player"
        ) as HTMLAudioElement;
        if (audio) {
          audio.play().catch((e) => console.error("Auto-play failed:", e));
          isPlay.value = true;
        }
      });
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(t("audio.view.loadError") || "Failed to load audio data");
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  isPlay.value = false;
  audioData.value = null;
  file.value = undefined;
};

watch(
  () => props.audioId,
  (newId) => {
    if (newId && props.modelValue) {
      fetchData();
    }
  }
);

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.audioId) {
      fetchData();
    }
  }
);
</script>

<style lang="scss" scoped>
.audio-bgc {
  position: relative;
  width: 100%;
  height: 300px;
  background: rgb(238, 174, 202);
  background: radial-gradient(
    circle,
    rgba(238, 174, 202, 1) 0%,
    rgb(169, 196, 228) 100%
  );
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.audio-box {
  position: relative;
  width: 150px;
  height: 150px;
}

.audio-record {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  margin: auto;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: url("/media/bg/audio-record.jpg") center no-repeat;
  background-size: cover;
}

.audio-record-image {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  margin: auto;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: url("/media/bg/audio-img.jpg") center no-repeat;
  background-size: 113%;
}

.audio-record-play {
  animation: spin 6s infinite linear;
}

.audio-record-playfast {
  animation: recordfast 0.16s infinite linear;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@keyframes recordfast {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(1.1deg);
  }
}
</style>
