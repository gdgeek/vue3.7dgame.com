<template>
  <div>
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
          <el-tag
            ><b>{{ $t("verse.view.metaDialog.title") }}</b></el-tag
          >
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
          :width="230"
          :gutter="10"
          :list="viewCards"
          :backgroundColor="'rgba(255, 255, 255, .05)'"
        >
          <template #default="{ item }">
            <div style="width: 230px">
              <el-card style="width: 220px" class="box-card">
                <template #header>
                  <el-card shadow="hover" :body-style="{ padding: '0px' }">
                    <template #header>
                      <b class="card-title" nowrap>{{ title(item) }}</b>
                    </template>
                    <router-link :to="'/meta/meta-edit?id=' + item.id">
                      <Id2Image
                        :image="item.image ? item.image.url : null"
                        :id="item.id"
                      ></Id2Image>
                    </router-link>
                  </el-card>
                </template>
                <div class="clearfix">
                  <el-button
                    type="primary"
                    size="small"
                    @click="selected({ data: item })"
                    >{{ $t("verse.view.metaDialog.select") }}</el-button
                  >
                </div>
              </el-card>
            </div>
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
              <el-button type="success" size="small" @click="create">
                {{ $t("verse.view.metaDialog.create") }}
              </el-button>
              <el-button size="small" @click="dialogVisible = false">
                {{ $t("verse.view.metaDialog.cancel") }}
              </el-button>
            </el-button-group>
          </el-col>
        </el-row>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import Id2Image from "../Id2Image.vue";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { getMetas, metaInfo, postMeta } from "@/api/v1/meta";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import type { VerseMetaRelation } from "@/api/v1/types/meta";

const emit = defineEmits(["selected", "cancel"]);

const verse_id = ref(-1);
const value = ref(null);
const dialogVisible = ref(false);
const { t } = useI18n();
const active = ref({
  items: [] as metaInfo[],
  sorted: "-created_at",
  searched: "",
  pagination: { current: 1, count: 1, size: 20, total: 20 },
});

type MetaSelection = {
  data: metaInfo;
  title?: string;
};

const title = (item: metaInfo) => {
  return item.title || item.name || "title";
};

const open = async (newValue?: unknown, newVerseId?: number) => {
  try {
    active.value = {
      items: [],
      sorted: "-created_at",
      searched: "",
      pagination: { current: 1, count: 1, size: 20, total: 20 },
    };
    verse_id.value = newVerseId!;
    value.value = newValue;
    await refresh();
    dialogVisible.value = true;
  } catch (error) {
    console.error("Error in open method:", error);
  }
};

const refresh = async () => {
  const response = await getMetas(
    active.value.sorted,
    active.value.searched,
    active.value.pagination.current,
    "image"
  );
  active.value.items = response.data;
  console.log("active", active);
  active.value.pagination = {
    current: parseInt(
      String(response.headers["x-pagination-current-page"] ?? "1")
    ),
    count: parseInt(String(response.headers["x-pagination-page-count"] ?? "1")),
    size: parseInt(String(response.headers["x-pagination-per-page"] ?? "20")),
    total: parseInt(
      String(response.headers["x-pagination-total-count"] ?? "0")
    ),
  };
};

const sort = (value: string) => {
  active.value.sorted = value;
  refresh();
};

const search = (value: string) => {
  active.value.searched = value;
  refresh();
};

const clearSearched = () => {
  active.value.searched = "";
  refresh();
};

const selected = async (data: MetaSelection | null) => {
  if (data) {
    // const title = await input(t("verse.view.metaDialog.input1"));
    data.title = data.data.title;
    console.log("metadata", data);
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
      t("verse.view.metaDialog.prompt.message"),
      {
        confirmButtonText: t("verse.view.metaDialog.prompt.confirm"),
        cancelButtonText: t("verse.view.metaDialog.prompt.cancel"),
      }
    )) as { value: string };
    return value;
  } catch {
    ElMessage.info(t("verse.view.metaDialog.prompt.info"));
    throw new Error("User cancelled input");
  }
};

const create = async () => {
  const name = await input(t("verse.view.metaDialog.input2"));
  const response = await postMeta({
    title: name || "新建实体",
    custom: 1,
    uuid: uuidv4(),
  });
  selected({ data: response.data });
};

const cancel = () => {
  emit("cancel");
};

const handleCurrentChange = (page: number) => {
  active.value.pagination.current = page;
  refresh();
};

defineExpose({
  open,
});

type ViewCard = {
  src?: string;
  id?: string;
  name?: string;
  star?: boolean;
  backgroundColor?: string;
  author_id: number;
  info: metaInfo["info"];
  data: metaInfo["data"];
  events: metaInfo["events"];
  title: metaInfo["title"];
  uuid: metaInfo["uuid"];
  prefab: metaInfo["prefab"];
  image_id: metaInfo["image_id"];
  image: metaInfo["image"];
  resources: metaInfo["resources"];
  editable: metaInfo["editable"];
  viewable: metaInfo["viewable"];
  verseMetas: metaInfo["verseMetas"];
};

// 瀑布流数据类型转换
const transformToViewCard = (items: metaInfo[]): ViewCard[] => {
  return items.map((item) => {
    return {
      src: item.image?.url,
      id: item.id ? item.id.toString() : undefined,
      author_id: item.author_id,
      name: item.title,
      info: item.info,
      data: item.data,
      events: item.events,
      title: item.title,
      uuid: item.uuid,
      prefab: item.prefab,
      image_id: item.image_id,
      image: item.image,
      resources: item.resources,
      editable: item.editable,
      viewable: item.viewable,
      verseMetas: item.verseMetas,
    };
  });
};

const viewCards = computed(() => {
  const cards = transformToViewCard(active.value.items);
  console.log("viewCards", cards);
  return cards;
});
</script>
