<template>
  <TransitionWrapper>
    <div class="project-index">
      <br />
      <el-container>
        <el-header>
          <MrPPHeader :sorted="sorted" :searched="searched" @search="search" @sort="sort">
            <el-button-group :inline="true">
              <!-- 原上传路由按钮注释
              <router-link to="/resource/voxel/upload">
                <el-button size="small" type="primary" icon="UploadFilled">
                  <span class="hidden-sm-and-down">{{
                    $t("voxel.uploadVoxel")
                  }}</span>
                </el-button>
              </router-link>
              -->
              <el-button size="small" type="primary" icon="UploadFilled" @click="openUploadDialog">
                <span class="hidden-sm-and-down">{{ $t("voxel.uploadVoxel") }}</span>
              </el-button>
            </el-button-group>
          </MrPPHeader>
        </el-header>
        <el-main>
          <el-card>
            <Waterfall :list="items" :width="320" :gutter="10" :backgroundColor="'rgba(255, 255, 255, .05)'">
              <template #default="{ item }">
                <MrPPCard :item="item" @named="namedWindow" @deleted="deletedWindow">
                  <template #enter>
                    <router-link :to="`/resource/voxel/view?id=${item.id}`">
                      <el-button-group :inline="true">
                        <el-button v-if="item.info === null || item.image === null" type="warning" size="small">
                          {{ $t("voxel.initializeVoxelData") }}
                        </el-button>
                        <el-button v-else type="primary" size="small">
                          {{ $t("voxel.viewVoxel") }}
                        </el-button>
                      </el-button-group>
                    </router-link>
                  </template>
                </MrPPCard>
              </template>
            </Waterfall>
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
      <mr-p-p-upload-dialog v-model="uploadDialogVisible" dir="voxel" :file-type="fileType" @save-resource="saveVoxel"
        @success="handleUploadSuccess">
        {{ $t("voxel.uploadFile") }}
      </mr-p-p-upload-dialog>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { getVoxels, putVoxel, deleteVoxel, postVoxel } from "@/api/v1/resources/index";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import MrPPUploadDialog from "@/components/MrPP/MrPPUploadDialog/index.vue";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElLoading } from "element-plus";

const { t } = useI18n();
const router = useRouter();

// 上传弹窗相关
const uploadDialogVisible = ref(false);
const fileType = ref(".vox, application/octet-stream"); // vox文件类型

interface Pagination {
  current: number;
  count: number;
  size: number;
  total: number;
}

const items = ref<any[]>([]);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const pagination = ref<Pagination>({
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
      text: t("voxel.initializingModels"),
      background: 'rgba(0, 0, 0, 0.7)'
    });

    // 记录初始化失败的模型ID
    const failedModelIds = [];

    try {
      for (let i = 0; i < modelIds.length; i++) {
        loadingInstance.setText(t("voxel.initializingModelProgress", {
          current: i + 1,
          total: modelIds.length,
          percentage: Math.round(((i + 1) / modelIds.length) * 100)
        }));

        try {
          // 跳转到模型详情页触发初始化
          await router.push({
            path: "/resource/voxel/view",
            query: { id: modelIds[i] },
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (modelError) {
          console.error(`初始化体素 ${modelIds[i]} 失败:`, modelError);
          failedModelIds.push(modelIds[i]);
        }
      }

      if (failedModelIds.length > 0) {
        ElMessage.warning({
          message: t("voxel.partialInitializeSuccess", {
            success: modelIds.length - failedModelIds.length,
            failed: failedModelIds.length,
            total: modelIds.length
          }),
          duration: 5000
        });

        if (failedModelIds.length > 0) {
          const shouldRetry = await ElMessageBox.confirm(
            t("voxel.retryInitializeFailed", { count: failedModelIds.length }),
            t("voxel.retryTitle"),
            {
              confirmButtonText: t("voxel.retryConfirm"),
              cancelButtonText: t("voxel.retryCancel"),
              type: "warning"
            }
          ).catch(() => false);

          if (shouldRetry === true) {
            await handleUploadSuccess(failedModelIds);
            return;
          }
          else {
            router.push({
              path: "/resource/voxel/view",
              query: { id: lastFileId },
            });
            return;
          }
        }
      } else {
        ElMessage.success({
          message: t("voxel.batchInitializeSuccess", { count: modelIds.length }),
          duration: 3000
        });
      }

      await refresh();

    } catch (error) {
      console.error("初始化体素时出错:", error);
      ElMessage.error(t("voxel.initializeError"));
    } finally {
      loadingInstance.close();
    }
  }

  // 最后跳转到最后上传的模型详情页
  router.push({
    path: "/resource/voxel/view",
    query: { id: lastFileId },
  });
};

// 保存体素模型
const saveVoxel = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void
) => {
  try {
    const response = await postVoxel({ name, file_id });
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error("Failed to save voxel:", err);
    callback(-1);
  }
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
  console.log(pagination.value.current);
};

const namedWindow = async (item: { id: number; name: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("voxel.prompt.message1"),
      t("voxel.prompt.message2"),
      {
        confirmButtonText: t("voxel.prompt.confirm"),
        cancelButtonText: t("voxel.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await named(item.id, value);
    ElMessage.success(t("voxel.prompt.success") + value);
  } catch {
    ElMessage.info(t("voxel.prompt.info"));
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

const named = (id: number, newValue: string) => {
  const voxel = { name: newValue };
  putVoxel(id, voxel)
    .then(() => {
      refresh();
    })
    .catch((err) => {
      console.log(err);
    });
};

const deletedWindow = async (item: { id: string }, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t("voxel.confirm.message1"),
      t("voxel.confirm.message2"),
      {
        confirmButtonText: t("voxel.confirm.confirm"),
        cancelButtonText: t("voxel.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleted(item.id);
    ElMessage.success(t("voxel.confirm.success"));
  } catch {
    ElMessage.info(t("voxel.confirm.info"));
    resetLoading(); // 操作取消后重置loading状态
  }
};

const deleted = async (id: number | string) => {
  try {
    await deleteVoxel(id);
    await refresh();
  } catch (error) {
    console.log(error);
  }
};

const succeed = (data: any[]) => {
  items.value = data;
};

const refresh = async () => {
  try {
    const response = await getVoxels(
      sorted.value,
      searched.value,
      pagination.value.current
    );

    pagination.value = {
      current: parseInt(response.headers["x-pagination-current-page"]),
      count: parseInt(response.headers["x-pagination-page-count"]),
      size: parseInt(response.headers["x-pagination-per-page"]),
      total: parseInt(response.headers["x-pagination-total-count"]),
    };

    if (response.data) {
      succeed(response.data);
    }
  } catch (error) {
    console.log(error);
  }
};

onMounted(() => {
  refresh();
});
</script>

<style scoped>
.hidden-sm-and-down {
  display: none;
}

@media (min-width: 768px) {
  .hidden-sm-and-down {
    display: inline;
  }
}
</style>
