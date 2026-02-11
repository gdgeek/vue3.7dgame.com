<template>
  <div class="verse-detail">
    <el-row :gutter="20">
      <el-col :sm="16">
        <el-card v-if="verse" class="box-card">
          <template #header>
            <i v-if="saveable">
              <el-icon>
                <EditPen></EditPen>
              </el-icon>
            </i>
            <i v-else>
              <el-icon>
                <View></View>
              </el-icon>
            </i>
            <b id="title">{{ $t("verse.view.title") }}</b>
            <span>{{ verse.name }}</span>
          </template>

          <template #footer>
            <div style="display: flex; align-items: center; gap: 12px">
              <tags v-if="verse && verse.verseTags" :editable="verse.editable" @add="addTags" @remove="removeTags"
                :verseTags="verse.verseTags"></tags>
              <el-switch v-if="verse && isAdmin" v-model="verse.public" :active-text="$t('verse.view.public.open')"
                :inactive-text="$t('verse.view.public.private')" @change="handlePublicChange"></el-switch>
            </div>
          </template>

          <div class="box-item">
            <ImageSelector :imageUrl="verse.image ? verse.image.url : ''" :itemId="verse.id"
              @image-selected="handleImageSelected" @image-upload-success="handleImageUploadSuccess"></ImageSelector>
          </div>
        </el-card>

        <br />

        <!-- 操作按钮卡片 -->
        <el-card v-if="verse" class="box-card">
          <div style="display: flex; gap: 8px; align-items: center">
            <el-button style="flex: 1" type="primary" @click="comeIn">
              <div v-if="saveable">
                <font-awesome-icon icon="edit"></font-awesome-icon>
                &nbsp;{{ $t("verse.view.edit") }}
              </div>
              <div v-else>
                <font-awesome-icon icon="eye"></font-awesome-icon>
                &nbsp;{{ $t("verse.view.eye") }}
              </div>
            </el-button>
            <ExportButton :verseId="verse.id" />
          </div>
        </el-card>

        <br />
      </el-col>

      <el-col :sm="8">
        <el-card class="box-card">
          <template #header>
            <b>{{ $t("verse.view.info") }}</b>
          </template>
          <div class="box-item">
            <InfoContent v-if="verse" :verse="verse"></InfoContent>
            <aside style="margin-top: 10px; margin-bottom: 30px">
              <el-button-group style="float: right"></el-button-group>
            </aside>
          </div>
          <VerseToolbar v-if="verse" :verse="verse" @deleted="deleted" @changed="changed"></VerseToolbar>
          <br />
        </el-card>

        <br />
        <br />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import Tags from "@/components/Tags.vue";
import InfoContent from "@/components/MrPP/MrPPVerse/InfoContent.vue";
import VerseToolbar from "@/components/MrPP/MrPPVerse/MrPPVerseToolbar.vue";
import {
  getVerse,
  putVerse,
  VerseData,
  addTag,
  removeTag,
  addPublic,
  removePublic,
} from "@/api/v1/verse";
import { useUserStore } from "@/store/modules/user";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import ExportButton from "@/components/ScenePackage/ExportButton.vue";
import { EditPen, View } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

const props = defineProps<{
  verseId: number;
}>();

const emit = defineEmits(["deleted", "changed"]);

const router = useRouter();
const { t } = useI18n();

const verse = ref<VerseData | null>(null);

const userStore = useUserStore();
const isAdmin = computed(() => {
  // 显式引用 userInfo 以确保响应式更新
  const _ = userStore.userInfo;
  const role = userStore.getRole();
  return role === userStore.RoleEnum.Root || role === userStore.RoleEnum.Admin;
});

const saveable = computed(() => (verse.value ? verse.value.editable : false));

const refresh = async () => {
  if (!props.verseId) return;
  try {
    const response = await getVerse(
      props.verseId,
      "image,author,verseTags,public"
    );
    verse.value = response.data;
  } catch (error) {
    console.error("Failed to fetch verse data:", error);
    return;
  }
};

