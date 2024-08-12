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

              <span class="hidden-sm-and-down">创建【元数据】</span>
            </el-button>
          </el-button-group>
        </mr-p-p-header>
      </el-header>
      <el-main>
        <el-row>
          <waterfall
            v-if="viewCards.length > 0"
            :lazyload="false"
            :breakpoints="breakpoints"
            :gutter="8"
            :list="viewCards"
            :column-count="3"
          >
            <template #item="{ item }">
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
                          src="@/assets/image/none.png"
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
                      编辑</el-button
                    >

                    <el-button
                      @click="del(item.id)"
                      size="small"
                      type="danger"
                      icon="Delete"
                    >
                      删除</el-button
                    >
                  </el-button-group>
                </div>
                <div class="bottom clearfix"></div>
              </el-card>
              <br />
            </template>
          </waterfall>
          <!-- <template v-else>
              <el-skeleton></el-skeleton>
            </template> -->
        </el-row>
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

// 引入 Vue Router
const router = useRouter();

// 数据定义
const items = ref<prefabsData[]>([]);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const pagination = ref({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});

const userStore = useUserStore();

const isRoot = computed(() => userStore.userInfo.roles.includes("manager"));

const url = (id: number) => {
  return isRoot.value ? `/meta/prefab-edit?id=${id}` : "#";
};

const editor = (id: number) => {
  router.push({ path: "/meta/prefab-edit", query: { id } });
};

const del = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      "此操作将永久删除该【元数据】, 是否继续?",
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
    await deletePrefab(id);
    await refresh();
    ElMessage.success("删除成功!");
  } catch (e) {
    console.error(e);
    ElMessage.info("已取消删除");
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
      "请输元数据名称",
      "提示(3-20个字符)",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        inputValidator: (value: string) => {
          if (!value) return "元数据名称不能为空";
          if (value.length < 3) return "元数据名称不能小于3个字符";
          if (value.length > 20) return "元数据名称不能大于20个字符";
          return true;
        },
      }
    );

    ElMessage.success("元数据名称是: " + input.value);
    const data = {
      title: input.value,
      custom: 1,
      uuid: uuidv4(),
    };
    const response = await postPrefab(data);
    await editPrefab(response.data.id);
  } catch (e) {
    console.error(e);
    ElMessage.info("取消输入");
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
  src: any;
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
