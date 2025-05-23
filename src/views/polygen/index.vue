<template>
  <TransitionWrapper>
    <div class="project-index">
      <br />
      <el-container>
        <el-header>
          <mr-p-p-header :sorted="sorted" :searched="searched" @search="search" @sort="sort">
            <el-button-group :inline="true">
              <router-link to="/resource/polygen/upload">
                <el-button size="small" type="primary" icon="uploadFilled">
                  <span class="hidden-sm-and-down">{{
                    $t("polygen.uploadPolygen")
                  }}</span>
                </el-button>
              </router-link>
            </el-button-group>
          </mr-p-p-header>
        </el-header>
        <el-main>
          <el-card style="width: 100%; min-height: 400px;">
            <Waterfall v-if="items" :list="items" :width="320" :gutter="10"
              :backgroundColor="'rgba(255, 255, 255, .05)'">
              <template #default="{ item }">
                <mr-p-p-card :item="item" @named="namedWindow" @deleted="deletedWindow">
                  <template #info>
                    <polygen-index :file="item.file" @progress="progress" />
                    <el-progress v-if="percentage === 100" :percentage="100" status="success"></el-progress>
                    <el-progress v-else :percentage="percentage"></el-progress>
                  </template>
                  <template #enter>
                    <router-link :to="`/resource/polygen/view?id=${item.id}`">
                      <el-button-group :inline="true">
                        <el-button v-if="item.info === null || item.image === null" type="warning" size="small">
                          {{ $t("polygen.initializePolygenData") }}
                        </el-button>
                        <el-button v-else type="primary" size="small">
                          {{ $t("polygen.viewPolygen") }}
                        </el-button>
                      </el-button-group>
                    </router-link>
                  </template>
                </mr-p-p-card>
              </template>
            </Waterfall>
            <el-skeleton v-else :rows="8" animated />
          </el-card>
        </el-main>
        <el-footer>
          <el-card class="box-card">
            <el-pagination :current-page="pagination.current" :page-count="pagination.count"
              :page-size="pagination.size" :total="pagination.total" layout="prev, pager, next, jumper" background
              @current-change="handleCurrentChange"></el-pagination>
          </el-card>
        </el-footer>
      </el-container>
      <br />
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { getPolygens, putPolygen, deletePolygen } from "@/api/v1/resources/index";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

// 组件状态
const { t } = useI18n();
const items = ref<any[] | null>(null);
const sorted = ref("-created_at");
const searched = ref("");
const percentage = ref(0);

// 分页配置
const pagination = ref({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});

// 进度更新
const progress = (progress: number) => {
  percentage.value = progress;
};

// 数据加载与刷新
const refresh = async () => {
  try {
    const response = await getPolygens(
      sorted.value,
      searched.value,
      pagination.value.current
    );
    const headers = response.headers;

    // 更新分页信息
    pagination.value = {
      current: parseInt(headers["x-pagination-current-page"]),
      count: parseInt(headers["x-pagination-page-count"]),
      size: parseInt(headers["x-pagination-per-page"]),
      total: parseInt(headers["x-pagination-total-count"]),
    };

    if (response.data) {
      items.value = response.data;
    }
  } catch (error) {
    console.error(error);
  }
};

// 分页处理
const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
};

// 搜索处理
const search = (value: string) => {
  searched.value = value;
  refresh();
};

// 排序处理
const sort = (value: string) => {
  sorted.value = value;
  refresh();
};

// 重命名处理
const namedWindow = async (item: { id: number; name: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("polygen.prompt.message1"),
      t("polygen.prompt.message2"),
      {
        confirmButtonText: t("polygen.prompt.confirm"),
        cancelButtonText: t("polygen.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await named(item.id, value);
    ElMessage.success(t("polygen.prompt.success") + value);
  } catch {
    ElMessage.info(t("polygen.prompt.info"));
  }
};

// 修改模型名称API调用
const named = async (id: number, newValue: string) => {
  try {
    await putPolygen(id, { name: newValue });
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 删除确认
const deletedWindow = async (item: { id: string }) => {
  try {
    await ElMessageBox.confirm(
      t("polygen.confirm.message1"),
      t("polygen.confirm.message1"),
      {
        confirmButtonText: t("polygen.confirm.confirm"),
        cancelButtonText: t("polygen.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleted(item.id);
    ElMessage.success(t("polygen.confirm.success"));
  } catch {
    ElMessage.info(t("polygen.confirm.info"));
  }
};

// 删除模型API调用
const deleted = async (id: string) => {
  try {
    await deletePolygen(id);
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 生命周期钩子
onMounted(() => {
  refresh();
});
</script>