watch(
  () => props.verseId,
  () => {
    refresh();
  },
  { immediate: true }
);

const deleted = () => {
  emit("deleted");
};

const changed = () => {
  refresh();
  emit("changed");
};

// 处理从资源库选择的图片
interface ImageUpdateEvent {
  imageId: number;
  itemId: number | null;
}

const handleImageSelected = async (event: ImageUpdateEvent) => {
  if (verse.value && verse.value.id === event.itemId) {
    try {
      const updateData = {
        id: verse.value.id,
        name: verse.value.name,
        description: verse.value.description,
        uuid: verse.value.uuid,
        image_id: event.imageId,
      };

      await putVerse(verse.value.id, updateData);
      ElMessage.success(t("verse.view.image.updateSuccess"));
      await refresh();
      emit("changed");
    } catch (error) {
      console.error("Failed to update verse image:", error);
      ElMessage.error(t("verse.view.image.updateError"));
    }
  }
};

const handleImageUploadSuccess = async (event: ImageUpdateEvent) => {
  if (verse.value && verse.value.id === event.itemId) {
    try {
      const updateData = {
        id: verse.value.id,
        name: verse.value.name,
        description: verse.value.description,
        uuid: verse.value.uuid,
        image_id: event.imageId,
      };

      await putVerse(verse.value.id, updateData);
      ElMessage.success(t("verse.view.image.updateSuccess"));
      await refresh();
      emit("changed");
    } catch (error) {
      console.error("Failed to update verse image:", error);
      ElMessage.error(t("verse.view.image.updateError"));
    }
  }
};

const removeTags = async (
  tagId: number,
  resolve: () => void = () => { },
  reject: () => void = () => { }
) => {
  try {
    await ElMessageBox.confirm(
      t("verse.view.tags.confirmRemove.message"),
      t("verse.view.tags.confirmRemove.title"),
      {
        confirmButtonText: t("verse.view.tags.confirmRemove.confirm"),
        cancelButtonText: t("verse.view.tags.confirmRemove.cancel"),
        type: "warning",
      }
    );
    await removeTag(verse.value!.id, tagId);
    await refresh();
    resolve();
    ElMessage.success(t("verse.view.tags.confirmRemove.success"));
  } catch (e) {
    reject();
    ElMessage.error(t("verse.view.tags.confirmRemove.error"));
  }
};

const addTags = async (
  tagId: number,
  resolve: () => void = () => { },
  reject: () => void = () => { }
) => {
  try {
    await ElMessageBox.confirm(
      t("verse.view.tags.confirmAdd.message"),
      t("verse.view.tags.confirmAdd.title"),
      {
        confirmButtonText: t("verse.view.tags.confirmAdd.confirm"),
        cancelButtonText: t("verse.view.tags.confirmAdd.cancel"),
        type: "warning",
      }
    );
    await addTag(verse.value!.id, tagId);
    await refresh();
    resolve();
    ElMessage.success(t("verse.view.tags.confirmAdd.success"));
  } catch (e) {
    reject();
    ElMessage.error(t("verse.view.tags.confirmAdd.error"));
  }
};

const handlePublicChange = async (value: string | number | boolean) => {
  if (!verse.value) return;
  const isPublic = Boolean(value);
  try {
    if (isPublic) {
      await addPublic(verse.value.id);
      ElMessage.success(t("verse.view.public.addSuccess"));
    } else {
      await removePublic(verse.value.id);
      ElMessage.success(t("verse.view.public.removeSuccess"));
    }
    emit("changed");
  } catch (error) {
    // 恢复原值
    verse.value.public = !isPublic;
    ElMessage.error(t("verse.view.public.error"));
  }
};

const comeIn = () => {
  router.push({
    path: "/verse/scene",
    query: {
      id: props.verseId,
      title: t("verse.view.scene") + "【" + verse.value?.name + "】",
    },
  });
};
</script>

<style scoped>
.box-card {
  margin-bottom: 20px;
}
</style>
