<template>
  <TransitionWrapper>
    <div>
      <br />
      <VerseDialog ref="dialogRef" @selected="selected"></VerseDialog>
      <el-container>
        <el-header>
          <mr-p-p-header :sorted="sorted" :searched="searched" sortByTime="created_at" sortByName="title"
            @search="search" @sort="sort" :hasSearch="false">
            <el-tag type="success" v-if="data">{{ $t("game.map.title1") }} {{ data.page + 1
              }}{{ $t("game.map.title2") }}</el-tag>
            &nbsp;
            <el-button-group :inline="true">
              <el-button size="small" type="primary" @click="addGuide">
                <font-awesome-icon icon="plus"></font-awesome-icon>
                &nbsp;
                <span class="hidden-sm-and-down">{{
                  $t("game.map.addGuide")
                  }}</span>
              </el-button>
              <el-button size="small" type="primary" @click="addMap">
                <font-awesome-icon icon="plus"></font-awesome-icon>
                &nbsp;
                <span class="hidden-sm-and-down">{{
                  $t("game.map.addMap")
                  }}</span>
              </el-button>
              <el-button size="small" v-if="pagination.current === pagination.count" type="primary" @click="removeMap">
                <font-awesome-icon icon="trash"></font-awesome-icon>
                &nbsp;
                <span class="hidden-sm-and-down">{{
                  $t("game.map.removeMap")
                  }}</span>
              </el-button>
            </el-button-group>
          </mr-p-p-header>
        </el-header>
        <el-main>
          <el-card>
            <el-table v-if="data" :data="data.guides" style="width: 100%">
              <el-table-column prop="order" :label="$t('game.map.form.label1')" width="180">
                <template #default="scope">
                  <el-input type="number" @change="(value: any) => onchange(scope.row.id, value)" size="small"
                    v-model="scope.row.order" :placeholder="$t('game.map.form.placeholder')"></el-input>
                </template>
              </el-table-column>
              <el-table-column prop="level_id" :label="$t('game.map.form.label2')" width="180"></el-table-column>
              <el-table-column prop="level.name" :label="$t('game.map.form.label3')" width="180"></el-table-column>
              <el-table-column :label="$t('game.map.form.label4')">
                <template #default="scope">
                  <el-button size="small" type="danger" @click="del(scope.row.id)">
                    {{ $t("game.map.delete") }}
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
  </TransitionWrapper>
</template>

<script setup lang="ts">
import VerseDialog from "@/components/MrPP/VerseDialog.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { getVpMaps, postVpMap, deleteVpMap } from "@/api/v1/vp-map";
import { putVpGuide, postVpGuide, deleteVpGuide } from "@/api/v1/vp-guide";
import TransitionWrapper from '@/components/TransitionWrapper.vue';

const data = ref<any>(null);
const dialogRef = ref<InstanceType<typeof VerseDialog> | null>(null);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const { t } = useI18n();
const pagination = ref({
  current: 1,
  count: 1,
  size: 1,
  total: 1,
});

const refresh = async () => {
  try {
    const response = await getVpMaps(pagination.value.current);
    data.value = response.data[0];

    // 更新分页信息
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
      t("game.map.form.confirm.message1"),
      t("game.map.form.confirm.message2"),
      {
        confirmButtonText: t("game.map.form.confirm.confirm"),
        cancelButtonText: t("game.map.form.confirm.cancel"),
        type: "warning",
      }
    );
    await putVpGuide(id, { order: val });
    await refresh();
    ElMessage.success(t("game.map.form.confirm.success"));
  } catch (e) {
    console.error(e);
    ElMessage.info(t("game.map.form.confirm.info"));
  }
};

const selected = async (item: any) => {
  try {
    await postVpGuide({ level_id: item.data.id, map_id: data.value.id });
    ElMessage.success(t("game.map.success"));
    await refresh();
  } catch (error) {
    console.error(error);
  }
};

const addMap = async () => {
  try {
    await ElMessageBox.confirm(
      t("game.map.confirm1.message1") + `(${pagination.value.count + 1})?`,
      t("game.map.form.confirm.message2"),
      {
        confirmButtonText: t("game.map.confirm1.confirm"),
        cancelButtonText: t("game.map.confirm1.cancel"),
        type: "warning",
      }
    );
    await postVpMap({ page: pagination.value.count });
    pagination.value.count++;
    pagination.value.current = pagination.value.count;
    ElMessage.success(t("game.map.confirm1.success"));
    await refresh();
  } catch (e) {
    console.error(e);
    ElMessage.info(t("game.map.confirm1.info"));
  }
};

const removeMap = async () => {
  try {
    await ElMessageBox.confirm(
      t("game.map.confirm2.message1") + `(${pagination.value.count})?`,
      t("game.map.confirm2.message2"),
      {
        confirmButtonText: t("game.map.confirm2.confirm"),
        cancelButtonText: t("game.map.confirm2.cancel"),
        type: "warning",
      }
    );
    await deleteVpMap(data.value.id);
    pagination.value.current = pagination.value.count;
    ElMessage.success(t("game.map.confirm2.success"));
    await refresh();
  } catch (e) {
    console.error(e);
    ElMessage.info(t("game.map.confirm2.info"));
  }
};

const addGuide = () => {
  dialogRef.value!.open();
};

const del = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      t("game.map.confirm3.message1"),
      t("game.map.confirm3.message2"),
      {
        confirmButtonText: t("game.map.confirm3.confirm"),
        cancelButtonText: t("game.map.confirm3.cancel"),
        type: "warning",
      }
    );
    await deleteVpGuide(id);
    await refresh();
    ElMessage.success(t("game.map.confirm3.success"));
  } catch (e) {
    console.error(e);
    ElMessage.info(t("game.map.confirm3.info"));
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
