<template>
  <TransitionWrapper>
    <div class="project-index">
      <br />
      <el-container>
        <el-header>
          <mr-p-p-header :sorted="sorted" :searched="searched" @search="search" @sort="sort">
            <el-button-group :inline="true">
              <!-- 原上传路由按钮注释
              <router-link to="/resource/audio/upload">
                <el-button size="small" type="primary" icon="uploadFilled">
                  <span class="hidden-sm-and-down">{{
                    $t("audio.uploadAudio")
                  }}</span>
                </el-button>
              </router-link>
              -->
              <el-button size="small" type="primary" icon="uploadFilled" @click="openUploadDialog">
                <span class="hidden-sm-and-down">{{ $t("audio.uploadAudio") }}</span>
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
                  <template #bar>
                    <audio class="audio-player" controls style="width: 100%; height: 30px" :src="item.file.url"
                      @play="handleAudioPlay"></audio>
                  </template>
                  <template #enter>
                    <router-link :to="`/resource/audio/view?id=${item.id}`">
                      <el-button v-if="item.info === null || item.image === null" type="warning" size="small">
                        {{ $t("audio.initializeAudioData") }}
                      </el-button>
                      <el-button v-else type="primary" size="small">{{
                        $t("audio.viewAudio")
                        }}</el-button>
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
      <mr-p-p-upload-dialog v-model="uploadDialogVisible" dir="audio" :file-type="fileType" @save-resource="saveAudio"
        @success="handleUploadSuccess">
        {{ $t("audio.uploadFile") }}
      </mr-p-p-upload-dialog>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { getAudios, putAudio, deleteAudio, postAudio } from "@/api/v1/resources/index";
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
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const router = useRouter();

const currentPlayingAudio = ref<HTMLAudioElement | null>(null);

//
const handleAudioPlay = (event: Event) => {
  const audioElement = event.target as HTMLAudioElement;

  if (currentPlayingAudio.value && currentPlayingAudio.value !== audioElement) {
    currentPlayingAudio.value.pause();
  }
  currentPlayingAudio.value = audioElement;
};

// 上传弹窗相关
const uploadDialogVisible = ref(false);
const fileType = ref("audio/mp3, audio/wav");

// 分页配置
const pagination = reactive({
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
      text: t("audio.initializingModels"),
      background: 'rgba(0, 0, 0, 0.7)'
    });

    // 记录初始化失败的模型ID
    const failedModelIds = [];

    try {
      for (let i = 0; i < modelIds.length; i++) {
        loadingInstance.setText(t("audio.initializingModelProgress", {
          current: i + 1,
          total: modelIds.length,
          percentage: Math.round(((i + 1) / modelIds.length) * 100)
        }));

        try {
          // 跳转到模型详情页触发初始化
          await router.push({
            path: "/resource/audio/view",
            query: { id: modelIds[i] },
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (modelError) {
          console.error(`初始化音频 ${modelIds[i]} 失败:`, modelError);
          failedModelIds.push(modelIds[i]);
        }
      }

      if (failedModelIds.length > 0) {
        ElMessage.warning({
          message: t("audio.partialInitializeSuccess", {
            success: modelIds.length - failedModelIds.length,
            failed: failedModelIds.length,
            total: modelIds.length
          }),
          duration: 5000
        });

        if (failedModelIds.length > 0) {
          const shouldRetry = await ElMessageBox.confirm(
            t("audio.retryInitializeFailed", { count: failedModelIds.length }),
            t("audio.retryTitle"),
            {
              confirmButtonText: t("audio.retryConfirm"),
              cancelButtonText: t("audio.retryCancel"),
              type: "warning"
            }
          ).catch(() => false);

          if (shouldRetry === true) {
            await handleUploadSuccess(failedModelIds);
            return;
          }
          else {
            router.push({
              path: "/resource/audio/view",
              query: { id: lastFileId },
            });
            return;
          }
        }
      } else {
        ElMessage.success({
          message: t("audio.batchInitializeSuccess", { count: modelIds.length }),
          duration: 3000
        });
      }

      await refresh();

    } catch (error) {
      console.error("初始化音频时出错:", error);
      ElMessage.error(t("audio.initializeError"));
    } finally {
      loadingInstance.close();
    }
  }

  // 最后跳转到最后上传的模型详情页
  router.push({
    path: "/resource/audio/view",
    query: { id: lastFileId },
  });
};

// 保存音频
const saveAudio = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void
) => {
  try {
    const response = await postAudio({ name, file_id });
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error("Failed to save audio:", err);
    callback(-1);
  }
};

// 处理分页变化
const handleCurrentChange = async (page: number) => {
  pagination.current = page;
  await refresh();
};

// 排序处理
const sort = (value: string) => {
  sorted.value = value;
  refresh();
};

// 搜索处理
const search = (value: string) => {
  searched.value = value;
  refresh();
};

// 修改音频名称对话框
const namedWindow = async (item: any) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("audio.prompt.message1"),
      t("audio.prompt.message2"),
      {
        confirmButtonText: t("audio.prompt.confirm"),
        cancelButtonText: t("audio.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await named(item.id, value);
    ElMessage.success(t("audio.prompt.success") + value);
  } catch {
    ElMessage.info(t("audio.prompt.info"));
  }
};

// 修改音频名称 API 调用
const named = async (id: string, newValue: string) => {
  try {
    await putAudio(id, { name: newValue });
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 删除音频确认对话框
const deletedWindow = async (item: { id: string }, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t("audio.confirm.message1"),
      t("audio.confirm.message2"),
      {
        confirmButtonText: t("audio.confirm.confirm"),
        cancelButtonText: t("audio.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleted(item.id);
    ElMessage.success(t("audio.confirm.success"));
  } catch {
    ElMessage.info(t("audio.confirm.info"));
    resetLoading(); // 操作取消后重置loading状态
  }
};

// 删除音频 API 调用
const deleted = async (id: string) => {
  try {
    await deleteAudio(id);
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 刷新数据
const refresh = async () => {
  try {
    const response = await getAudios(
      sorted.value,
      searched.value,
      pagination.current
    );

    // 更新分页信息
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

// 生命周期钩子
onMounted(() => refresh());
</script>
