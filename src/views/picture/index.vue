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
            <router-link to="/ResourceAdmin/picture/upload">
              <el-button size="small" type="primary" icon="uploadFilled">
                <span class="hidden-sm-and-down">上传图片</span>
              </el-button>
            </router-link>
          </el-button-group>
        </mr-p-p-header>
      </el-header>
      <el-main>
        <el-row :gutter="10">
          <!--
          <waterfall
            :lazyload="true"
            :gutter="10"
            :width="320"
            :list="items"
            :column-count="3"
          >
            <template #item="{ item }"> </template>
          </waterfall>-->
          <el-col
            v-for="(item, index) in items"
            :key="index"
            :data="item"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
            :xl="4"
          >
            <mr-p-p-card
              :item="item"
              @named="namedWindow"
              @deleted="deletedWindow"
            >
              <template #enter>
                <router-link :to="`/ResourceAdmin/picture/view?id=${item.id}`">
                  <el-button
                    v-if="item.info === null || item.image === null"
                    type="warning"
                    size="small"
                  >
                    初始化图片数据
                  </el-button>
                  <el-button v-else type="primary" size="small">
                    查看图片
                  </el-button>
                </router-link>
              </template>
            </mr-p-p-card>
          </el-col>
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
    <br />
  </div>
</template>

<script setup lang="ts">
import "element-plus/theme-chalk/index.css";
import { useRouter } from "vue-router";
import { getPictures, putPicture, deletePicture } from "@/api/resources/index";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";

const items = ref<any[]>([]);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const pagination = ref({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});

const router = useRouter();

// 处理分页
const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
  console.log(pagination.value.current);
};

// 修改图片名称
const namedWindow = async (item: { id: string; name: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      "请输入新名称",
      "修改图片名称",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        closeOnClickModal: false,
        inputValue: item.name,
      }
    );
    await named(item.id, value);
    ElMessage.success("新的模型名称: " + value);
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

// 修改图片名称 API 调用
const named = async (id: string, newValue: string) => {
  try {
    await putPicture(id, { name: newValue });
    refresh();
  } catch (error) {
    console.error(error);
  }
};

const deletedWindow = async (item: { id: string }) => {
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

const deleted = async (id: string) => {
  try {
    await deletePicture(id);
    refresh();
  } catch (error) {
    console.error(error);
  }
};

// 刷新数据
const refresh = async () => {
  try {
    const response = await getPictures(
      sorted.value,
      searched.value,
      pagination.value.current
    );
    const headers = response.headers;
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

onMounted(() => refresh());
</script>
