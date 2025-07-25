<template>
  <TransitionWrapper>
    <div class="document-index">
      <br />
      <el-row :gutter="20" style="margin: 0px 18px 0">
        <el-col :sm="16">
          <el-card class="box-card">
            <template #header>
              <b id="title">{{ $t("picture.view.title") }}</b>
              <span v-if="pictureData">{{ pictureData.name }}</span>
            </template>
            <div class="box-item" style="text-align: center">
              <img id="image" ref="image" v-loading="expire" :element-loading-text="$t('picture.view.loadingText')"
                element-loading-background="rgba(255,255, 255, 0.3)" style="height: 300px; width: auto" :src="picture"
                fit="contain" @load="dealWith" />
            </div>
          </el-card>
          <br />
        </el-col>

        <el-col :sm="8">
          <MrppInfo v-if="pictureData" :title="$t('picture.view.info.title')" titleSuffix=" :" :tableData="tableData"
            :itemLabel="$t('picture.view.info.label1')" :textLabel="$t('picture.view.info.label2')"
            :downloadText="$t('picture.view.info.download')" :renameText="$t('picture.view.info.name')"
            :deleteText="$t('picture.view.info.delete')" @download="downloadPicture" @rename="namedWindow"
            @delete="deleteWindow" />
          <br />
        </el-col>
      </el-row>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { getPicture, putPicture, deletePicture } from "@/api/v1/resources/index";
import { convertToHttps, printVector2 } from "@/assets/js/helper";
import { postFile } from "@/api/v1/files";
import { UploadFileType } from "@/api/user/model";
import { useFileStore } from "@/store/modules/config";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { FileHandler } from "@/assets/js/file/server";
import { convertToLocalTime, formatFileSize } from "@/utils/utilityFunctions";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import MrppInfo from "@/components/MrPP/MrppInfo/index.vue";
import { downloadResource } from "@/utils/downloadHelper";

const image = ref<HTMLImageElement | null>(null);
const route = useRoute();
const router = useRouter();
const store = useFileStore().store;
const pictureData = ref<ResourceInfo | null>(null);
const file = ref<string | null>(null);
const expire = ref<boolean>(false);
const id = computed(() => route.query.id as string);
const { t } = useI18n();

const prepare = computed(
  () => pictureData.value !== null && pictureData.value.info !== null
);

const tableData = computed(() => {
  if (pictureData.value && prepare.value) {
    return [
      { item: t("picture.view.info.item1"), text: pictureData.value.name },
      {
        item: t("picture.view.info.item2"),
        text: pictureData.value.author?.username || pictureData.value.author?.nickname,
      },
      {
        item: t("picture.view.info.item3"),
        text: convertToLocalTime(pictureData.value.created_at),
      },
      {
        item: t("picture.view.info.item5"),
        text: printVector2(JSON.parse(pictureData.value.info).size),
      },
      {
        item: t("picture.view.info.item4"),
        text: formatFileSize(pictureData.value.file.size),
      },
    ];
  }
  return [];
});

const picture = computed(() => convertToHttps(file.value!));

const downloadPicture = async () => {
  // 通过文件扩展名判断图片类型
  if (!pictureData.value) return;

  const fileName = pictureData.value.file.filename || '';
  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase() || '.jpg';
  await downloadResource(
    {
      name: pictureData.value.name || 'image',
      file: pictureData.value.file
    },
    fileExt,
    t,
    'picture.view.download'
  );
};

onMounted(async () => {
  try {
    expire.value = true;
    const response = await getPicture(id.value);
    pictureData.value = response.data;
    file.value = response.data.file.url;
  } catch (err) {
    ElMessage.error(String(err));
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
  extension = extension.startsWith('.') ? extension : `.${extension}`;
  const data: UploadFileType = {
    md5,
    key: md5 + extension,
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
    file.type.split("/").pop()!,
    handler,
    "screenshot/picture"
  );
  if (!has) {
    await store.fileUpload(
      md5,
      file.type.split("/").pop()!,
      file,
      () => { },
      handler,
      "screenshot/picture"
    );
  }
  await save(md5, file.type.split("/").pop()!, info, file, handler);
};

const dealWith = async () => {
  if (!prepare.value) {
    if (image.value) {
      const img: HTMLImageElement = image.value;

      image.value.crossOrigin = "anonymous";

      if (image.value.complete) {
        const size = await getImageSize(image.value);
        await setup(size, image.value);
      }
    }
  } else {
    expire.value = false;
  }
};

const deleteWindow = async () => {
  try {
    await ElMessageBox.confirm(
      t("picture.confirm.message1"),
      t("picture.confirm.message2"),
      {
        confirmButtonText: t("picture.confirm.confirm"),
        cancelButtonText: t("picture.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );

    await deletePicture(pictureData.value!.id);
    ElMessage.success(t("picture.confirm.success"));
    router.push("/resource/picture/index");
  } catch {
    ElMessage.info(t("picture.confirm.info"));
  }
};

const namedWindow = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("picture.view.namePrompt.message1"),
      t("picture.view.namePrompt.message2"),
      {
        confirmButtonText: t("picture.view.namePrompt.confirm"),
        cancelButtonText: t("picture.view.namePrompt.cancel"),
        closeOnClickModal: false,
        inputValue: pictureData.value!.name,
      }
    );

    if (value) {
      const response = await putPicture(pictureData.value!.id, { name: value });
      pictureData.value!.name = response.data.name;
      ElMessage.success(t("picture.view.namePrompt.success") + value);
    } else {
      ElMessage.info(t("picture.view.namePrompt.info"));
    }
  } catch {
    ElMessage.info(t("picture.view.namePrompt.info"));
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/view-style.scss" as *;
</style>
