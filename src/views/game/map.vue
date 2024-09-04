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
          <el-tag type="success" v-if="data">第{{ data.page + 1 }}地图</el-tag>
          &nbsp;
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="addGuide">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">增加关卡</span>
            </el-button>
            <el-button size="small" type="primary" @click="addMap">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">增加地图</span>
            </el-button>
            <el-button
              size="small"
              v-if="pagination.current === pagination.count"
              type="primary"
              @click="removeMap"
            >
              <font-awesome-icon icon="trash"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">减少地图</span>
            </el-button>
          </el-button-group>
        </mr-p-p-header>
      </el-header>
      <el-main>
        <el-card>
          <el-table v-if="data" :data="data.guides" style="width: 100%">
            <el-table-column prop="order" label="顺序" width="180">
              <template #default="scope">
                <el-input
                  type="number"
                  @change="(value: any) => onchange(scope.row.id, value)"
                  size="small"
                  v-model="scope.row.order"
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
              <template #default="scope">
                <el-button
                  size="small"
                  type="danger"
                  @click="del(scope.row.id)"
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
import VerseDialog from "@/components/MrPP/VerseDialog.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { getVpMaps, postVpMap, deleteVpMap } from "@/api/v1/vp-map";
import { putVpGuide, postVpGuide, deleteVpGuide } from "@/api/v1/vp-guide";

const data = ref<any>(null);
const dialogRef = ref<InstanceType<typeof VerseDialog> | null>(null);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const pagination = ref({
  current: 1,
  count: 1,
  size: 1,
  total: 1,
});

const refresh = async () => {
  const r = await getVpMaps(pagination.value.current);
  data.value = r.data[0];
  pagination.value = {
    current: parseInt(r.headers["x-pagination-current-page"]),
    count: parseInt(r.headers["x-pagination-page-count"]),
    size: parseInt(r.headers["x-pagination-per-page"]),
    total: parseInt(r.headers["x-pagination-total-count"]),
  };
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
    ElMessage.success("修改成功!");
  } catch (e) {
    console.error(e);
    ElMessage.info("已取消修改");
  }
};

const selected = async (item: any) => {
  await postVpGuide({ level_id: item.data.id, map_id: data.value.id });
  ElMessage.success("添加成功!");
  refresh();
};

const addMap = async () => {
  try {
    await ElMessageBox.confirm(
      `创建地图(${pagination.value.count + 1})?`,
      "提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
    await postVpMap({ page: pagination.value.count });
    pagination.value.count++;
    pagination.value.current = pagination.value.count;
    ElMessage.success("创建成功!");
    refresh();
  } catch (e) {
    console.error(e);
    ElMessage.info("已取消创建");
  }
};

const removeMap = async () => {
  try {
    await ElMessageBox.confirm(`删除地图(${pagination.value.count})?`, "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    await deleteVpMap(data.value.id);
    pagination.value.current = pagination.value.count;
    ElMessage.success("删除成功!");
    refresh();
  } catch (e) {
    console.error(e);
    ElMessage.info("已取消删除");
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
    refresh();
    ElMessage.success("删除成功!");
  } catch (e) {
    console.error(e);
    ElMessage.info("已取消删除");
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
