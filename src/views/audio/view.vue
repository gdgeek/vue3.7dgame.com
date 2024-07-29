<template>
  <div class="document-index">
    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">音频名称：</b>
            <span v-if="audioData">{{ audioData.name }}</span>
          </template>
          <img id="imgs" :src="imgSrc" style="display: none" />
          <div class="box-item" style="text-align: center">
            <section class="audio-bgc">
              <br />
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
                id="audio"
                controls
                style="width: 95%; height: 84px"
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
        <br />
      </el-col>

      <el-col :sm="8">
        <el-card class="box-card">
          <template #header> <b>音频信息</b>: </template>
          <div class="box-item">
            <el-table :data="tableData" stripe>
              <el-table-column prop="item" label="条目"></el-table-column>
              <el-table-column prop="text" label="内容"></el-table-column>
            </el-table>

            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right">
                <el-button type="primary" size="mini" @click="namedWindow">
                  <i class="el-icon-edit"></i>
                  改名
                </el-button>
                <el-button type="primary" size="mini" @click="deleteWindow">
                  <i class="el-icon-delete"></i>
                  删除
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
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getAudio, putAudio, deleteAudio } from "@/api/resources";
import type { ResourceInfo } from "@/api/resources/model";
import { postFile } from "@/api/v1/files";
import { useFileStore } from "@/store/modules/config";
import { FileHandler } from "@/assets/js/file/server";

const route = useRoute();
const router = useRouter();
const store = useFileStore().store; // Replace with Pinia store if used

const audioData = ref<ResourceInfo | null>(null);
const file = ref<string>();
const expire = ref(true);
const isPlay = ref(false);
const imgSrc = "/media/bg/audio-cover.jpg";

const tableData = computed(() => {
  if (audioData.value) {
    return [
      { item: "音频名称", text: audioData.value.name },
      { item: "创建者", text: audioData.value.author.nickname },
      { item: "创建时间", text: audioData.value.created_at },
      { item: "文件大小", text: `${audioData.value.file.size}字节` },
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

const save = async (
  md5: string,
  extension: string,
  info: string,
  file: File,
  handler: FileHandler
) => {
  const data = {
    md5,
    key: `${md5}${extension}`,
    filename: file.name,
    url: store.fileUrl(md5, extension, handler, "screenshot/audio"),
  };
  try {
    const response1 = await postFile(data);
    const audio = { image_id: response1.data.id, info };
    const response2 = await putAudio(audioData.value!.id, audio);
    audioData.value!.image_id = response2.data.image_id;
    audioData.value!.info = response2.data.info;
    expire.value = false;
  } catch (e) {
    console.error(e);
  }
};

const dealWith = () => {
  if (!prepare.value) {
    const audio = document.getElementById("audio") as HTMLAudioElement;
    const size = { x: 800, y: 800 };
    setup(audio, size);
  } else {
    expire.value = false;
  }
};

const thumbnail = async (
  audio: HTMLAudioElement,
  width: number,
  height: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const imageType = "image/jpeg";
    const canvas = document.createElement("canvas");
    const bgImg = document.getElementById("imgs") as HTMLImageElement;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(bgImg, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create thumbnail"));
    }, imageType);
  });
};

const setup = async (
  audio: HTMLAudioElement,
  size: { x: number; y: number }
) => {
  if (size.x !== 0) {
    const info = JSON.stringify({ size });
    const blob = await thumbnail(audio, size.x * 0.5, size.y * 0.5);
    blob.name = `${audioData.value!.name}.thumbnail`;
    blob.extension = ".jpg";
    const file = blob as File;
    const md5 = await store.fileMD5(file);
    const handler = await store.publicHandler();
    const has = await store.fileHas(
      md5,
      file.type.split("/").pop()!,
      handler,
      "screenshot/audio"
    );
    if (!has) {
      await store.fileUpload(
        md5,
        file.type.split("/").pop()!,
        file,
        () => {},
        handler,
        "screenshot/audio"
      );
    }
    await save(md5, file.type.split("/").pop()!, info, file, handler);
  }
};

const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm("此操作将永久删除该文件, 是否继续?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    await deleteAudio(audioData.value!.id);
    ElMessage.success("删除成功!");
    router.push({ path: "/ResourceAdmin/audio/index" });
  } catch {
    ElMessage.info("已取消删除");
  }
};

const namedWindow = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      "请输入新名称",
      "修改图片名称",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        closeOnClickModal: false,
        inputValue: audioData.value!.name,
      }
    );

    if (value) {
      await named(audioData.value!.id, value);
      ElMessage.success("新的图片名称: " + value);
    } else {
      ElMessage.info("取消输入");
    }
  } catch {
    ElMessage.info("取消输入");
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
  background: radial-gradient(
    circle,
    rgba(238, 174, 202, 1) 0%,
    rgb(169, 196, 228) 100%
  );
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
