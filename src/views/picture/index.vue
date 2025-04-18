<template>
  <TransitionWrapper>
    <div class="project-index">
      <br />
      <el-container>
        <el-header>
          <mr-p-p-header :sorted="sorted" :searched="searched" @search="search" @sort="sort">
            <el-button-group :inline="true">
              <!-- 原上传路由按钮注释
              <router-link to="/resource/picture/upload">
                <el-button size="small" type="primary" icon="uploadFilled">
                  <span class="hidden-sm-and-down">{{
                    $t("picture.uploadPicture")
                    }}</span>
                </el-button>
              </router-link>
              -->
              <el-button size="small" type="primary" icon="uploadFilled" @click="openUploadDialog">
                <span class="hidden-sm-and-down">{{ $t("picture.uploadPicture") }}</span>
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
                  <template #enter>
                    <router-link :to="`/resource/picture/view?id=${item.id}`">
                      <el-button v-if="item.info === null || item.image === null" type="warning" size="small">
                        {{ $t("picture.initializePictureData") }}
                      </el-button>
                      <el-button v-else type="primary" size="small">
                        {{ $t("picture.viewPicture") }}
                      </el-button>
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
      <mr-p-p-upload-dialog v-model="uploadDialogVisible" dir="picture" :file-type="fileType"
        @save-resource="savePicture" @success="handleUploadSuccess">
        {{ $t("picture.uploadFile") }}
      </mr-p-p-upload-dialog>

    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { getPictures, putPicture, deletePicture, postPicture } from "@/api/v1/resources/index";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import MrPPUploadDialog from "@/components/MrPP/MrPPUploadDialog/index.vue";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { useRouter } from "vue-router";

// 组件状态
const items = ref<any[] | null>(null);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const { t } = useI18n();
const router = useRouter();

// 上传弹窗相关
const uploadDialogVisible = ref(false);
const fileType = ref("image/gif, image/jpeg, image/png");

// 分页配置
const pagination = ref({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});

// 数据加载与刷新
const refresh = async () => {
  try {
    const response = await getPictures(
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

// 打开上传弹窗
const openUploadDialog = () => {
  uploadDialogVisible.value = true;
};

// 上传成功后处理
const handleUploadSuccess = (lastFileId: number) => {
  uploadDialogVisible.value = false;
  router.push({
    path: "/resource/picture/view",
    query: { id: lastFileId },
  });
};

// 保存图片
const savePicture = async (
  name: string,
  file_id: number,
  totalFiles: number,
  callback: (id: number) => void
) => {
  try {
    const response = await postPicture({ name, file_id });
    if (response.data.id) {
      callback(response.data.id);
    }
  } catch (err) {
    console.error("Failed to save picture:", err);
    callback(-1);
  }
};

// 分页处理
const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
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

// 重命名处理
const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("picture.prompt.message1"),
      t("picture.prompt.message2"),
      {
        confirmButtonText: t("picture.prompt.confirm"),
        cancelButtonText: t("picture.prompt.cancel"),
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await named(item.id, value);
    ElMessage.success(t("picture.prompt.success") + value);
  } catch {
    ElMessage.info(t("picture.prompt.info"));
  }
};

// 修改图片名称API调用
const named = async (id: string, newValue: string) => {
  try {
    await putPicture(id, { name: newValue });
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 删除确认
const deletedWindow = async (item: { id: string }) => {
  try {
    await ElMessageBox.confirm(
      t("picture.confirm.message1"),
      t("picture.confirm.message2"),
      {
        confirmButtonText: t("picture.confirm.confirm"),
        cancelButtonText: t("picture.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deleted(item.id);
    ElMessage.success(t("picture.confirm.success"));
  } catch {
    ElMessage.info(t("picture.confirm.info"));
  }
};

// 删除图片API调用
const deleted = async (id: string) => {
  try {
    await deletePicture(id);
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 生命周期钩子
onMounted(() => refresh());
</script>
