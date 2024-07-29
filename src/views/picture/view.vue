<template>
  <div class="document-index">
    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">图片名称：</b>
            <span v-if="pictureData">{{ pictureData.name }}</span>
          </template>
          <div class="box-item" style="text-align: center">
            <el-image
              id="image"
              v-loading="expire"
              element-loading-text="正在预处理"
              element-loading-background="rgba(255,255, 255, 0.3)"
              style="height: 300px; width: 100%"
              :src="picture"
              fit="contain"
              @load="dealWith"
            ></el-image>
          </div>
        </el-card>
        <br />
      </el-col>

      <el-col :sm="8">
        <el-card class="box-card">
          <template #header> <b>图片信息</b> : </template>
          <div class="box-item">
            <el-table :data="tableData" stripe>
              <el-table-column prop="item" label="条目"></el-table-column>
              <el-table-column prop="text" label="内容"></el-table-column>
            </el-table>

            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right">
                <el-button type="success" size="small" @click="namedWindow">
                  <i class="el-icon-edit"></i>
                  改名
                </el-button>
                <el-button type="danger" size="small" @click="deleteWindow">
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
import { getPicture, putPicture, deletePicture } from "@/api/resources/index";
import { convertToHttps, printVector2 } from "@/assets/js/helper";
import { postFile } from "@/api/v1/files";
import { useFileStore } from "@/store/modules/config";
import type { ResourceInfo } from "@/api/resources/model";
import { FileHandler } from "@/assets/js/file/server";

const route = useRoute();
const router = useRouter();
const store = useFileStore().store;

const pictureData = ref<ResourceInfo | null>(null);
const file = ref<string | null>(null);
const expire = ref<boolean>(false);

const id = computed(() => route.query.id as string);

const prepare = computed(
  () => pictureData.value !== null && pictureData.value.info !== null
);

const tableData = computed(() => {
  if (pictureData.value && prepare.value) {
    return [
      { item: "图片名称", text: pictureData.value.name },
      { item: "创建者", text: pictureData.value.author.nickname },
      { item: "创建时间", text: pictureData.value.created_at },
      {
        item: "图片尺寸",
        text: printVector2(JSON.parse(pictureData.value.info).size),
      },
      { item: "文件大小", text: `${pictureData.value.file.size}字节` },
    ];
  }
  return [];
});

const picture = computed(() => convertToHttps(file.value!));

onMounted(async () => {
  try {
    expire.value = true;
    const response = await getPicture(id.value);
    pictureData.value = response.data;
    file.value = response.data.file.url;
  } catch (err) {
    alert(err);
  }
});

const getImageSize = (
  imageEl: HTMLImageElement
): Promise<{ x: number; y: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageEl.src;
    img.onload = () => resolve({ x: img.width, y: img.height });
    if (img.complete) resolve({ x: img.width, y: img.height });
  });
};

const thumbnail = (
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
    url: store.fileUrl(md5, extension, handler, "screenshot/picture"),
  };
  try {
    const response1 = await postFile(data);
    const picture = { image_id: response1.data.id, info };
    const response2 = await putPicture(pictureData.value!.id, picture);
    pictureData.value!.image_id = response2.data.image_id;
    pictureData.value!.info = response2.data.info;
    expire.value = false;
  } catch (e) {
    console.error(e);
  }
};

const setup = async (
  size: { x: number; y: number },
  image: HTMLImageElement
) => {
  const info = JSON.stringify({ size });
  if (size.x <= 1024) {
    const picture = { image_id: pictureData.value!.file.id, info };
    const response = await putPicture(pictureData.value!.id, picture);
    pictureData.value!.image_id = response.data.image_id;
    pictureData.value!.info = response.data.info;
    expire.value = false;
    return;
  }
  const file = await thumbnail(image, 512, size.y * (512 / size.x));
  const md5 = await store.fileMD5(file);
  const handler = await store.publicHandler();
  const has = await store.fileHas(
    md5,
    file.type.split("/").pop()!, // Extract extension from MIME type
    handler,
    "screenshot/picture"
  );
  if (!has) {
    await store.fileUpload(
      md5,
      file.type.split("/").pop()!,
      file,
      () => {},
      handler,
      "screenshot/picture"
    );
  }
  await save(md5, file.type.split("/").pop()!, info, file, handler);
};

const dealWith = async () => {
  if (!prepare.value) {
    const image = document.getElementById("image") as HTMLImageElement;
    image.crossOrigin = "anonymous";
    if (image.complete) {
      const size = await getImageSize(image);
      console.log(size);
      await setup(size, image);
    }
  } else {
    expire.value = false;
  }
};

const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm("此操作将永久删除该文件, 是否继续?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      closeOnClickModal: false,
      type: "warning",
    });

    await deletePicture(pictureData.value!.id);
    ElMessage.success("删除成功!");
    router.push("/ResourceAdmin/picture/index");
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
        inputValue: pictureData.value!.name,
      }
    );

    if (value) {
      await named(pictureData.value!.id, value);
      ElMessage.success("新的图片名称: " + value);
    } else {
      ElMessage.info("取消输入");
    }
  } catch {
    ElMessage.info("取消输入");
  }
};

const named = async (id: number, name: string) => {
  const picture = { name };
  try {
    const response = await putPicture(id, picture);
    pictureData.value!.name = response.data.name;
  } catch (err) {
    console.error(err);
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/view-style.scss";
</style>
