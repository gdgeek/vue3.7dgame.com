<template>
  <TransitionWrapper>
    <div class="document-index">
      <el-row :gutter="20" style="margin: 28px 18px 0">
        <el-col :sm="16">
          <el-card class="box-card">
            <template #header>
              <b id="title">{{ t("particle.view.title") }}</b>
              <span v-if="particleData">{{ particleData.name }}</span>
            </template>
            <div class="box-item" style="text-align: center">
              <template v-if="isVideo">
                <video id="particle" controls style="height: 300px; width: auto">
                  <source v-if="file !== null" id="src" :src="file" />
                </video>
                <video id="new_particle" style="height: 100%; width: auto" hidden @canplaythrough="dealWith"></video>
              </template>
              <template v-else-if="isAudio">
                <section class="audio-bgc">
                  <br />
                  <div class="audio-box">
                    <div class="audio-record" :class="{ 'audio-record-playfast': isPlay }" @click="handlePlayAudio">
                    </div>
                    <div class="audio-record-image" :class="{ 'audio-record-play': isPlay }" @click="handlePlayAudio">
                    </div>
                  </div>
                  <audio id="audio" controls style="width: 95%; height: 84px" :src="file || ''" preload="auto"
                    @play="listenPlay" @pause="listenPause" @ended="listenEnd" @canplaythrough="dealWith"></audio>
                </section>
              </template>
              <template v-else-if="isImage">
                <img id="image" ref="image" v-loading="expire" :element-loading-text="t('particle.view.loadingText')"
                  element-loading-background="rgba(255,255, 255, 0.3)" style="height: 300px; width: auto"
                  :src="file || ''" fit="contain" @load="dealWith" />
              </template>
              <template v-else>
                <el-skeleton :rows="7"></el-skeleton>
              </template>
            </div>
          </el-card>
          <br />
        </el-col>
        <el-col :sm="8">
          <MrppInfo v-if="particleData" :title="$t('particle.view.info.title')" titleSuffix=" :" :tableData="tableData"
            :itemLabel="$t('particle.view.info.label1')" :textLabel="$t('particle.view.info.label2')"
            :downloadText="$t('particle.view.info.download')" :renameText="$t('particle.view.info.name')"
            :deleteText="$t('particle.view.info.delete')" @download="downloadParticle" @rename="namedWindow"
            @delete="deleteWindow"></MrppInfo>
          <br />
        </el-col>
      </el-row>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { Message, MessageBox } from "@/components/Dialog";
import {
  getParticle,
  putParticle,
  deleteParticle,
} from "@/api/v1/resources/index";
import { postFile } from "@/api/v1/files";
import { UploadFileType } from "@/api/user/model";
import { printVector2 } from "@/assets/js/helper";
import { useFileStore } from "@/store/modules/config";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import MrppInfo from "@/components/MrPP/MrppInfo/index.vue";
import { downloadResource } from "@/utils/downloadHelper";

const route = useRoute();
const router = useRouter();
const store = useFileStore().store;

const particleData = ref<ResourceInfo | null>(null);
const file = ref<string | null>(null);
const expire = ref(true);

const { t } = useI18n();

const id = computed(() => route.query.id as string);
const prepare = computed(
  () => particleData.value !== null && particleData.value.info !== null
);

const isVideo = computed(() => {
  if (!file.value) return false;
  return /\.(mp4|webm|ogg)$/i.test(file.value);
});
const isAudio = computed(() => {
  if (!file.value) return false;
  return /\.(mp3|wav)$/i.test(file.value);
});
const isImage = computed(() => {
  if (!file.value) return false;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.value);
});

// 音频播放相关
const isPlay = ref(false);
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
};
const listenPause = () => {
  isPlay.value = false;
};
const listenEnd = () => {
  isPlay.value = false;
};

onMounted(async () => {
  expire.value = true;
  const response = await getParticle(id.value);
  console.log("Particle:", response.data);
  particleData.value = response.data;
  file.value = response.data.file.url;
  setTimeout(() => {
    init();
  }, 0);
});

