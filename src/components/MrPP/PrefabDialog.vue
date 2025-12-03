<template>
  <div>
    <KnightDataDialog ref="knightData" @submit="knightDataSubmit"></KnightDataDialog>

    <el-dialog v-model="dialogVisible" width="95%" :show-close="false" @close="cancel">
      <template #header>
        <mr-p-p-header :sorted="active.sorted" :searched="active.searched" @search="search" @sort="sort">
          <el-tag>
            <b>{{ $t("verse.view.prefabDialog.title") }}</b>
          </el-tag>
        </mr-p-p-header>
        <el-divider content-position="left">
          <el-tag v-if="active.searched !== ''" size="small" closable @close="clearSearched">
            {{ active.searched }}
          </el-tag>
        </el-divider>
      </template>

      <template v-if="active && active.items">
        <waterfall v-if="active !== null && active.items !== null" :lazyload="false" :breakpoints="breakpoints"
          :gutter="8" :list="viewCards" :column-count="3" :backgroundColor="'rgba(255, 255, 255, .05)'">
          <template #default="{ item }">
            <el-card style="width: 220px" class="box-card">
              <template #header>
                <el-card shadow="hover" :body-style="{ padding: '0px' }">
                  <template #header>
                    <b class="card-title" nowrap>{{ title(item) }}</b>
                  </template>
                  <Id2Image :image="item.image ? item.image.url : null" :id="item.id" />
                  <div v-if="item.created_at" style="width: 100%; text-align: center">
                    {{ item.created_at }}
                  </div>
                </el-card>
              </template>
              <div class="clearfix">
                <el-button type="primary" size="small" @click="setup({ data: item })">{{
                  $t("verse.view.prefabDialog.select")
                }}</el-button>
              </div>
              <div class="bottom clearfix"></div>
            </el-card>
            <br />
          </template>
        </waterfall>
      </template>
      <template v-else>
        <el-skeleton></el-skeleton>
      </template>

      <template #footer>
        <el-row :gutter="0">
          <el-col :xs="16" :sm="16" :md="16" :lg="16" :xl="16">
            <el-pagination :current-page="active.pagination.current" :page-count="active.pagination.count"
              :page-size="active.pagination.size" :total="active.pagination.total" layout="prev, pager, next, jumper"
              background @current-change="handleCurrentChange"></el-pagination>
          </el-col>
          <el-col :xs="8" :sm="8" :md="8" :lg="8" :xl="8">
            <el-button-group>
              <el-button size="small" @click="dialogVisible = false">{{
                $t("verse.view.prefabDialog.cancel")
              }}</el-button>
            </el-button-group>
          </el-col>
        </el-row>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import KnightDataDialog from "@/components/MrPP/KnightDataDialog.vue";
import { getPrefabs, prefabsData } from "@/api/v1/prefab";
import Id2Image from "../Id2Image.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";

const emit = defineEmits(["selected", "cancel"]);
const dialogVisible = ref(false);
const { t } = useI18n();
const active = ref({
  items: [] as prefabsData[],
  sorted: "-created_at",
  searched: "",
  pagination: { current: 1, count: 1, size: 20, total: 20 },
});
const knightData = ref<InstanceType<typeof KnightDataDialog>>();
let verse_id = ref(-1);
let value = ref(null);

const title = (item: any) => item.title || item.name || "title";

const open = async (val?: any, v_id?: number) => {
  active.value.items = [];
  active.value.sorted = "-created_at";
  active.value.searched = "";
  active.value.pagination = { current: 1, count: 1, size: 20, total: 20 };
  verse_id.value = v_id!;
  value.value = val;
  await refresh();
  dialogVisible.value = true;
};

const refresh = async () => {
  const response = await getPrefabs(
    active.value.sorted,
    active.value.searched,
    active.value.pagination.current,
    "image"
  );
  active.value.items = response.data;
  active.value.pagination = {
    current: parseInt(response.headers["x-pagination-current-page"]),
    count: parseInt(response.headers["x-pagination-page-count"]),
    size: parseInt(response.headers["x-pagination-per-page"]),
    total: parseInt(response.headers["x-pagination-total-count"]),
  };
};

interface SchemaProperty {
  type: string;
  title: string;
  default?: any;
  value?: any;
  "ui:hidden"?: string;
  "ui:options"?: {
    placeholder?: string;
    type?: string;
    rows?: number;
  };
  minLength?: number;
}
interface Schema {
  type: string;
  required?: string[];
  properties: Record<string, SchemaProperty>;
}
const setup = ({ data }: { data: prefabsData }) => {
  console.error("setup", data);
  if (data.data) {
    knightData.value?.open({
      schema: data.info as Schema,
      data: {},
      callback: (setup: any) => {
        selected({ data, setup });
        dialogVisible.value = false;
      },
    });
  } else {
    selected({ data, setup: {} });
    dialogVisible.value = false;
  }
};

const selected = async (data: any = null) => {
  console.log("data", data);
  if (data) {
    const title = await input(t("verse.view.prefabDialog.input"));
    data.title = title;
    emit("selected", data);
  } else {
    emit("selected", null);
  }
  dialogVisible.value = false;
};

const input = async (text: string): Promise<string> => {
  try {
    const { value } = await ElMessageBox.prompt(
      text,
      t("verse.view.prefabDialog.prompt.message"),
      {
        confirmButtonText: t("verse.view.prefabDialog.prompt.confirm"),
        cancelButtonText: t("verse.view.prefabDialog.prompt.cancel"),
      }
    );
    return value;
  } catch {
    ElMessage.info(t("verse.view.prefabDialog.prompt.info"));
    throw new Error("User cancelled input");
  }
};

const cancel = () => {
  emit("cancel");
};

const handleCurrentChange = async (page: number) => {
  active.value.pagination.current = page;
  await refresh();
};

const search = async (value: string) => {
  active.value.searched = value;
  await refresh();
};

const sort = async (value: string) => {
  active.value.sorted = value;
  await refresh();
};

const clearSearched = async () => {
  active.value.searched = "";
  await refresh();
};

const knightDataSubmit = (data: any) => {
  console.error(data);
};

onMounted(() => {
  refresh();
});

defineExpose({
  open,
});

type ViewCard = {
  src: string;
  id?: string;
  name?: string;
  star?: boolean;
  backgroundColor?: string;
  [attr: string]: any;
};

// 瀑布流数据类型转换
const transformToViewCard = (items: prefabsData[]): ViewCard[] => {
  return items.map((item) => {
    return {
      src: item.image.url,
      id: item.id ? item.id.toString() : undefined,
      name: item.title,
      data: item.data,
      info: item.info,
      uuid: item.uuid,
      image_id: item.image_id,
      image: item.image,
      resources: item.resources,
    };
  });
};

const viewCards = computed(() => {
  const cards = transformToViewCard(active.value.items);
  console.log("viewCards", cards);
  return cards;
});

const breakpoints = ref({
  3000: {
    //当屏幕宽度小于等于3000
    rowPerView: 8, // 一行8图
  },
  1800: {
    //当屏幕宽度小于等于1800
    rowPerView: 6, // 一行6图
  },
  1200: {
    //当屏幕宽度小于等于1200
    rowPerView: 4,
  },

  500: {
    //当屏幕宽度小于等于500
    rowPerView: 2,
  },
});
</script>
