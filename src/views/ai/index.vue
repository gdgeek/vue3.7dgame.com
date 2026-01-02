<template>
  <div class="ai-index">
    <el-container>
      <el-header>
        <mr-p-p-header
          :sorted="sorted"
          :searched="searched"
          @search="search"
          @sort="sort"
        >
          <el-button-group :inline="true">
            <router-link to="/ai/generation">
              <el-button size="small" type="primary" icon="uploadFilled">
                <span class="hidden-sm-and-down">{{ $t("ai.create") }}</span>
              </el-button>
            </router-link>
          </el-button-group>
        </mr-p-p-header>
      </el-header>
      <el-main>
        <el-card style="width: 100%; min-height: 400px">
          <Waterfall
            :list="items"
            :width="320"
            :gutter="20"
            :backgroundColor="'rgba(255, 255, 255, .05)'"
          >
            <template #default="{ item }">
              <el-card>
                <template #header>
                  <div class="card-header">
                    <span>{{ item.name }}</span>
                  </div>
                </template>
                <LazyImg
                  v-if="item.resource && item.resource.image"
                  :url="item.resource.image.url"
                  style="width: 100%"
                >
                </LazyImg>
                <b> {{ item.id }}</b
                ><br />
                <el-rate
                  v-model="item.step"
                  :void-icon="CircleCloseFilled"
                  :icons="{
                    4: InfoFilled,
                    5: SuccessFilled,
                  }"
                  :colors="{
                    4: '#FF9900',
                    5: '#409eff',
                  }"
                  disabled
                  size="small"
                ></el-rate>
                <el-button
                  v-if="item.step == 5"
                  type="primary"
                  size="small"
                  @click="show(item.resource.id)"
                  >{{ $t("ai.show") }}</el-button
                >
                <el-button
                  @click="del(item.id)"
                  v-else-if="item.step == 0"
                  type="danger"
                  size="small"
                  >{{ $t("ai.delete") }}</el-button
                >
                <el-button
                  v-else
                  size="small"
                  type="success"
                  @click="generation(item.id)"
                  >{{ $t("ai.generate") }}</el-button
                >
              </el-card>
            </template>
          </Waterfall>
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
const router = useRouter();
import {
  CircleCloseFilled,
  WarningFilled,
  InfoFilled,
  SuccessFilled,
} from "@element-plus/icons-vue";
import aiRodin from "@/api/v1/ai-rodin";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";

const items = ref<any[]>([]);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const pagination = reactive({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});
const { t } = useI18n();

// 处理分页
const handleCurrentChange = async (page: number) => {
  pagination.current = page;
  await refresh();
  console.log(pagination.current);
};
const generation = async (id: number) => {
  router.push({ path: "/ai/generation", query: { id: id } });
};
const del = async (id: number) => {
  ElMessageBox.confirm(t("ai.confirm.message1"), t("ai.confirm.message2"), {
    confirmButtonText: t("ai.confirm.confirm"),
    cancelButtonText: t("ai.confirm.cancel"),
    type: "warning",
  })
    .then(async () => {
      await aiRodin.del(id);
      await refresh();
      ElMessage.success(t("ai.confirm.success"));
    })
    .catch(() => {
      ElMessage.info(t("ai.confirm.info"));
    });
};
const show = (resource_id: number) => {
  router.push({ path: "/resource/polygen/view", query: { id: resource_id } });
};
// 排序
const sort = (value: string) => {
  sorted.value = value;
  refresh();
};

// 搜索
const search = (value: string) => {
  searched.value = value;
  refresh();
};
// 刷新数据
const refresh = async () => {
  try {
    const response = await aiRodin.list(
      sorted.value,
      searched.value,
      pagination.current
    );
    pagination.current = parseInt(
      response.headers["x-pagination-current-page"]
    );
    pagination.count = parseInt(response.headers["x-pagination-page-count"]);
    pagination.size = parseInt(response.headers["x-pagination-per-page"]);
    pagination.total = parseInt(response.headers["x-pagination-total-count"]);
    if (response.data) {
      items.value = response.data;
    }
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => refresh());
</script>

<style scoped>
.ai-index {
  padding: 20px;
}
</style>
