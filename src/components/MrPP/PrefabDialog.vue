<template>
  <div>
    <KnightDataDialog
      ref="knightData"
      @submit="knightDataSubmit"
    ></KnightDataDialog>

    <el-dialog
      v-model="dialogVisible"
      width="95%"
      :show-close="false"
      @close="cancel"
    >
      <template #header>
        <mr-p-p-header
          :sorted="active.sorted"
          :searched="active.searched"
          @search="search"
          @sort="sort"
        >
          <el-tag>
            <b>{{ $t("verse.view.prefabDialog.title") }}</b>
          </el-tag>
        </mr-p-p-header>
        <el-divider content-position="left">
          <el-tag
            v-if="active.searched !== ''"
            size="small"
            closable
            @close="clearSearched"
          >
            {{ active.searched }}
          </el-tag>
        </el-divider>
      </template>

      <template v-if="active && active.items">
        <waterfall
          v-if="active !== null && active.items !== null"
          :lazyload="false"
          :breakpoints="breakpoints"
          :gutter="8"
          :list="viewCards"
          :column-count="3"
          :backgroundColor="'rgba(255, 255, 255, .05)'"
        >
          <template #default="{ item }">
            <el-card style="width: 220px" class="box-card">
              <template #header>
                <el-card shadow="hover" :body-style="{ padding: '0px' }">
                  <template #header>
                    <b class="card-title" nowrap>{{ title(item) }}</b>
                  </template>
                  <Id2Image
                    :image="item.image ? item.image.url : null"
                    :id="item.id"
                  ></Id2Image>
                  <div
                    v-if="item.created_at"
                    style="width: 100%; text-align: center"
                  >
                    {{ item.created_at }}
                  </div>
                </el-card>
              </template>
              <div class="clearfix">
                <el-button
                  type="primary"
                  size="small"
                  @click="setup({ data: item })"
                  >{{ $t("verse.view.prefabDialog.select") }}</el-button
                >
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
            <el-pagination
              :current-page="active.pagination.current"
              :page-count="active.pagination.count"
              :page-size="active.pagination.size"
              :total="active.pagination.total"
              layout="prev, pager, next, jumper"
              background
              @current-change="handleCurrentChange"
            ></el-pagination>
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
import { logger } from "@/utils/logger";
import { Waterfall } from "vue-waterfall-plugin-next";
import KnightDataDialog from "@/components/MrPP/KnightDataDialog.vue";
import { getPrefabs, prefabsData } from "@/api/v1/prefab";
import Id2Image from "../Id2Image.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import type { JsonValue } from "@/components/JsonSchemaForm/types";
import { useDialogList } from "@/composables/useDialogList";

const emit = defineEmits(["selected", "cancel"]);
const { t } = useI18n();

const {
  dialogVisible,
  active,
  sort,
  search,
  clearSearched,
  handleCurrentChange,
  openDialog,
} =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useDialogList<prefabsData>(
    (sorted, searched, page) =>
      getPrefabs(sorted, searched, page, "image") as any
  );

const knightData = ref<InstanceType<typeof KnightDataDialog>>();
const verse_id = ref(-1);
const value = ref<unknown>(null);

const title = (item: prefabsData) => item.title || "title";

const open = async (val?: unknown, v_id?: number) => {
  verse_id.value = v_id!;
  value.value = val;
  await openDialog();
};

const setup = ({ data }: { data: prefabsData }) => {
  logger.error("setup", data);
  if (data.data) {
    knightData.value?.open({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: data.info as any,
      data: {},
      callback: (setup: Record<string, unknown>) => {
        selected({ data, setup: setup as Record<string, JsonValue> });
        dialogVisible.value = false;
      },
    });
  } else {
    selected({ data, setup: {} });
    dialogVisible.value = false;
  }
};

type PrefabSelection = {
  data: prefabsData;
  setup?: Record<string, JsonValue>;
  title?: string;
};

const selected = async (data: PrefabSelection | null = null) => {
  logger.log("data", data);
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
    const { value } = (await ElMessageBox.prompt(
      text,
      t("verse.view.prefabDialog.prompt.message"),
      {
        confirmButtonText: t("verse.view.prefabDialog.prompt.confirm"),
        cancelButtonText: t("verse.view.prefabDialog.prompt.cancel"),
      }
    )) as { value: string };
    return value;
  } catch {
    ElMessage.info(t("verse.view.prefabDialog.prompt.info"));
    throw new Error("User cancelled input");
  }
};

const cancel = () => {
  emit("cancel");
};

const knightDataSubmit = (data: Record<string, JsonValue>) => {
  logger.error(data);
};

onMounted(() => {
  openDialog();
});

defineExpose({
  open,
});

type ViewCard = {
  src?: string;
  id?: string;
  name?: string;
  data: prefabsData["data"];
  info: prefabsData["info"];
  uuid: prefabsData["uuid"];
  image_id: prefabsData["image_id"];
  image: prefabsData["image"];
  resources: prefabsData["resources"];
};

const transformToViewCard = (items: prefabsData[]): ViewCard[] => {
  return items.map((item) => ({
    src: item.image?.url,
    id: item.id ? item.id.toString() : undefined,
    name: item.title,
    data: item.data,
    info: item.info,
    uuid: item.uuid,
    image_id: item.image_id,
    image: item.image,
    resources: item.resources,
  }));
};

const viewCards = computed(() => {
  const cards = transformToViewCard(active.value.items);
  logger.log("viewCards", cards);
  return cards;
});

const breakpoints = ref({
  3000: { rowPerView: 8 },
  1800: { rowPerView: 6 },
  1200: { rowPerView: 4 },
  500: { rowPerView: 2 },
});
</script>
