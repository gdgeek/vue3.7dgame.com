<template>
  <div class="document-index">
    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">{{ $t("audio.view.title") }}</b>
            <span v-if="audioData">{{ audioData.name }}</span>
          </template>
          <img id="imgs" :src="imgSrc" style="display: none" />
          <div class="box-item" style="text-align: center">
            <section class="audio-bgc">
              <br />
              <div class="audio-box">
                <div class="audio-record" :class="{ 'audio-record-playfast': isPlay }" @click="handlePlayAudio"></div>
                <div class="audio-record-image" :class="{ 'audio-record-play': isPlay }" @click="handlePlayAudio"></div>
              </div>
              <audio id="audio" controls style="width: 95%; height: 84px" :src="file" preload="auto" @play="listenPlay"
                @pause="listenPause" @ended="listenEnd" @canplaythrough="dealWith"></audio>
            </section>
          </div>
        </el-card>
        <br />
      </el-col>

      <el-col :sm="8">
        <el-card class="box-card">
          <template #header>
            <b>{{ $t("audio.view.info.title") }}</b>:
          </template>
          <div class="box-item">
            <el-table :data="tableData" stripe>
              <el-table-column prop="item" :label="$t('audio.view.info.label1')"></el-table-column>
              <el-table-column prop="text" :label="$t('audio.view.info.label2')"></el-table-column>
            </el-table>

            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right">
                <el-button type="primary" size="small" @click="namedWindow">
                  <i class="el-icon-edit"></i>
                  {{ $t("audio.view.info.name") }}
                </el-button>
                <el-button type="primary" size="small" @click="deleteWindow">
                  <i class="el-icon-delete"></i>
                  {{ $t("audio.view.info.delete") }}
                </el-button>
              </el-button-group>
            </aside>
          </div>
        </el-card>
        <br />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { getAudio, putAudio, deleteAudio } from "@/api/v1/resources";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";

const route = useRoute();
const router = useRouter();
//const store = useFileStore().store;
const { t } = useI18n();
const audioData = ref<ResourceInfo | null>(null);
const file = ref<string>();
const expire = ref(true);
const isPlay = ref(false);
const imgSrc = "/media/bg/audio-cover.jpg";

const tableData = computed(() => {
  if (audioData.value) {
    return [
      { item: t("audio.view.info.item1"), text: audioData.value.name },
      {
        item: t("audio.view.info.item2"),
        text: audioData.value.author?.username,
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
  }
  return [];
});

const id = computed(() => route.query.id as string);
const prepare = computed(
  () => audioData.value !== null && audioData.value.info !== null
);

onMounted(async () => {
  const response = await getAudio(id.value);
  audioData.value = response.data;
  file.value = response.data.file.url;
});

const handlePlayAudio = () => {
  const audio = document.getElementById("audio") as HTMLAudioElement;
  if (!isPlay.value) {
    audio.play();
  } else {
    audio.pause();
  }
  isPlay.value = !isPlay.value;
};

const listenPlay = () => {
  isPlay.value = true;
  console.log("开始播放", isPlay.value);
};

const listenPause = () => {
  isPlay.value = false;
  console.log("暂停播放", isPlay.value);
};

const listenEnd = () => {
  isPlay.value = false;
  console.log("结束播放", isPlay.value);
};
const dealWith = () => {
  if (prepare.value) {
    expire.value = false;
  }
};

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
    router.push({ path: "/resource/audio/index" });
  } catch {
    ElMessage.info(t("audio.view.confirm.info"));
  }
};

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

const named = async (id: number, name: string) => {
  try {
    const response = await putAudio(id, { name });
    audioData.value!.name = response.data.name;
  } catch (err) {
    console.error(err);
  }
};
</script>

<style lang="scss" scoped>
.audio-bgc {
  position: relative;
  width: 100%;
  height: 350px;
  background: rgb(238, 174, 202);
  background: radial-gradient(circle,
      rgba(238, 174, 202, 1) 0%,
      rgb(169, 196, 228) 100%);
}

.audio-box {
  position: relative;
  margin: auto;
  margin-top: 26px;
  width: 200px;
  height: 200px;
}

.audio-record {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  margin: auto;
  width: 200px;
  height: 200px;
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
  width: 106px;
  height: 106px;
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
    transform: rotate(0edg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@keyframes recordfast {
  0% {
    transform: rotate(0edg);
  }

  100% {
    transform: rotate(1.1deg);
  }
}
</style>
