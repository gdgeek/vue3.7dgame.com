<template>
  <TransitionWrapper>
    <div class="video-index">
      <el-container>
        <el-header>
          <mr-p-p-header :sorted="sorted" :searched="searched" @search="search" @sort="sort">
            <el-button-group :inline="true">
              <!-- 原上传路由按钮注释
              <router-link to="/resource/video/upload">
                <el-button size="small" type="primary" icon="uploadFilled">
                  <span class="hidden-sm-and-down">{{
                    $t("video.uploadVideo")
                  }}</span>
                </el-button>
              </router-link>
              -->
              <el-button size="small" type="primary" icon="uploadFilled" @click="openUploadDialog">
                <span class="hidden-sm-and-down">{{ $t("video.uploadVideo") }}</span>
              </el-button>
            </el-button-group>
          </mr-p-p-header>
        </el-header>
        <el-main>
          <el-card style="width: 100%; min-height: 400px;">
            <Waterfall :list="items" :width="320" :gutter="20" :backgroundColor="'rgba(255, 255, 255, .05)'">
              <template #default="{ item }">
                <mr-p-p-card :item="item" @named="namedWindow" @deleted="deletedWindow">
                  <template #enter>
                    <el-button v-if="item.info === null || item.image === null" type="warning" size="small"
                      @click="openViewDialog(item.id)">
                      {{ $t("video.initializeVideoData") }}
                    </el-button>
                    <el-button v-else type="primary" size="small" @click="openViewDialog(item.id)">
                      {{ $t("video.viewVideo") }}
                    </el-button>
                  </template>
                  <template #overlay>
                    <el-button type="primary" circle size="large" @click.stop="openViewDialog(item.id, true)">
                      <el-icon :size="30">
                        <VideoPlay />
                      </el-icon>
                    </el-button>
                  </template>
                </mr-p-p-card>
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
    </div>

    <!-- 新增上传弹窗组件 -->
    <mr-p-p-upload-dialog v-model="uploadDialogVisible" dir="video" :file-type="fileType" @save-resource="saveVideo"
      @success="handleUploadSuccess">
      {{ $t("video.uploadFile") }}
    </mr-p-p-upload-dialog>

    <!-- 视频查看弹窗 -->
    <VideoDialog v-model="viewDialogVisible" :id="currentVideoId" :auto-play="autoPlay" @refresh="refresh"
      @deleted="refresh" />
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { getVideos, putVideo, deleteVideo, postVideo } from "@/api/v1/resources/index";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import MrPPUploadDialog from "@/components/MrPP/MrPPUploadDialog/index.vue";
import VideoDialog from "@/components/MrPP/VideoDialog.vue";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElLoading } from "element-plus";
import { VideoPlay } from "@element-plus/icons-vue";

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
const router = useRouter();

// 上传弹窗相关
const uploadDialogVisible = ref(false);
const fileType = ref("video/mp4, video/mov, video/avi");

// 查看弹窗相关
const viewDialogVisible = ref(false);
const currentVideoId = ref<number | null>(null);
const autoPlay = ref(false);

const openViewDialog = (id: number, play: boolean = false) => {
  currentVideoId.value = id;
  autoPlay.value = play;
  viewDialogVisible.value = true;
};

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

  // 刷新列表
  await refresh();

};

// 保存视频
const saveVideo = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void,
  effectType?: string,
  info?: string,
  image_id?: number
) => {
  try {
    // 如果传入了 info，说明是视频且已获取到信息，直接使用 file_id 作为 image_id
    const data: any = { name, file_id };
    if (info) {
      data.info = info;
      data.image_id = file_id; // 视频直接使用原文件ID
    }
    const response = await postVideo(data);
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error("Failed to save video:", err);
    callback(-1);
  }
};

// 处理分页
const handleCurrentChange = async (page: number) => {
  pagination.current = page;
  await refresh();
  console.log(pagination.current);
};

// 修改视频名称
const namedWindow = async (item: any) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("video.prompt.message1"),
      t("video.prompt.message2"),
      {
        confirmButtonText: t("video.prompt.confirm"),
        cancelButtonText: t("video.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await named(item.id, value);
    ElMessage.success(t("video.prompt.success") + value);
  } catch {
    ElMessage.info(t("video.prompt.info"));
  }
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

// 修改视频名称 API 调用
const named = async (id: string, newValue: string) => {
  try {
    await putVideo(id, { name: newValue });
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 删除视频确认
const deletedWindow = async (item: { id: string }, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t("video.confirm.message1"),
      t("video.confirm.message2"),
      {
        confirmButtonText: t("video.confirm.confirm"),
        cancelButtonText: t("video.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleted(item.id);
    ElMessage.success(t("video.confirm.success"));
  } catch {
    ElMessage.info(t("video.confirm.info"));
    resetLoading(); // 操作取消后重置loading状态
  }
};

// 删除视频 API 调用
const deleted = async (id: string) => {
  try {
    await deleteVideo(id);
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 刷新数据
const refresh = async () => {
  try {
    const response = await getVideos(
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
.video-index {
  padding: 20px;
}
</style>
