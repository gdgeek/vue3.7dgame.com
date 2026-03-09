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
            ><b>{{ $t("game.verseDialog.title") }}</b></el-tag
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

      <waterfall
        v-if="viewCards.length > 0"
        :lazyload="true"
        :width="230"
        :list="viewCards"
        :gutter="10"
        :backgroundColor="'rgba(255, 255, 255, .05)'"
      >
        <template #default="{ item }">
          <el-card style="width: 220px" class="box-card">
            <template #header>
              <el-card shadow="hover" :body-style="{ padding: '0px' }">
                <span class="mrpp-title">
                  <b class="card-title" style="white-space: nowrap">
                    {{ title(item) }}
                  </b>
                </span>
                <Id2Image
                  :image="item.image ? item.image.url : null"
                  :id="item.id"
                ></Id2Image>
                <div style="width: 100%; text-align: center">
                  {{ convertToLocalTime(item.created_at) }}
                </div>
              </el-card>
            </template>

            <div class="clearfix">
              <el-button size="small" @click="selected({ data: item })">
                {{ $t("game.verseDialog.select") }}
              </el-button>
            </div>
            <div class="bottom clearfix"></div>
          </el-card>
          <br />
        </template>
      </waterfall>
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
                {{ $t("game.verseDialog.create") }}
              </el-button>
              <el-button size="small" @click="dialogVisible = false">
                {{ $t("game.verseDialog.cancel") }}
              </el-button>
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
import "vue-waterfall-plugin-next/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { getVerses } from "@/api/v1/vp-guide";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { postMeta } from "@/api/v1/meta";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import Id2Image from "@/components/Id2Image.vue";
import type { FileInfo } from "@/api/v1/types/common";
import { useDialogList } from "@/composables/useDialogList";

type VerseItem = {
  id: number;
  name?: string;
  title?: string;
  created_at?: string;
  info?: string | null;
  data?: unknown;
  uuid?: string;
  type?: string;
  image?: FileInfo | null;
};

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
} = useDialogList<VerseItem>(
  (sorted, searched, page) =>
    getVerses({
      sort: sorted,
      search: searched,
      page,
      expand: "image",
    }) as Promise<{ data: VerseItem[]; headers: Record<string, unknown> }>
);

const title = (item: VerseItem) => item.title || item.name || "title";

const open = () => {
  openDialog();
};

const selected = async (data: { data: VerseItem } | null = null) => {
  emit("selected", data);
  dialogVisible.value = false;
};

const create = async () => {
  try {
    const { value: name } = (await ElMessageBox.prompt(
      t("game.verseDialog.prompt.message1"),
      t("game.verseDialog.prompt.message2"),
      {
        confirmButtonText: t("game.verseDialog.prompt.confirm"),
        cancelButtonText: t("game.verseDialog.prompt.cancel"),
      }
    )) as { value: string };

    const response = await postMeta({
      title: name || "新建实体",
      prefab: 0,
      uuid: uuidv4(),
    });

    selected({ data: response.data });
    dialogVisible.value = false;
  } catch (error) {
    logger.log(error);
    ElMessage.info(t("game.verseDialog.prompt.info"));
  }
};

const cancel = () => {
  emit("cancel");
};

defineExpose({
  open,
});

type ViewCard = {
  src?: FileInfo | null;
  id?: string;
  created_at?: string;
  name?: string;
  info?: string | null;
  data?: unknown;
  uuid?: string;
  type?: string;
  image?: FileInfo | null;
};

const transformToViewCard = (items: VerseItem[]): ViewCard[] => {
  return items.map((item) => ({
    src: item.image,
    id: item.id ? item.id.toString() : undefined,
    created_at: item.created_at,
    name: item.name,
    info: item.info,
    data: item.data,
    uuid: item.uuid,
    type: item.type,
    image: item.image,
  }));
};

const viewCards = computed(() => transformToViewCard(active.value.items));
</script>
