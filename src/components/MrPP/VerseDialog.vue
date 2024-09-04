<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      width="95%"
      height="95px"
      :show-close="false"
      @close="cancel"
    >
      <template #title>
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
                <img
                  v-if="item.image"
                  style="width: 100%; height: 180px"
                  fit="contain"
                  :src="item.image.url"
                  lazy
                />
                <div style="width: 100%; text-align: center">
                  {{ item.created_at }}
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
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { getVerses } from "@/api/v1/vp-guide";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { postMeta } from "@/api/v1/meta";

const dialogVisible = ref(false);
const active = ref({
  items: [] as any[],
  sorted: "-created_at",
  searched: "",
  pagination: { current: 1, count: 1, size: 20, total: 20 },
});

const emit = defineEmits(["selected", "cancel"]);
const { t } = useI18n();

const title = (item: any) => item.title || item.name || "title";

const open = () => {
  active.value = {
    items: [],
    sorted: "-created_at",
    searched: "",
    pagination: { current: 1, count: 1, size: 20, total: 20 },
  };
  refresh();
  dialogVisible.value = true;
};

const refresh = async () => {
  const response = await getVerses(
    active.value.sorted,
    active.value.searched,
    active.value.pagination.current,
    "image"
  );
  active.value.items = response.data;
};

const close = () => {
  dialogVisible.value = false;
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

const selected = async (data: any = null) => {
  emit("selected", data);
  dialogVisible.value = false;
};

const create = async () => {
  try {
    const { value: name } = await ElMessageBox.prompt(
      t("game.verseDialog.prompt.message1"),
      t("game.verseDialog.prompt.message2"),
      {
        confirmButtonText: t("game.verseDialog.prompt.confirm"),
        cancelButtonText: t("game.verseDialog.prompt.cancel"),
      }
    );

    const response = await postMeta({
      title: name || "新建元数据",
      prefab: 0,
      uuid: uuidv4(),
    });

    selected({ data: response.data });
    dialogVisible.value = false;
  } catch (error) {
    console.log(error);
    ElMessage.info(t("game.verseDialog.prompt.info"));
  }
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
  src: string;
  id?: string;
  name?: string;
  star?: boolean;
  backgroundColor?: string;
  [attr: string]: any;
};

// 瀑布流数据类型转换
const transformToViewCard = (items: any[]): ViewCard[] => {
  return items.map((item) => {
    return {
      src: item.image,
      id: item.id ? item.id.toString() : undefined,
      created_at: item.created_at,
      name: item.name,
      info: item.info,
      data: item.data,
      uuid: item.uuid,
      type: item.type,
      image: item.image,
    };
  });
};

const viewCards = computed(() => {
  const cards = transformToViewCard(active.value.items);
  console.log("viewCards", cards);
  return cards;
});
</script>
