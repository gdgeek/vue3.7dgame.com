<template>
  <div class="document-index">
    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">图片名称：</b>
            <span v-if="videoData">{{ videoData.name }}</span>
          </template>
          <div class="box-item" style="text-align: center">
            <video
              id="video"
              controls="true"
              style="height: 300px; width: 100%"
            >
              <source v-if="file !== null" id="src" :src="file" />
            </video>
            <video
              id="new_video"
              style="height: 100%; width: 100%"
              hidden
              @canplaythrough="dealWith"
            ></video>
          </div>
        </el-card>
        <br />
      </el-col>
      <el-col :sm="8">
        <el-card class="box-card">
          <template #header> <b>视频信息</b>: </template>
          <div class="box-item">
            <el-table :data="tableData" stripe>
              <el-table-column prop="item" label="条目"></el-table-column>
              <el-table-column prop="text" label="内容"></el-table-column>
            </el-table>
            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right">
                <el-button type="primary" size="small" @click="namedWindow">
                  <i class="el-icon-edit"></i>
                  改名
                </el-button>
                <el-button type="primary" size="small" @click="deleteWindow">
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
import { useRoute, useRouter } from "vue-router";
import { getVideo, putVideo, deleteVideo } from "@/api/resources/index";
import { postFile } from "@/api/v1/files";
import { printVector2 } from "@/assets/js/helper";
import { useFileStore } from "@/store/modules/config";
import type { ResourceInfo } from "@/api/resources/model";

const route = useRoute();
const router = useRouter();
const store = useFileStore().store;

const videoData = ref<ResourceInfo | null>(null);
const file = ref<string | null>(null);
const expire = ref(true);

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
        item: "视频名称",
        text: videoData.value.name,
      },
      {
        item: "创建者",
        text: videoData.value.author.nickname,
      },
      {
        item: "创建时间",
        text: videoData.value.created_at,
      },
      {
        item: "文件大小",
        text: videoData.value.file.size + "字节",
      },
      {
        item: "视频尺寸",
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
  const data = {
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
    // alert(JSON.stringify(file));
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
        (p: any) => {},
        handler,
        "screenshot/video"
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
    await deleteVideo(videoData.value!.id);
    ElMessage.success("删除成功!");
    router.push({ path: "/resource/video/index" });
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
        inputValue: videoData.value!.name,
      }
    );

    if (value) {
      await named(videoData.value!.id, value);
      ElMessage.success("新的视频名称: " + value);
    } else {
      ElMessage.info("取消输入");
    }
  } catch {
    ElMessage.info("取消输入");
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
@import "@/styles/view-style.scss";
</style>
