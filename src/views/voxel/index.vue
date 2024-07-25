<template>
  <div class="project-index">
    <br />
    <el-container>
      <el-header>
        <MrPPHeader
          :sorted="sorted"
          :searched="searched"
          @search="search"
          @sort="sort"
        >
          <el-button-group :inline="true">
            <router-link to="/ResourceAdmin/voxel/upload">
              <el-button size="small" type="primary" icon="UploadFilled">
                <span class="hidden-sm-and-down">上传模型</span>
              </el-button>
            </router-link>
          </el-button-group>
        </MrPPHeader>
      </el-header>
      <el-main>
        <el-row :gutter="10">
          <el-col
            v-for="(item, index) in items"
            :key="index"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
            :xl="4"
          >
            <MrPPCard
              :item="item"
              @named="namedWindow"
              @deleted="deletedWindow"
            >
              <template #enter>
                <router-link :to="'/voxel/view?id=' + item.id">
                  <el-button-group :inline="true">
                    <el-button
                      v-if="item.info === null || item.image === null"
                      type="warning"
                      size="small"
                    >
                      初始化模型数据
                    </el-button>
                    <el-button v-else type="primary" size="small">
                      查看模型
                    </el-button>
                  </el-button-group>
                </router-link>
              </template>
            </MrPPCard>
            <br />
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
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import "element-plus/theme-chalk/index.css";
import { getVoxels, putVoxel, deleteVoxel } from "@/api/resources/index";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";

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

const router = useRouter();

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
  console.log(pagination.value.current);
};

const namedWindow = (item: any) => {
  ElMessageBox.prompt("请输入新名称", "修改模型名称", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    closeOnClickModal: false,
    inputValue: item.name,
  })
    .then(({ value }) => {
      named(item.id, value);
      ElMessage.success(`新的模型名称: ${value}`);
    })
    .catch(() => {
      ElMessage.info("取消输入");
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

const deletedWindow = (item: any) => {
  ElMessageBox.confirm("此操作将永久删除该文件, 是否继续?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    closeOnClickModal: false,
    type: "warning",
  })
    .then(() => {
      deleted(item.id);
      ElMessage.success("删除成功!");
    })
    .catch(() => {
      ElMessage.info("已取消删除");
    });
};

const deleted = (id: number) => {
  deleteVoxel(id)
    .then(() => {
      refresh();
    })
    .catch((error) => {
      console.log(error);
    });
};

const succeed = (data: any[]) => {
  console.log(data);
  items.value = data;
};

// 刷新数据
const refresh = () => {
  getVoxels(sorted.value, searched.value, pagination.value.current)
    .then((response) => {
      console.log("response.headers", response.headers);
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
    .catch((error) => {
      console.log(error);
    });
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
