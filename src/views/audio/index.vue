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
            <router-link to="/resource/audio/upload">
              <el-button size="small" type="primary" icon="uploadFilled">
                <span class="hidden-sm-and-down">上传音频</span>
              </el-button>
            </router-link>
          </el-button-group>
        </mr-p-p-header>
      </el-header>
      <el-main>
        <el-card>
          <Waterfall :list="items" :width="320" :gutter="10">
            <template #item="{ item }">
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
                      初始化音频数据
                    </el-button>
                    <el-button type="primary" size="small">查看音频</el-button>
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
      "请输入新名称",
      "修改音频名称",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await named(item.id, value);
    ElMessage.success("新的音频名称: " + value);
  } catch {
    ElMessage.info("取消输入");
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
    await ElMessageBox.confirm("此操作将永久删除该文件, 是否继续?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      closeOnClickModal: false,
      type: "warning",
    });
    await deleted(item.id);
    ElMessage.success("删除成功!");
  } catch {
    ElMessage.info("已取消删除");
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
