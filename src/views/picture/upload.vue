<template>
  <div>
    <mr-p-p-upload
      dir="picture"
      :file-type="fileType"
      @save-resource="savePicture"
    >
      <div>选择图片并上传</div>
    </mr-p-p-upload>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import MrPPUpload from "@/components/MrPP/MrPPUpload/index.vue";
import { postPicture } from "@/api/resources/index";

// 定义允许的文件类型
const fileType = ref("image/gif, image/jpeg, image/png");

const router = useRouter();

// 图片保存
const savePicture = async (
  name: string,
  file_id: number,
  callback: () => void
) => {
  try {
    const response = await postPicture({ name, file_id });

    // 跳转到图片查看页面，并传递图片 ID
    router.push({
      path: "/ResourceAdmin/picture/view",
      query: { id: response.data.id },
    });
  } catch (err) {
    // 捕获并输出错误
    console.error(err);
  }

  // 执行回调函数
  callback();
};
</script>
