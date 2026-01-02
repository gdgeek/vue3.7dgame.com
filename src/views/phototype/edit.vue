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
            <el-input
              v-if="phototype"
              v-model="phototype.type"
              style="width: 240px"
              placeholder="Please input"
            ></el-input>
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
            <codemirror v-model="jsonStr" :readOnly="false"></codemirror>
          </el-card>
          <br />
          <el-button
            icon="Edit"
            @click="saveChanges"
            type="primary"
            size="small"
            style="width: 100%"
          >
            保存
          </el-button>
        </el-card>
        <br />

        <br />
      </el-col>

      <el-col :sm="8">
        <div v-if="phototype">
          <Resource
            v-if="phototype"
            @selected="handleSelected"
            :resource="phototype.resource"
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
import { getPhototype, putPhototype } from "@/api/v1/phototype";
import Codemirror from "@/components/Codemirror.vue";
import GenerateSchema from "generate-schema";
import Resource from "@/components/Resource.vue";
import Transform from "@/components/Transform.vue";
import { useRoute } from "vue-router";

const handleTransformSave = async (transform: any) => {
  const response = await putPhototype(id.value, {
    data: { ...phototype.value.data, transform },
  });
  ElMessage.success("保存成功a");
  phototype.value = response.data;
};
const handleSelected = async (data: any) => {
  if (!phototype.value) {
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
const route = useRoute();
const id = computed(() => route.query.id as string);
const tree = ref({
  root: {
    type: "object",
    title: "条件",
  },
});

const saveChanges = async () => {
  try {
    await putPhototype(id.value, {
      type: phototype.value.type,
      schema: tree.value,
    });
    ElMessage.success("保存成功b");
  } catch (error) {
    console.error("Failed to save phototype", error);
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
