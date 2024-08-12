<template>
  <div class="verse-view">
    <event-dialog
      v-if="item"
      :node="JSON.parse(item.events!)"
      uuid="uuid"
      @post-event="postEvent"
      ref="dialog"
    ></event-dialog>
    <resource-dialog
      @selected="selectResources"
      @cancel="openResources"
      ref="resourceDialog"
    ></resource-dialog>
    <el-row :gutter="20" style="margin: 28px 18px 0">
      <el-col :sm="16">
        <el-card v-if="item" class="box-card">
          <template #header>
            <div>
              <b id="title">【元数据】名称：</b>
              <span>{{ item.title }}</span>
            </div>
          </template>

          <div class="box-item" @click="selectImage">
            <el-image
              fit="contain"
              style="width: 100%; height: 300px"
              :src="image"
            ></el-image>
          </div>
        </el-card>
        <br />
        <el-card class="box-card">
          <el-form
            ref="itemForm"
            :rules="rules"
            v-if="item"
            :model="item"
            label-width="80px"
          >
            <el-form-item label="名称" prop="title">
              <el-input v-model="item.title"></el-input>
            </el-form-item>

            <el-form-item
              v-if="events && events.inputs && events.inputs.length > 0"
              label="输入事件"
            >
              <span v-for="(event, index) in events.inputs" :key="index">
                <el-tag size="small">
                  {{ event.title }}
                </el-tag>
                &nbsp;
              </span>
            </el-form-item>
            <el-form-item
              v-if="events && events.outputs && events.outputs.length > 0"
              label="输出事件"
            >
              <span v-for="(event, index) in events.outputs" :key="index">
                <el-tag size="small">
                  {{ event.title }}
                </el-tag>
                &nbsp;
              </span>
            </el-form-item>
            <el-form-item label="数据">
              <el-input type="textarea" v-model="item.data"></el-input>
            </el-form-item>
            <el-form-item label="信息">
              <el-input type="textarea" v-model="item!.info"></el-input>
            </el-form-item>
          </el-form>
        </el-card>
        <br />
        <el-card v-if="item !== null" class="box-card">
          <el-button-group style="float: right; padding: 3px 0">
            <el-button @click="openDialog" icon="MagicStick">
              事件编辑
            </el-button>
            <el-button v-if="item.viewable" @click="editor" icon="Edit">
              内容编辑
            </el-button>
            <el-button @click="onSubmit" icon="CircleCheck" type="success">
              信息保存
            </el-button>
          </el-button-group>
          <br />
          <br />
        </el-card>
        <br />
      </el-col>

      <el-col :sm="8">
        <el-card class="box-card">
          <template #header>
            <div>
              <b>【元数据】信息</b>
            </div>
          </template>
          <div class="box-item">{{ item }}</div>
          <br />
        </el-card>
        <br />
        <br />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import EventDialog from "@/components/Rete/EventDialog.vue";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import type { metaInfo } from "@/api/v1/meta";
import { ViewCard } from "vue-waterfall-plugin-next/dist/types/types/waterfall";

const route = useRoute();
const router = useRouter();
const item = ref<metaInfo | null>(null);
const rules = {
  title: [
    { required: true, message: "请输入名称", trigger: "blur" },
    { min: 3, max: 20, message: "长度在 3 到 20 个字符", trigger: "blur" },
  ],
};
const itemForm = ref<InstanceType<typeof ElForm> | null>(null);
const dialog = ref<InstanceType<typeof EventDialog> | null>(null);
const resourceDialog = ref<InstanceType<typeof ResourceDialog> | null>();
console.log("resourceDialog:", resourceDialog.value);

const id = computed(() => parseInt(route.query.id as string, 10));

const emit = defineEmits(["getItem", "putItem"]);

// const custom = computed({
//   get() {
//     return item.value?.custom !== 0;
//   },
//   set(value: boolean) {
//     if (item.value) {
//       item.value.custom = value ? 1 : 0;
//     }
//   },
// });

type Event = {
  title: string;
  uuid: string;
};

const events = computed(() => {
  if (item.value) {
    return JSON.parse(item.value.events!) as {
      inputs: Event[];
      outputs: Event[];
    };
  }
  return { inputs: [], outputs: [] };
});

const image = computed(() => {
  if (item.value && item.value.image) {
    return item.value.image.url;
  }
  return "";
});

const refresh = async () => {
  const data = await getItem(id.value, { expand: "image,author" });
  item.value = data;
};

const getItem = async (id: number, expand: any) => {
  return new Promise<metaInfo>((resolve, reject) => {
    try {
      emit("getItem", id, expand, (data: metaInfo) => {
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
    console.log("sceneRoute", sceneRoute);
    // 如果找到了路由对象并且它有 meta.title，就进行拼接
    if (sceneRoute && sceneRoute.meta.title) {
      const metaTitle = sceneRoute.meta.title as string;
      router.push({
        path: "/meta/scene",
        query: {
          id: id.value,
          title: metaTitle + item.value.title,
        },
      });
    }
  }
};

const openResources = (
  options: { value: any; callback: any; type: any } = {
    value: null,
    callback: null,
    type: null,
  }
) => {
  // Handle resource dialog opening logic here
};

const selectResources = async (data: ViewCard) => {
  if (item.value) {
    item.value.image_id = data.image_id;
    await putItem(id.value, item.value);
    ElMessage.success("保存成功");
    await refresh();
  }
};

const selectImage = () => {
  if (resourceDialog.value) {
    console.log("测试");
    resourceDialog.value.openIt({
      type: "picture",
    });
  }
};

const postEvent = async ({
  uuid,
  node,
  inputs,
  outputs,
}: {
  uuid: string;
  node: any;
  inputs: Event[];
  outputs: Event[];
}) => {
  if (item.value) {
    item.value.events = JSON.stringify({ inputs, outputs });
  }
  if (dialog.value) {
    dialog.value.close();
  }
};

const openDialog = () => {
  if (dialog.value) {
    dialog.value.open();
  }
};

const onSubmit = async () => {
  if (item.value) {
    // item.value.custom = custom.value ? 1 : 0;
    await putItem(id.value, item.value);
    ElMessage.success("保存成功");
    await refresh();
  }
};

onMounted(refresh);
</script>

<style scoped>
.box-item {
  cursor: pointer;
}
</style>
