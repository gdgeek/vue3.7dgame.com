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
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getPictures, putPicture, deletePicture } from "@/api/resources/index";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";

const items = ref<any[]>([]);
const sorted = ref("-created_at");
const searched = ref("");
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

// 图片名称修改
const namedWindow = (item: { id: string; name: string }) => {
  ElMessageBox.prompt("请输入新名称", "修改图片名称", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    closeOnClickModal: false,
    inputValue: item.name,
  })
    .then(({ value }) => {
      named(item.id, value);
      ElMessage({
        type: "success",
        message: "新的图片名称: " + value,
      });
    })
    .catch(() => {
      ElMessage({
        type: "info",
        message: "取消输入",
      });
    });
};

const sort = (value: string) => {
  sorted.value = value;
  refresh();
};

const search = (value: string) => {
  searched.value = value;
  refresh();
};

const named = (id: string, newValue: string) => {
  const picture = { name: newValue };
  putPicture(id, picture)
    .then(() => refresh())
    .catch((err) => console.error(err));
};

// 图片删除
const deletedWindow = (item: { id: string }) => {
  ElMessageBox.confirm("此操作将永久删除该文件, 是否继续?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    closeOnClickModal: false,
    type: "warning",
  })
    .then(() => {
      deleted(item.id);
      ElMessage({
        type: "success",
        message: "删除成功!",
      });
    })
    .catch(() => {
      ElMessage({
        type: "info",
        message: "已取消删除",
      });
    });
};

const deleted = (id: string) => {
  deletePicture(id)
    .then(() => refresh())
    .catch((err) => console.error(err));
};

const succeed = (data: any[]) => {
  items.value = data;
  console.log("item:", data);
};

// 刷新数据
const refresh = () => {
  getPictures(sorted.value, searched.value, pagination.value.current)
    .then((response) => {
      pagination.value = {
        current: parseInt(response.headers["x-pagination-current-page"]),
        count: parseInt(response.headers["x-pagination-page-count"]),
        size: parseInt(response.headers["x-pagination-per-page"]),
        total: parseInt(response.headers["x-pagination-total-count"]),
      };
      if (response.data) {
        succeed(response.data);
      }
    })
    .catch((err) => console.error(err));
};

onMounted(() => refresh());
</script>
