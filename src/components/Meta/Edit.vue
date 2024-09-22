<template>
  <div class="verse-view">
    <event-dialog
      v-if="item"
      :node="JSON.parse(item.events!)"
      uuid="uuid"
      @post-event="postEvent"
      @on-submit="onSubmit"
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
                <div
                  class="box-item"
                  @click="selectImage"
                  style="width: 100%; text-align: center"
                >
                  <el-image
                    fit="contain"
                    style="width: 100%; height: 300px"
                    :src="image"
                  ></el-image>
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
          <div
            v-if="events && events.outputs && events.outputs.length > 0"
            :label="$t('meta.metaEdit.form.input')"
          >
            <el-divider content-position="left">{{
              $t("meta.metaEdit.form.input")
            }}</el-divider>
            <span v-for="(i, index) in events.outputs" :key="index">
              <el-tag size="small">
                {{ i.title }}
              </el-tag>
              &nbsp;
            </span>
          </div>
          <div
            v-if="events && events.inputs && events.inputs.length > 0"
            :label="$t('meta.metaEdit.form.output')"
          >
            <el-divider content-position="left">{{
              $t("meta.metaEdit.form.output")
            }}</el-divider>
            <span v-for="(i, index) in events.inputs" :key="index">
              <el-tag size="small">
                {{ i.title }}
              </el-tag>
              &nbsp;
            </span>
          </div>
        </el-card>
        <br />
        <el-card v-if="item !== null" class="box-card">
          <el-button-group style="float: right; padding: 3px 0">
            <el-button @click="openDialog" icon="MagicStick">
              {{ $t("meta.metaEdit.eventEdit") }}
            </el-button>
            <el-button v-if="item.viewable" @click="editor" icon="Edit">
              {{ $t("meta.metaEdit.contentEdit") }}
            </el-button>
            <el-button @click="onSubmit" icon="CircleCheck" type="success">
              {{ $t("meta.metaEdit.save") }}
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
              <b>{{ $t("meta.metaEdit.metaInfo") }}</b>
            </div>
          </template>
          <div class="box-item"></div>
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
import { translateRouteTitle } from "@/utils/i18n";

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
const dialog = ref<InstanceType<typeof EventDialog> | null>(null);
const resourceDialog = ref<InstanceType<typeof ResourceDialog> | null>();
console.log("resourceDialog:", resourceDialog.value);

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

const custome = computed({
  get() {
    return item.value?.custome !== false;
  },
  set(value: boolean) {
    if (item.value) {
      item.value.custome = value ? true : false;
    }
  },
});

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
console.log("jsonInfo:", jsonInfo);

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
    ElMessage.success(t("meta.metaEdit.success"));
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