// 处理三种类型的 setup
const setupVideo = async (
  video: HTMLVideoElement,
  size: { x: number; y: number }
) => {
  if (size.x !== 0) {
    const length = video.duration;
    const info = JSON.stringify({ size, length });
    const file = await thumbnailVideo(video, size.x * 0.5, size.y * 0.5);
    const md5 = await store.fileMD5(file);
    const handler = await store.publicHandler();
    const has = await store.fileHas(
      md5,
      file.type.split("/").pop()!,
      handler,
      "screenshot/particle"
    );
    if (!has) {
      await store.fileUpload(
        md5,
        file.type.split("/").pop()!,
        file,
        () => { },
        handler,
        "screenshot/particle"
      );
    }
    await save(md5, file.type.split("/").pop()!, info, file, handler);
  }
};
const setupImage = async (
  img: HTMLImageElement,
  size: { x: number; y: number }
) => {
  const info = JSON.stringify({ size });
  if (size.x <= 1024) {
    const picture = { image_id: particleData.value!.file.id, info };
    const response = await putParticle(particleData.value!.id, picture);
    particleData.value!.image_id = response.data.image_id;
    particleData.value!.info = response.data.info;
    expire.value = false;
    return;
  }
  const file = await thumbnailImage(img, 512, size.y * (512 / size.x));
  const md5 = await store.fileMD5(file);
  const handler = await store.publicHandler();
  const has = await store.fileHas(
    md5,
    file.type.split("/").pop()!,
    handler,
    "screenshot/particle"
  );
  if (!has) {
    await store.fileUpload(
      md5,
      file.type.split("/").pop()!,
      file,
      () => { },
      handler,
      "screenshot/particle"
    );
  }
  await save(md5, file.type.split("/").pop()!, info, file, handler);
};
const setupAudio = async (audio: HTMLAudioElement) => {
  const size = { x: 800, y: 800 };
  const length = audio.duration;
  const info = JSON.stringify({ size, length });
  const file = await thumbnailAudio(size.x * 0.5, size.y * 0.5);
  const md5 = await store.fileMD5(file);
  const handler = await store.publicHandler();
  const has = await store.fileHas(
    md5,
    file.type.split("/").pop()!,
    handler,
    "screenshot/particle"
  );
  if (!has) {
    await store.fileUpload(
      md5,
      file.type.split("/").pop()!,
      file,
      () => { },
      handler,
      "screenshot/particle"
    );
  }
  await save(md5, file.type.split("/").pop()!, info, file, handler);
};

// 缩略图生成
const thumbnailVideo = (
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
          reject("Failed to create blob");
        }
      }, imageType);
    }
  });
};
const thumbnailImage = (
  image: HTMLImageElement,
  width: number,
  height: number
): Promise<File> => {
  return new Promise((resolve) => {
    const imageType = "image/jpeg";
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "thumbnail.jpg", { type: imageType });
          resolve(file);
        }
      }, imageType);
    }
  });
};
const thumbnailAudio = (width: number, height: number): Promise<File> => {
  return new Promise((resolve) => {
    const imageType = "image/jpeg";
    const canvas = document.createElement("canvas");
    const bgImg = new window.Image();
    bgImg.src = "/media/bg/audio-cover.jpg";
    bgImg.onload = () => {
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
    };
  });
};

const dealWith = async () => {
  if (!prepare.value) {
    if (isVideo.value) {
      const particle = document.getElementById("particle") as HTMLVideoElement;
      const new_particle = document.getElementById(
        "new_particle"
      ) as HTMLVideoElement;
      if (particle) {
        const size = { x: particle.videoWidth, y: particle.videoHeight };
        await setupVideo(new_particle, size);
      }
    } else if (isImage.value) {
      const img = document.getElementById("image") as HTMLImageElement;
      if (img) {
        const size = { x: img.naturalWidth, y: img.naturalHeight };
        await setupImage(img, size);
      }
    } else if (isAudio.value) {
      const audio = document.getElementById("audio") as HTMLAudioElement;
      if (audio) {
        await setupAudio(audio);
      }
    }
  } else {
    expire.value = false;
  }
};

