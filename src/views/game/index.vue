<template>
  <div>
    <br />
    <VerseDialog ref="dialogRef" @selected="selected"></VerseDialog>
    <el-container>
      <el-header>
        <mr-p-p-header
          :sorted="sorted"
          :searched="searched"
          sortByTime="created_at"
          sortByName="title"
          @search="search"
          @sort="sort"
          :hasSearch="false"
        >
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="addGuide">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">创建【关卡】</span>
            </el-button>
          </el-button-group>
        </mr-p-p-header>
      </el-header>
      <el-main>
        <el-card>
          <el-table :data="items" style="width: 100%">
            <el-table-column prop="order" label="顺序" width="180">
              <template #default="{ row }">
                <el-input
                  type="number"
                  @change="(value: any) => onchange(row.id, value)"
                  size="small"
                  v-model="row.order"
                  placeholder="请输入排序"
                ></el-input>
              </template>
            </el-table-column>
            <el-table-column
              prop="level_id"
              label="宇宙id"
              width="180"
            ></el-table-column>
            <el-table-column
              prop="level.name"
              label="宇宙名"
              width="180"
            ></el-table-column>

            <el-table-column label="操作">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="danger"
                  @click="() => del(row.id)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import VerseDialog from "@/components/MrPP/VerseDialog.vue";
import {
  putVpGuide,
  getVpGuides,
  postVpGuide,
  deleteVpGuide,
} from "@/api/v1/vp-guide";

const dialogRef = ref<InstanceType<typeof VerseDialog> | null>(null);
const items = ref<any[]>([]);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const pagination = ref({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});

const refresh = async () => {
  try {
    const response = await getVpGuides(pagination.value.current);
    items.value = response.data;
    pagination.value = {
      current: parseInt(response.headers["x-pagination-current-page"]),
      count: parseInt(response.headers["x-pagination-page-count"]),
      size: parseInt(response.headers["x-pagination-per-page"]),
      total: parseInt(response.headers["x-pagination-total-count"]),
    };
  } catch (error) {
    console.error(error);
  }
};

const onchange = async (id: number, val: number) => {
  try {
    await ElMessageBox.confirm("修改排序?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    await putVpGuide(id, { order: val });
    await refresh();
    ElMessage({
      type: "success",
      message: "修改成功!",
    });
  } catch (e) {
    console.error(e);
    ElMessage({
      type: "info",
      message: "已取消修改",
    });
  }
};

const selected = async (item: any) => {
  try {
    await postVpGuide({ level_id: item.data.id });
    ElMessage({
      type: "success",
      message: "添加成功!",
    });
    await refresh();
  } catch (e) {
    console.error(e);
  }
};

const addGuide = () => {
  dialogRef.value!.open();
};

const del = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      "此操作将永久删除该【关卡】, 是否继续?",
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
    await deleteVpGuide(id);
    await refresh();
    ElMessage({
      type: "success",
      message: "删除成功!",
    });
  } catch (e) {
    console.error(e);
    ElMessage({
      type: "info",
      message: "已取消删除",
    });
  }
};

const handleCurrentChange = (val: number) => {
  pagination.value.current = val;
  refresh();
};

const sort = (value: string) => {
  sorted.value = value;
  refresh();
};

const search = (value: string) => {
  searched.value = value;
  refresh();
};

onMounted(() => {
  refresh();
});
</script>
