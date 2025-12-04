<template>
  <div class="verse-view">
    <br />
    <el-row :gutter="20" style="margin: 0px 18px 0">
      <el-col :sm="16">
        <el-card v-if="item" class="box-card">
          <template #header>
            <el-form ref="itemForm" :rules="rules" v-if="item" :model="item" label-width="80px">
              <el-form-item :label="$t('meta.metaEdit.form.title')" prop="title">
                <el-input v-model="item.title" @change="onSubmit"></el-input>
              </el-form-item>
              <el-form-item :label="$t('meta.metaEdit.form.picture')" prop="title">
                <div class="box-item" style="width: 100%; text-align: center">
                  <ImageSelector :imageUrl="image" :itemId="id" @image-selected="handleImageSelected"
                    @image-upload-success="handleImageUploadSuccess" />
                </div>
              </el-form-item>
              <el-form-item v-if="prefab" label="Info" prop="title">
                <el-input v-model="jsonInfo" type="textarea" @change="onSubmit"></el-input>
              </el-form-item>
            </el-form>
          </template>
        </el-card>
        <br />
        <el-card v-if="item !== null" class="box-card">
          <el-button v-if="item.viewable" @click="editor" icon="Edit" type="primary" size="small" style="width: 100%">
            {{ $t("meta.metaEdit.contentEdit") }}
          </el-button>
          <br />
        </el-card>
        <br />
      </el-col>

      <el-col :sm="8">
        <br />
        <br />
        <br />
        <br />
      </el-col>
    </el-row>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from "vue-router";
import type { metaInfo } from "@/api/v1/meta";
import { translateRouteTitle } from "@/utils/i18n";
import { useI18n } from "vue-i18n"

const route = useRoute();
const router = useRouter();
const item = ref<metaInfo | null>(null);
const { t } = useI18n();

const rules = {
  title: [
    {
      required: true,
      message: t("meta.metaEdit.rules.message1"),
      trigger: "blur",
    },
    {
      min: 2,
      max: 20,
      message: t("meta.metaEdit.rules.message2"),
      trigger: "blur",
    },
  ],
};

const itemForm = ref<InstanceType<typeof ElForm> | null>(null);
const id = computed(() => parseInt(route.query.id as string, 10));
const prefab = computed({
  get: () => item.value?.prefab === 1,
  set: (value: boolean) => {
    if (item.value) {
      item.value.prefab = value ? 1 : 0;
    }
  },
});

const emit = defineEmits(["getItem", "putItem"]);

const image = computed(() => {
  if (item.value && item.value.image) {
    return item.value.image.url;
  }
  return "";
});

const jsonInfo = computed({
  get() {
    // 将 item.info 解析为对象后格式化为 JSON 字符串
    return JSON.stringify(JSON.parse(item.value!.info!), null, 2);
  },
  set(value: string) {
    try {
      // 将输入的字符串解析为对象并赋值给 item.info
      item.value!.info = JSON.stringify(JSON.parse(value));
    } catch (error) {
      console.error("Invalid JSON format", error);
    }
  },
});

const refresh = async () => {
  const data = await getItem(id.value, { expand: "image,author" });
  item.value = data;
};

const getItem = async (id: number, params: any) => {
  return new Promise<metaInfo>((resolve, reject) => {
    try {
      emit("getItem", id, params, (data: metaInfo) => {
        resolve(data);
      });
    } catch (e) {
      reject(e);
    }
  });
};

const putItem = async (id: number, data: metaInfo) => {
  return new Promise<metaInfo>((resolve, reject) => {
    try {
      emit("putItem", id, data, (ret: metaInfo) => {
        resolve(ret);
      });
    } catch (e) {
      reject(e);
    }
  });
};

const editor = () => {
  if (item.value) {
    // 查找路径 `/meta/scene` 的路由对象
    const sceneRoute = router
      .getRoutes()
      .find((route) => route.path === "/meta/scene");
    // 如果找到了路由对象并且它有 meta.title，就进行拼接
    if (sceneRoute && sceneRoute.meta.title) {
      const metaTitle = translateRouteTitle(
        sceneRoute.meta.title
      ).toLowerCase();
      router.push({
        path: "/meta/scene",
        query: {
          id: id.value,
          title: metaTitle + "【" + item.value.title + "】",
        },
      });
    }
  }
};

// 处理从资源库选择的图片
interface ImageUpdateEvent {
  imageId: number;
  itemId: number | null;
}

const handleImageSelected = async (event: ImageUpdateEvent) => {
  if (item.value && id.value === event.itemId) {
    try {
      item.value.image_id = event.imageId;
      await putItem(id.value, item.value);
      ElMessage.success(t("meta.metaEdit.image.updateSuccess"));
      await refresh();
    } catch (error) {
      console.error("Failed to update meta image:", error);
      ElMessage.error(t("meta.metaEdit.image.updateError"));
    }
  }
};

// 处理本地上传的图片
const handleImageUploadSuccess = async (event: ImageUpdateEvent) => {
  if (item.value && id.value === event.itemId) {
    try {
      item.value.image_id = event.imageId;
      await putItem(id.value, item.value);
      ElMessage.success(t("meta.metaEdit.image.updateSuccess"));
      await refresh();
    } catch (error) {
      console.error("Failed to update meta image:", error);
      ElMessage.error(t("meta.metaEdit.image.updateError"));
    }
  }
};

const onSubmit = async () => {
  const valid = await itemForm.value!.validate();
  if (valid && item.value) {
    item.value.prefab = item.value.prefab ? 1 : 0;
    await putItem(id.value, item.value);
    ElMessage.success(t("meta.metaEdit.success"));
    await refresh();
  } else {
    console.error("error submit!!");
    ElMessage.error(t("verse.view.error2"));
  }
};

onMounted(refresh);
</script>

<style scoped>
.box-item {
  cursor: pointer;
}
</style>
