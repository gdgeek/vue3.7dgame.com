<template>
  <div class="meta-detail">
    <br />
    <el-row :gutter="20" style="margin: 0px 18px 0">
      <el-col :sm="16">
        <el-card v-if="item" class="box-card">
          <template #header>
            <el-form
              ref="itemForm"
              :rules="rules"
              v-if="item"
              :model="item"
              label-width="80px"
            >
              <el-form-item
                :label="$t('meta.metaEdit.form.title')"
                prop="title"
              >
                <el-input v-model="item.title" @change="onSubmit"></el-input>
              </el-form-item>
              <el-form-item
                :label="$t('meta.metaEdit.form.picture')"
                prop="title"
              >
                <div class="box-item" style="width: 100%; text-align: center">
                  <ImageSelector
                    :imageUrl="image"
                    :itemId="item.id"
                    @image-selected="handleImageSelected"
                    @image-upload-success="handleImageUploadSuccess"
                  ></ImageSelector>
                </div>
              </el-form-item>
              <el-form-item v-if="prefab" label="Info" prop="title">
                <el-input
                  v-model="jsonInfo"
                  type="textarea"
                  @change="onSubmit"
                ></el-input>
              </el-form-item>
            </el-form>
          </template>
        </el-card>
        <br />
        <el-card v-if="item !== null" class="box-card">
          <el-button
            v-if="item.viewable"
            @click="editor"
            icon="Edit"
            type="primary"
            size="small"
            style="width: 100%"
          >
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
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { getMeta, putMeta, metaInfo } from "@/api/v1/meta";
import { translateRouteTitle } from "@/utils/i18n";
import { useI18n } from "vue-i18n";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import { ElMessage, ElForm } from "element-plus";

const props = defineProps<{
  metaId: number;
}>();

const emit = defineEmits(["changed"]);

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

const prefab = computed({
  get: () => item.value?.prefab === 1,
  set: (value: boolean) => {
    if (item.value) {
      item.value.prefab = value ? 1 : 0;
    }
  },
});

const image = computed(() => {
  if (item.value && item.value.image) {
    return item.value.image.url;
  }
  return "";
});

const jsonInfo = computed({
  get() {
    if (!item.value?.info) return "";
    try {
      return JSON.stringify(JSON.parse(item.value.info), null, 2);
    } catch (e) {
      return item.value.info;
    }
  },
  set(value: string) {
    try {
      if (item.value) {
        item.value.info = JSON.stringify(JSON.parse(value));
      }
    } catch (error) {
      console.error("Invalid JSON format", error);
    }
  },
});

const refresh = async () => {
  if (!props.metaId) return;
  try {
    const data = await getMeta(props.metaId, { expand: "image,author" });
    item.value = data.data; // getMeta returns AxiosResponse, so data.data
  } catch (error) {
    console.error("Failed to fetch meta data:", error);
  }
};

watch(
  () => props.metaId,
  () => {
    refresh();
  },
  { immediate: true }
);

const editor = () => {
  if (item.value) {
    const sceneRoute = router
      .getRoutes()
      .find((route) => route.path === "/meta/scene");
    if (sceneRoute && sceneRoute.meta.title) {
      const metaTitle = translateRouteTitle(
        sceneRoute.meta.title
      ).toLowerCase();
      router.push({
        path: "/meta/scene",
        query: {
          id: props.metaId,
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
  if (item.value && item.value.id === event.itemId) {
    try {
      item.value.image_id = event.imageId;
      await putMeta(item.value.id, item.value);
      ElMessage.success(t("meta.metaEdit.image.updateSuccess"));
      await refresh();
      emit("changed");
    } catch (error) {
      console.error("Failed to update meta image:", error);
      ElMessage.error(t("meta.metaEdit.image.updateError"));
    }
  }
};

// 处理本地上传的图片
const handleImageUploadSuccess = async (event: ImageUpdateEvent) => {
  if (item.value && item.value.id === event.itemId) {
    try {
      item.value.image_id = event.imageId;
      await putMeta(item.value.id, item.value);
      ElMessage.success(t("meta.metaEdit.image.updateSuccess"));
      await refresh();
      emit("changed");
    } catch (error) {
      console.error("Failed to update meta image:", error);
      ElMessage.error(t("meta.metaEdit.image.updateError"));
    }
  }
};

const onSubmit = async () => {
  if (!itemForm.value) return;
  const valid = await itemForm.value.validate();
  if (valid && item.value) {
    item.value.prefab = item.value.prefab ? 1 : 0;
    await putMeta(item.value.id, item.value);
    ElMessage.success(t("meta.metaEdit.success"));
    await refresh();
    emit("changed");
  } else {
    console.error("error submit!!");
    ElMessage.error(t("verse.view.error2"));
  }
};
</script>

<style scoped>
.box-item {
  cursor: pointer;
}
</style>
