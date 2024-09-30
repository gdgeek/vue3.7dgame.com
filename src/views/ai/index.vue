<template>
  <div class="project-index">
    <br />
    <el-container>
      <el-header>
        <mr-p-p-header
          :sorted="sorted"
          :searched="searched"
          @search="search"
          @sort="sort"
        >
          <el-button-group :inline="true">
            <router-link to="/ai/create">
              <el-button size="small" type="primary" icon="uploadFilled">
                <span class="hidden-sm-and-down">{{ $t("ai.create") }}</span>
              </el-button>
            </router-link>
          </el-button-group>
        </mr-p-p-header>
      </el-header>
      <el-main>
        <el-card>
          <Waterfall
            :list="items"
            :width="320"
            :gutter="10"
            :backgroundColor="'rgba(255, 255, 255, .05)'"
          >
            <template #default="{ item }">
              <mr-p-p-card
                :item="item"
                @named="namedWindow"
                @deleted="deletedWindow"
              >
                <template #enter>
                  <router-link :to="`/resource/audio/view?id=${item.id}`">
                    <el-button
                      v-if="item.info === null || item.image === null"
                      type="warning"
                      size="small"
                    >
                      {{ $t("audio.initializeAudioData") }}
                    </el-button>
                    <el-button type="primary" size="small">{{
                      $t("audio.viewAudio")
                    }}</el-button>
                  </router-link>
                </template>
              </mr-p-p-card>
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
    <br />
  </div>
</template>

<script setup lang="ts">
import { getAudios, putAudio, deleteAudio } from "@/api/resources/index";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { Waterfall } from "vue-waterfall-plugin-next";
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

// 修改音频名称
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

// 修改音频名称 API 调用
const named = async (id: string, newValue: string) => {
  try {
    await putAudio(id, { name: newValue });
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 删除音频确认
const deletedWindow = async (item: any) => {
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
