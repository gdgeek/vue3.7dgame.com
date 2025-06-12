<template>
  <TransitionWrapper>
    <div class="document-index">
      <br />
      <el-row :gutter="20" style="margin: 0px 18px 0">
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
                  <div class="audio-record-image" :class="{ 'audio-record-play': isPlay }" @click="handlePlayAudio">
                  </div>
                </div>
                <audio id="audio" controls style="width: 95%; height: 84px" :src="file" preload="auto"
                  @play="listenPlay" @pause="listenPause" @ended="listenEnd" @canplaythrough="dealWith"></audio>
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
                  <el-button type="success" size="small" @click="namedWindow">
                    <i class="el-icon-edit"></i>
                    {{ $t("audio.view.info.name") }}
                  </el-button>
                  <el-button type="danger" size="small" @click="deleteWindow">
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
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { getAudio, putAudio, deleteAudio } from "@/api/v1/resources";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { postFile } from "@/api/v1/files";
import { UploadFileType } from "@/api/user/model";
import { useFileStore } from "@/store/modules/config";
import { FileHandler } from "@/assets/js/file/server";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

// 基础状态和引用
const route = useRoute();
const router = useRouter();
const store = useFileStore().store;
const { t } = useI18n();
const audioData = ref<ResourceInfo | null>(null);
const file = ref<string>();
const expire = ref(true);
const isPlay = ref(false);
const imgSrc = "/media/bg/audio-cover.jpg";

// 计算属性
const id = computed(() => route.query.id as string);
const prepare = computed(
  () => audioData.value !== null && audioData.value.info !== null
);

// 表格数据计算属性
const tableData = computed(() => {
  if (audioData.value) {
    return [
      { item: t("audio.view.info.item1"), text: audioData.value.name },
      {
        item: t("audio.view.info.item2"),
        text: audioData.value.author?.username || audioData.value.author?.nickname,
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

// 音频播放控制函数
const handlePlayAudio = () => {
  const audio = document.getElementById("audio") as HTMLAudioElement;
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
    const audio = document.getElementById("audio") as HTMLAudioElement;
    const size = { x: 800, y: 800 };
    setup(audio, size);
  } else {
    expire.value = false;
  }
};

// 生成音频缩略图
const thumbnail = async (
  audio: HTMLAudioElement,
  width: number,
  height: number
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const imageType = "image/jpeg";
    const canvas = document.createElement("canvas");
    const bgImg = document.getElementById("imgs") as HTMLImageElement;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bgImg, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "thumbnail.jpg", { type: imageType });
          resolve(file);
        }
      }, imageType);
    }
  });
};

// 设置音频信息和缩略图
const setup = async (
  audio: HTMLAudioElement,
  size: { x: number; y: number }
) => {
  if (size.x !== 0) {
    // 获取音频时长（秒）
    const length = audio.duration;
    const info = JSON.stringify({ size, length });

    // 创建缩略图
    const file = await thumbnail(audio, size.x * 0.5, size.y * 0.5);
    const md5 = await store.fileMD5(file);
    let extension = file.type.split("/").pop()!
    extension = extension.startsWith(".") ? extension : `.${extension}`;

    // 处理文件上传
    const handler = await store.publicHandler();
    const has = await store.fileHas(
      md5,
      extension,
      handler,
      "screenshot/audio"
    );

    // 如果文件不存在则上传
    if (!has) {
      await store.fileUpload(
        md5,
        extension,
        file,
        () => { },
        handler,
        "screenshot/audio"
      );
    }

    // 保存文件信息
    await save(md5, extension, info, file, handler);
  }
};

// 保存文件数据到服务器
const save = async (
  md5: string,
  extension: string,
  info: string,
  file: File,
  handler: FileHandler
) => {
  extension = extension.startsWith(".") ? extension : `.${extension}`;
  const data: UploadFileType = {
    md5,
    key: md5 + extension,
    filename: file.name,
    url: store.fileUrl(md5, extension, handler, "screenshot/audio"),
  };

  try {
    // 上传文件信息
    const response1 = await postFile(data);
    const audio = { image_id: response1.data.id, info };

    // 更新音频信息
    const response2 = await putAudio(audioData.value!.id, audio);
    audioData.value!.image_id = response2.data.image_id;
    audioData.value!.info = response2.data.info;
    expire.value = false;
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
    router.push({ path: "/resource/audio/index" });
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
  } catch (err) {
    console.error(err);
  }
};

// 生命周期钩子 - 组件挂载时加载音频数据
onMounted(async () => {
  const response = await getAudio(id.value);
  audioData.value = response.data;
  file.value = response.data.file.url;
});
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
