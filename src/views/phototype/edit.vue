<template>
  <div>
    <br />
    <el-row :gutter="20" style="margin: 0px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">json格式</b>
          </template>
          <el-card class="box-card" style="margin-bottom: 10px">
            <el-form label-width="80px">
              <el-form-item label="名称">
                <el-input v-if="phototype" v-model="phototype.title" placeholder="请输入原型名称"
                  style="width: 100%"></el-input>
              </el-form-item>
              <el-form-item label="类型">
                <el-input v-if="phototype" v-model="phototype.type" placeholder="请输入类型" style="width: 100%"></el-input>
              </el-form-item>
            </el-form>
          </el-card>
          <json-schema-editor class="schema" :value="tree" disabledType lang="zh_CN" custom
            :extra="extraSetting"></json-schema-editor>
          <br />
          <el-card class="box-card" style="min-height: 500px">
            <codemirror v-model="jsonStr" :readOnly="false"></codemirror>
          </el-card>
          <br />
          <el-button icon="Edit" @click="saveChanges" type="primary" size="small" style="width: 100%">
            保存
          </el-button>
        </el-card>
        <br />

        <br />
      </el-col>

      <el-col :sm="8">
        <div v-if="phototype">
          <el-card class="box-card" style="margin-bottom: 20px">
            <template #header>
              <b>预览图</b>
            </template>
            <div style="display: flex; justify-content: center">
              <ImageSelector :item-id="phototype.id" :image-url="phototype.image?.url"
                @image-selected="handleImageUpdate" @image-upload-success="handleImageUpdate"></ImageSelector>
            </div>
          </el-card>

          <Resource v-if="phototype" @selected="handleSelected" :resource="phototype.resource"></Resource>
          <br />
          <Transform v-if="phototype && phototype.data && phototype.data.transform" :data="phototype.data.transform"
            @save="handleTransformSave"></Transform>
        </div>
        <br />

        <br />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { getPhototype, putPhototype, postPhototype } from "@/api/v1/phototype";
import Codemirror from "@/components/Codemirror.vue";
import GenerateSchema from "generate-schema";
import Resource from "@/components/Resource.vue";
import Transform from "@/components/Transform.vue";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import { useRoute, useRouter } from "vue-router";

const handleTransformSave = async (transform: any) => {
  if (!id.value) {
    ElMessage.warning("请先保存基本信息");
    return;
  }
  const response = await putPhototype(id.value, {
    data: { ...phototype.value.data, transform },
  });
  ElMessage.success("保存成功");
  phototype.value = response.data;
};
const handleSelected = async (data: any) => {
  if (!phototype.value) {
    return;
  }
  if (!id.value) {
    ElMessage.warning("请先保存基本信息");
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
    ElMessage.warning("请先保存基本信息");
    return;
  }
  try {
    const response = await putPhototype(id.value, {
      image_id: data.imageId,
    });
    phototype.value = response.data;
    console.log("Image updated successfully", response.data);
  } catch (error) {
    console.error("Failed to update image", error);
  }
};

const route = useRoute();
const router = useRouter();
const id = computed(() => route.query.id as string);
const tree = ref({
  root: {
    type: "object",
    title: "条件",
  },
});

const saveChanges = async () => {
  try {
    if (!phototype.value.title) {
      ElMessage.warning("请输入原型名称");
      return;
    }

    if (!id.value) {
      // 新建
      const response = await postPhototype({
        title: phototype.value.title,
        type: phototype.value.type,
        schema: tree.value,
      });
      ElMessage.success("创建成功");
      // 跳转到编辑页面
      router.replace({ path: "/phototype/edit", query: { id: response.data.id } });
      phototype.value = response.data;
    } else {
      // 更新
      await putPhototype(id.value, {
        title: phototype.value.title,
        type: phototype.value.type,
        schema: tree.value,
      });
      ElMessage.success("保存成功");
    }
  } catch (error) {
    console.error("Failed to save phototype", error);
    ElMessage.error("保存失败");
  }
};

const jsonStr = computed({
  get: () => JSON.stringify(tree.value, null, 2),
  set: (newVal) => {
    try {
      tree.value = JSON.parse(newVal);
    } catch (e) {
      console.error("Invalid JSON format", e);
    }
  },
});
const phototype = ref<any>(null);
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
        title: "条件",
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
          title: "条件",
        },
      };
    }
    // tree.value = JSON.parse(phtototype.value.schema);
  } catch (error) {
    console.error("Failed to fetch phototype", error);
  }
};
onMounted(() => {
  refresh();
});
const extraSetting = {
  integer: {
    default: {
      name: "默认值",
      type: "integer",
    },
  },
  string: {
    default: {
      name: "默认值",
      type: "integer",
    },
  },
};
</script>
<style>
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.title {
  text-align: center;
  font-size: 40px;
  font-weight: bold;
  height: 100px;
  line-height: 100px;
}

.version {
  font-size: 16px;
}

.desc {
  padding: 20px;
  width: 80vw;
  min-width: 800px;
  margin: auto;
  padding: 0 3em;
  font-size: 1.2em;
}

.container {
  display: flex;
  padding: 20px;
  width: 80vw;
  min-width: 800px;
  justify-content: center;
  height: calc(100vh - 150px);
  margin: auto;
}

.code-container {
  max-height: 600px;
  overflow: auto;
}

.schema {
  margin-left: 0px;
  margin-right: 10px;
  width: 100%;
  height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.CodeMirror {
  height: 100% !important;
}

.vue-codemirror {
  flex: 1;
  margin: 0 24px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  min-height: 300px;
  overflow: auto;
  border-radius: 6px;
}
</style>
