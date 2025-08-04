<template>
  <TransitionWrapper>
    <div class="project-index">
      <br />
      <el-container>
        <el-header>
          <mr-p-p-header :sorted="sorted" :searched="searched" @search="search" @sort="sort">
            <el-button-group :inline="true">
              <!-- 原上传路由按钮注释
              <router-link to="/resource/polygen/upload">
                <el-button size="small" type="primary" icon="uploadFilled">
                  <span class="hidden-sm-and-down">{{
                    $t("polygen.uploadPolygen")
                  }}</span>
                </el-button>
              </router-link>
              -->
              <el-button size="small" type="primary" icon="uploadFilled" @click="openUploadDialog">
                <span class="hidden-sm-and-down">{{ $t("polygen.uploadPolygen") }}</span>
              </el-button>
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

      <!-- 新增上传弹窗组件 -->
      <mr-p-p-upload-dialog v-model="uploadDialogVisible" dir="polygen" :file-type="fileType"
        @save-resource="savePolygen" @success="handleUploadSuccess">
        {{ $t("polygen.uploadFile") }}
      </mr-p-p-upload-dialog>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { getPolygens, putPolygen, deletePolygen, postPolygen } from "@/api/v1/resources/index";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import MrPPUploadDialog from "@/components/MrPP/MrPPUploadDialog/index.vue";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElLoading } from "element-plus";

// 组件状态
const { t } = useI18n();
const items = ref<any[] | null>(null);
const sorted = ref("-created_at");
const searched = ref("");
const percentage = ref(0);
const router = useRouter();

// 上传弹窗相关
const uploadDialogVisible = ref(false);
const fileType = ref(".glb");

// 分页配置
const pagination = ref({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});

// 打开上传弹窗
const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

// 上传成功后处理
const handleUploadSuccess = async (uploadedIds: number | number[]) => {
  uploadDialogVisible.value = false;

  // 确保uploadedIds是数组
  const modelIds = Array.isArray(uploadedIds) ? uploadedIds : [uploadedIds];
  const lastFileId = modelIds[modelIds.length - 1];

  if (modelIds.length > 0) {
    const loadingInstance = ElLoading.service({
      text: t("polygen.initializingModels"),
      background: 'rgba(0, 0, 0, 0.7)'
    });

    // 记录初始化失败的模型ID
    const failedModelIds = [];

    try {
      for (let i = 0; i < modelIds.length; i++) {
        loadingInstance.setText(t("polygen.initializingModelProgress", {
          current: i + 1,
          total: modelIds.length,
          percentage: Math.round(((i + 1) / modelIds.length) * 100)
        }));

        try {
          // 跳转到模型详情页触发初始化
          await router.push({
            path: "/resource/polygen/view",
            query: { id: modelIds[i] },
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (modelError) {
          console.error(`初始化模型 ${modelIds[i]} 失败:`, modelError);
          failedModelIds.push(modelIds[i]);
        }
      }

      if (failedModelIds.length > 0) {
        ElMessage.warning({
          message: t("polygen.partialInitializeSuccess", {
            success: modelIds.length - failedModelIds.length,
            failed: failedModelIds.length,
            total: modelIds.length
          }),
          duration: 5000
        });

        if (failedModelIds.length > 0) {
          const shouldRetry = await ElMessageBox.confirm(
            t("polygen.retryInitializeFailed", { count: failedModelIds.length }),
            t("polygen.retryTitle"),
            {
              confirmButtonText: t("polygen.retryConfirm"),
              cancelButtonText: t("polygen.retryCancel"),
              type: "warning"
            }
          ).catch(() => false);

          if (shouldRetry === true) {
            await handleUploadSuccess(failedModelIds);
            return;
          }
          else {
            router.push({
              path: "/resource/polygen/view",
              query: { id: lastFileId },
            });
            return;
          }
        }
      } else {
        ElMessage.success({
          message: t("polygen.batchInitializeSuccess", { count: modelIds.length }),
          duration: 3000
        });
      }

      await refresh();

    } catch (error) {
      console.error("初始化模型时出错:", error);
      ElMessage.error(t("polygen.initializeError"));
    } finally {
      loadingInstance.close();
    }
  }

  // 最后跳转到最后上传的模型详情页
  router.push({
    path: "/resource/polygen/view",
    query: { id: lastFileId },
  });
};

// 保存模型
const savePolygen = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void
) => {
  try {
    const response = await postPolygen({ name, file_id });
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error("Failed to save polygen:", err);
    callback(-1);
  }
};

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
const deletedWindow = async (item: { id: string }, resetLoading: () => void) => {
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
    resetLoading(); // 操作取消后重置loading状态
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

<style scoped>
/* 添加响应式样式 */
@media screen and (max-width: 768px) {

  /* 移动端适配 */
  :deep(.el-card) {
    margin-bottom: 1rem;
  }

  :deep(.el-pagination) {
    justify-content: center;
    flex-wrap: wrap;
  }
}

/* 添加列表项目动画 */
:deep(.waterfall-item) {
  transition: all 0.3s ease-in-out;
  animation: fadeInUp 0.5s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