// tableData 信息自适应
const tableData = computed(() => {
  if (particleData.value && prepare.value) {
    const base = [
      { item: t("particle.view.info.item1"), text: particleData.value.name },
      {
        item: t("particle.view.info.item2"),
        text:
          particleData.value.author?.nickname ||
          particleData.value.author?.username || '—',
      },
      {
        item: t("particle.view.info.item3"),
        text: convertToLocalTime(particleData.value.created_at),
      },
      {
        item: t("particle.view.info.item4"),
        text: formatFileSize(particleData.value.file.size),
      },
    ];
    let info: any = {};
    try {
      info = JSON.parse(particleData.value.info || "{}");
    } catch { }
    if (isVideo.value) {
      base.push({
        item: t("particle.view.info.item5"),
        text: info?.size ? printVector2(info.size) : "-",
      });
      base.push({
        item: t("particle.view.info.item6"),
        text:
          typeof info?.length === "number" ? `${info.length.toFixed(2)}s` : "-",
      });
    } else if (isImage.value) {
      base.push({
        item: t("particle.view.info.item5"),
        text: info?.size ? printVector2(info.size) : "-",
      });
    } else if (isAudio.value) {
      base.push({
        item: t("particle.view.info.item6"),
        text:
          typeof info?.length === "number" ? `${info.length.toFixed(2)}s` : "-",
      });
    }
    return base;
  }
  return [];
});

const downloadParticle = async () => {
  if (!particleData.value) return;

  const fileName = particleData.value.file.filename || "";
  const fileExt =
    fileName.substring(fileName.lastIndexOf(".")).toLowerCase() || ".mp4";
  await downloadResource(
    {
      name: particleData.value.name || "particle",
      file: particleData.value.file,
    },
    fileExt,
    t,
    "particle.view.download"
  );
};

const init = () => {
  const particle = document.getElementById("particle") as HTMLVideoElement;
  const source = document.getElementById("src") as HTMLSourceElement;

  const new_particle = document.getElementById(
    "new_particle"
  ) as HTMLVideoElement;
  new_particle.src = source.src + "?t=" + new Date();
  new_particle.crossOrigin = "anonymous";
  new_particle.currentTime = 0.000001;
  particle.addEventListener(
    "timeupdate",
    () => {
      new_particle.currentTime = particle.currentTime;
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
    url: store.fileUrl(md5, extension, handler, "screenshot/particle"),
  };
  try {
    const response1 = await postFile(data);
    const particle = { image_id: response1.data.id, info };
    const response2 = await putParticle(particleData.value!.id, particle);

    particleData.value!.image_id = response2.data.image_id;
    particleData.value!.info = response2.data.info;
    expire.value = false;
  } catch (e) {
    console.error(e);
  }
};

const deleteWindow = async () => {
  try {
    await MessageBox.confirm(
      t("particle.view.confirm.message1"),
      t("particle.view.confirm.message2"),
      {
        confirmButtonText: t("particle.view.confirm.confirm"),
        cancelButtonText: t("particle.view.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteParticle(particleData.value!.id);
    Message.success(t("particle.view.confirm.success"));
    router.push({ path: "/resource/particle/index" });
  } catch {
    Message.info(t("particle.view.confirm.info"));
  }
};

const namedWindow = async () => {
  try {
    const { value } = (await MessageBox.prompt(
      t("particle.view.namePrompt.message1"),
      t("particle.view.namePrompt.message2"),
      {
        confirmButtonText: t("particle.view.namePrompt.confirm"),
        cancelButtonText: t("particle.view.namePrompt.cancel"),
        defaultValue: particleData.value!.name,
      }
    )) as { value: string };

    if (value) {
      await named(particleData.value!.id, value);
      Message.success(t("particle.view.namePrompt.success") + value);
    } else {
      Message.info(t("particle.view.namePrompt.info"));
    }
  } catch {
    Message.info(t("particle.view.namePrompt.info"));
  }
};

const named = async (id: number, name: string) => {
  try {
    const response = await putParticle(id, { name });
    particleData.value!.name = response.data.name;
  } catch (err) {
    console.error(err);
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/view-style.scss" as *;

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
