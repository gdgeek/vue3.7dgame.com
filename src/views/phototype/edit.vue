<template>
  <div>
    <br />
    <el-row :gutter="20" style="margin: 0 18px">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">{{ t("phototype.edit.jsonFormat") }}</b>
          </template>
          <el-card class="box-card" style="margin-bottom: 10px">
            <el-form label-width="80px">
              <el-form-item :label="t('phototype.edit.name')">
                <el-input
                  v-if="phototype"
                  v-model="phototype.title"
                  :placeholder="t('phototype.edit.enterName')"
                  style="width: 100%"
                ></el-input>
              </el-form-item>
              <el-form-item :label="t('phototype.edit.type')">
                <el-input
                  v-if="phototype"
                  v-model="phototype.type"
                  :placeholder="t('phototype.edit.enterType')"
                  style="width: 100%"
                ></el-input>
              </el-form-item>
            </el-form>
          </el-card>
          <json-schema-editor
            class="schema"
            :value="tree"
            disabledType
            lang="zh_CN"
            custom
            :extra="extraSetting"
          ></json-schema-editor>
          <br />
          <el-card class="box-card" style="min-height: 500px">
            <codemirror v-model="jsonStr"></codemirror>
          </el-card>
          <br />
          <el-button
            icon="Edit"
            @click="saveChanges"
            type="primary"
            size="small"
            style="width: 100%"
          >
            {{ t("common.button.save") }}
          </el-button>
        </el-card>
        <br />

        <br />
      </el-col>

      <el-col :sm="8">
        <div v-if="phototype">
          <el-card class="box-card" style="margin-bottom: 20px">
            <template #header>
              <b>{{ t("phototype.edit.previewImage") }}</b>
            </template>
            <div style="display: flex; justify-content: center">
              <ImageSelector
                :item-id="phototype.id"
                :image-url="phototype.image?.url"
                @image-selected="handleImageUpdate"
                @image-upload-success="handleImageUpdate"
              ></ImageSelector>
            </div>
          </el-card>

          <Resource
            v-if="phototype"
            @selected="handleSelected"
            :resource="phototype.resource ?? null"
          ></Resource>
          <br />
          <Transform
            v-if="phototype && phototype.data && phototype.data.transform"
            :data="phototype.data.transform"
            @save="handleTransformSave"
          ></Transform>
        </div>
        <br />

        <br />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
// @ts-ignore
import JsonSchemaEditorPlugin from "json-schema-editor-vue3";
import "json-schema-editor-vue3/lib/json-schema-editor-vue3.css";

// The package exports a Vue plugin object { 0: Component, install: fn }
// We need to extract the actual component to use it directly in the template
const JsonSchemaEditor = JsonSchemaEditorPlugin[0] ?? JsonSchemaEditorPlugin;
import { logger } from "@/utils/logger";
import { getPhototype, putPhototype, postPhototype } from "@/api/v1/phototype";
import type { PhototypeType } from "@/api/v1/types/phototype";
import type { ResourceInfo } from "@/api/v1/resources/model";
import Codemirror from "@/components/Codemirror.vue";
import Resource from "@/components/Resource.vue";
import Transform from "@/components/Transform.vue";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

type TransformData = {
  scale: { x: number; y: number; z: number };
  rotate: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
};
const handleTransformSave = async (transform: TransformData) => {
  if (!phototype.value) return;
  if (!id.value) {
    ElMessage.warning(t("phototype.edit.saveBasicFirst"));
    return;
  }
  const response = await putPhototype(id.value, {
    data: { ...phototype.value.data, transform },
  });
  ElMessage.success(t("common.message.saveSuccess"));
  phototype.value = response.data;
};
const handleSelected = async (data: ResourceInfo) => {
  if (!phototype.value) {
    return;
  }
  if (!id.value) {
    ElMessage.warning(t("phototype.edit.saveBasicFirst"));
    return;
  }
  if (phototype.value.resource_id == data.id) {
    return;
  }
  const response = await putPhototype(id.value, {
    resource_id: data.id,
  });
  phototype.value = response.data;
};

const handleImageUpdate = async (data: {
  imageId: number;
  itemId: number | null;
}) => {
  if (!id.value) {
    ElMessage.warning(t("phototype.edit.saveBasicFirst"));
    return;
  }
  try {
    const response = await putPhototype(id.value, {
      image_id: data.imageId,
    });
    phototype.value = response.data;
    logger.log("Image updated successfully", response.data);
  } catch (error) {
    logger.error("Failed to update image", error);
  }
};

