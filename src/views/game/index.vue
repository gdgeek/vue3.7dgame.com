<template>
  <TransitionWrapper>
    <div class="game-container">
      <div>
        <br />
        <VerseDialog ref="dialogRef" @selected="selected"></VerseDialog>
        <el-container>
          <el-header>
            <mr-p-p-header :sorted="sorted" :searched="searched" sortByTime="created_at" sortByName="title"
              @search="search" @sort="sort" :hasSearch="false">
              <el-button-group :inline="true">
                <el-button size="small" type="primary" @click="addGuide">
                  <font-awesome-icon icon="plus"></font-awesome-icon>
                  &nbsp;
                  <span class="hidden-sm-and-down">{{
                    $t("game.index.title")
                  }}</span>
                </el-button>
              </el-button-group>
            </mr-p-p-header>
          </el-header>
          <el-main>
            <el-card>
              <el-table :data="items" style="width: 100%">
                <el-table-column prop="order" :label="$t('game.index.form.label1')" width="180">
                  <template #default="{ row }">
                    <el-input type="number" @change="(value: any) => onchange(row.id, value)" size="small"
                      v-model="row.order" :placeholder="$t('game.index.form.placeholder')"></el-input>
                  </template>
                </el-table-column>
                <el-table-column prop="level_id" :label="$t('game.index.form.label2')" width="180"></el-table-column>
                <el-table-column prop="level.name" :label="$t('game.index.form.label3')" width="180"></el-table-column>

                <el-table-column :label="$t('game.index.form.label4')">
                  <template #default="{ row }">
                    <el-button size="small" type="danger" @click="() => del(row.id)">
                      {{ $t("game.index.delete") }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
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
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import VerseDialog from "@/components/MrPP/VerseDialog.vue";
import {
  putVpGuide,
  getVpGuides,
  postVpGuide,
  deleteVpGuide,
} from "@/api/v1/vp-guide";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const dialogRef = ref<InstanceType<typeof VerseDialog> | null>(null);
const items = ref<any[]>([]);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const { t } = useI18n();
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
    await ElMessageBox.confirm(
      t("game.index.form.confirm.message1"),
      t("game.index.form.confirm.message2"),
      {
        confirmButtonText: t("game.index.form.confirm.confirm"),
        cancelButtonText: t("game.index.form.confirm.cancel"),
        type: "warning",
      }
    );
    await putVpGuide(id, { order: val });
    await refresh();
    ElMessage({
      type: "success",
      message: t("game.index.form.confirm.success"),
    });
  } catch (e) {
    console.error(e);
    ElMessage({
      type: "info",
      message: t("game.index.form.confirm.info"),
    });
  }
};

const selected = async (item: any) => {
  try {
    await postVpGuide({ level_id: item.data.id });
    ElMessage({
      type: "success",
      message: t("game.index.success"),
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
      t("game.index.confirm.message1"),
      t("game.index.confirm.message2"),
      {
        confirmButtonText: t("game.index.confirm.confirm"),
        cancelButtonText: t("game.index.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteVpGuide(id);
    await refresh();
    ElMessage({
      type: "success",
      message: t("game.index.confirm.success"),
    });
  } catch (e) {
    console.error(e);
    ElMessage({
      type: "info",
      message: t("game.index.confirm.info"),
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
