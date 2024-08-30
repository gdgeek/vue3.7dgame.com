<template>
  <div>
    <br />
    <el-container>
      <el-header>
        <mr-p-p-header
          :sorted="sorted"
          :searched="searched"
          sortByTime="created_at"
          sortByName="title"
          @search="search"
          @sort="sort"
        >
          <el-button-group :inline="true">
            <el-button
              v-if="isRoot"
              size="small"
              type="primary"
              @click="addPrefab"
            >
              <font-awesome-icon icon="plus"></font-awesome-icon>

              <span class="hidden-sm-and-down">{{ $t("meta.title") }}</span>
            </el-button>
          </el-button-group>
        </mr-p-p-header>
      </el-header>
      <el-main>
        <el-card style="width: 100%">
          <waterfall
            v-if="viewCards.length > 0"
            :lazyload="false"
            :width="320"
            :gutter="8"
            :list="viewCards"
            :column-count="3"
          >
            <template #default="{ item }">
              <el-card style="width: 320px" class="box-card">
                <template #header>
                  <div>
                    <el-card shadow="hover" :body-style="{ padding: '0px' }">
                      <template #header>
                        <span class="mrpp-title">
                          <b class="card-title" nowrap>{{ item.name }}</b>
                        </span>
                      </template>
                      <router-link :to="url(item.id)">
                        <LazyImg
                          v-if="item.image === null"
                          url="@/assets/image/none.png"
                          style="
                            width: 100%;
                            height: 270px;
                            object-fit: contain;
                          "
                        ></LazyImg>
                        <LazyImg
                          v-else
                          style="width: 100%; height: 270px"
                          fit="contain"
                          :url="item.image.url"
                        ></LazyImg>
                      </router-link>
                    </el-card>
                  </div>
                </template>
                <div class="clearfix">
                  <el-button-group
                    v-if="isRoot"
                    style="float: right"
                    :inline="true"
                  >
                    <el-button
                      @click="editor(item.id)"
                      size="small"
                      type="success"
                      icon="Edit"
                    >
                    {{ $t("meta.edit") }}</el-button
                    >

                    <el-button
                      @click="del(item.id)"
                      size="small"
                      type="danger"
                      icon="Delete"
                    >
                    {{ $t("meta.delete") }}</el-button
                    >
                  </el-button-group>
                </div>
                <div class="bottom clearfix"></div>
              </el-card>
              <br />
            </template>
          </waterfall>
          <template v-else>
            <el-skeleton></el-skeleton>
          </template>
        </el-card>
      </el-main>
      <el-footer>
        <el-card class="box-card">
          <el-pagination
            :current-page="pagination.current"
            :page-count="pagination.count"
            :page-size="pagination.size"
            :total="pagination.total"
            layout="prev, pager, next, jumper"
            background
            @current-change="handleCurrentChange"
          ></el-pagination>
        </el-card>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { ElMessage, ElMessageBox } from "element-plus";
import { v4 as uuidv4 } from "uuid";
import { getPrefabs, deletePrefab, postPrefab } from "@/api/v1/prefab";
import type { prefabsData } from "@/api/v1/prefab";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { useUserStore } from "@/store/modules/user";

const router = useRouter();

const items = ref<prefabsData[]>([]);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const pagination = ref({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});

const { t } = useI18n();
const userStore = useUserStore();
const isRoot = computed(() => userStore.userInfo.roles.includes("admin" || "root"));

const url = (id: number) => {
  return isRoot.value ? `/meta/prefab-edit?id=${id}` : "#";
};

const editor = (id: number) => {
  router.push({ path: "/meta/prefab-edit", query: { id } });
};

const del = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      t("meta.confirm.message1"),
      t("meta.confirm.message2"),
      {
        confirmButtonText: t("meta.confirm.confirm"),
        cancelButtonText: t("meta.confirm.cancel"),
        type: "warning",
      }
    );
    await deletePrefab(id);
    await refresh();
    ElMessage.success(t("meta.confirm.success"));
  } catch (e) {
    console.error(e);
    ElMessage.info(t("meta.confirm.info"));
  }
};

const sort = (value: string) => {
  sorted.value = value;
  refresh();
};

const search = (value: string) => {
  searched.value = value;
  refresh();
};

const addPrefab = async () => {
  try {
    const input = await ElMessageBox.prompt(
      t("meta.prompt.message1"),
      t("meta.prompt.message2"),
      {
        confirmButtonText: t("meta.prompt.confirm"),
        cancelButtonText: t("meta.prompt.cancel"),
        inputValidator: (value: string) => {
          if (!value) return t("meta.prompt.inputValidator.item1");
          if (value.length < 3) return t("meta.prompt.inputValidator.item2");
          if (value.length > 20) return t("meta.prompt.inputValidator.item3");
          return true;
        },
      }
    );

    ElMessage.success(t("meta.prompt.success") + input.value);
    const data = {
      title: input.value,
      custom: 1,
      uuid: uuidv4(),
    };
    const response = await postPrefab(data);
    await editPrefab(response.data.id);
  } catch (e) {
    console.error(e);
    ElMessage.info(t("meta.prompt.info"));
  }
};

const editPrefab = async (id: number) => {
  router.push({ path: "/meta/prefab-edit", query: { id } });
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
};

const refresh = async () => {
  const response = await getPrefabs(
    sorted.value,
    searched.value,
    pagination.value.current,
    "image,author"
  );
  console.log("response.data", response.data);
  items.value = response.data;
  await nextTick();
  console.log("items", items.value[0].title);
};

onMounted(refresh);

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
      info: item.info,
      uuid: item.uuid,
      image_id: item.image_id,
      image: item.image,
      metaResources: item.resources,
    };
  });
};

const viewCards = computed(() => {
  const cards = transformToViewCard(items.value);
  console.log("viewCards", cards);
  return cards;
});
/*
const breakpoints = ref({
  1600: {
    //当屏幕宽度小于等于1600
    rowPerView: 4, // 一行4图
  },
  1200: {
    //当屏幕宽度小于等于1200
    rowPerView: 3, // 一行3图
  },
  800: {
    //当屏幕宽度小于等于800
    rowPerView: 2, // 一行2图
  },
  600: {
    //当屏幕宽度小于等于600
    rowPerView: 1, // 一行1图
  },
});*/
</script>

<style scoped>
.mrpp-title {
  font-size: 15px;
  padding: 0px 0px 0px 0px;
  color: #000000;
}
.card-title {
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
}

.clearfix {
  display: flex;
  justify-content: flex-end;
}
</style>