const route = useRoute();
const router = useRouter();
const id = computed(() => route.query.id as string);
const tree = ref({
  root: {
    type: "object",
    title: t("phototype.edit.condition"),
  },
});

const saveChanges = async () => {
  try {
    if (!phototype.value || !phototype.value.title) {
      ElMessage.warning(t("phototype.prompt.message1"));
      return;
    }

    if (!id.value) {
      // 新建
      const response = await postPhototype({
        title: phototype.value.title,
        type: phototype.value.type,
        schema: tree.value,
        data: phototype.value.data,
      });
      ElMessage.success(t("common.message.createSuccess"));
      // 跳转到编辑页面
      router.replace({
        path: "/phototype/edit",
        query: { id: response.data.id },
      });
      phototype.value = response.data;
    } else {
      // 更新
      await putPhototype(id.value, {
        title: phototype.value.title,
        type: phototype.value.type,
        schema: tree.value,
        data: phototype.value.data,
      });
      ElMessage.success(t("common.message.saveSuccess"));
    }
  } catch (error) {
    logger.error("Failed to save phototype", error);
    ElMessage.error(t("common.message.saveFailed"));
  }
};

const phototype = ref<PhototypeType | null>(null);

const jsonStr = computed({
  get: () => JSON.stringify(tree.value, null, 2),
  set: (newVal: string) => {
    try {
      tree.value = JSON.parse(newVal);
    } catch (e) {}
  },
});

const refresh = async () => {
  // 如果没有 id，说明是新建，初始化空数据
  if (!id.value) {
    phototype.value = {
      title: "",
      type: "",
      data: {
        transform: {
          scale: { x: 1, y: 1, z: 1 },
          rotate: { x: 0, y: 0, z: 0 },
          position: { x: 0, y: 0, z: 0 },
        },
      },
      schema: null,
    };
    tree.value = {
      root: {
        type: "object",
        title: t("phototype.edit.condition"),
      },
    };
    return;
  }

  try {
    const response = await getPhototype(id.value);
    phototype.value = response.data;
    if (phototype.value) {
      if (!phototype.value.data) {
        phototype.value.data = {};
      }
      if (!phototype.value.data.transform) {
        phototype.value.data.transform = {
          scale: { x: 1, y: 1, z: 1 },
          rotate: { x: 0, y: 0, z: 0 },
          position: { x: 0, y: 0, z: 0 },
        };
      }
    }
    if (phototype.value && phototype.value.schema) {
      tree.value = phototype.value.schema;
    } else {
      tree.value = {
        root: {
          type: "object",
          title: t("phototype.edit.condition"),
        },
      };
    }
    // tree.value = JSON.parse(phtototype.value.schema);
  } catch (error) {
    logger.error("Failed to fetch phototype", error);
  }
};
onMounted(() => {
  refresh();
});
const extraSetting = {
  integer: {
    default: {
      name: t("phototype.edit.defaultValue"),
      type: "integer",
    },
  },
  string: {
    default: {
      name: t("phototype.edit.defaultValue"),
      type: "integer",
    },
  },
};
</script>
<style>
* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

.title {
  height: 100px;
  font-size: 40px;
  font-weight: bold;
  line-height: 100px;
  text-align: center;
}

.version {
  font-size: 16px;
}

.desc {
  width: 80vw;
  min-width: 800px;
  padding: 20px;
  padding: 0 3em;
  margin: auto;
  font-size: 1.2em;
}

.container {
  display: flex;
  justify-content: center;
  width: 80vw;
  min-width: 800px;
  height: calc(100vh - 150px);
  padding: 20px;
  margin: auto;
}

.code-container {
  max-height: 600px;
  overflow: auto;
}

.schema {
  width: 100%;
  height: 400px;
  padding: 12px;
  margin-right: 10px;
  margin-left: 0;
  overflow: hidden auto;
  border: 1px solid rgb(0 0 0 / 10%);
  border-radius: 8px;
}

.CodeMirror {
  height: 100% !important;
}

.vue-codemirror {
  flex: 1;
  min-height: 300px;
  margin: 0 24px;
  overflow: auto;
  border: 1px solid rgb(0 0 0 / 10%);
  border-radius: 6px;
}
</style>
