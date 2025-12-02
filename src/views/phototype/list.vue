<template>
  <TransitionWrapper>
    <div class="phototype-list">
      <el-container>
        <el-header>
          <mr-p-p-header :sorted="sorted" :searched="searched" sortByTime="created_at" sortByName="title"
            @search="search" @sort="sort">
            <el-button-group :inline="true">
              <el-button size="small" type="primary" @click="addPrefab">
                <font-awesome-icon icon="plus"></font-awesome-icon>
                &nbsp;
                <span class="hidden-sm-and-down">{{ $t("phototype.create") }}</span>
              </el-button>
              <el-button size="small" type="primary" @click="addPrefabFromPolygen">
                <font-awesome-icon icon="apple-alt"></font-awesome-icon>
                &nbsp;
                <span class="hidden-sm-and-down">{{ $t("phototype.fromModel") }}</span>
              </el-button>
            </el-button-group>
          </mr-p-p-header>
        </el-header>
        <el-main>
          <el-card style="width: 100%; min-height: 400px;">

            <Waterfall v-if="list" :list="list" :width="320" :gutter="20" :backgroundColor="'rgba(255, 255, 255, .05)'">
              <template #default="{ item }">

                <mr-p-p-card :item="item" @named="namedWindow" @deleted="deletedWindow">
                  <template #enter>
                    <el-button-group>
                      <el-button type="primary" size="small" @click="edit(item.id)">{{
                        $t("meta.enter")
                        }}</el-button>

                    </el-button-group>
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
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { getPhototypes, postPhototype, deletePhototype, putPhototype, getPhototype } from "@/api/v1/phototype";
import type { PhototypeType } from "@/api/v1/phototype";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";


const router = useRouter();
const list = ref<PhototypeType[] | null>(null);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const pagination = ref<{
  current: number;
  count: number;
  size: number;
  total: number;
}>({ current: 1, count: 1, size: 20, total: 20 });

const { t } = useI18n();

const copyLoadingMap = ref<Map<number, boolean>>(new Map());

const namedWindow = async (item: { id: number; title: string }) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t("meta.prompt2.message1"),
      t("meta.prompt2.message2"),
      {
        confirmButtonText: t("meta.prompt2.confirm"),
        cancelButtonText: t("meta.prompt2.cancel"),
        closeOnClickModal: false,
        inputValue: item.title,
      }
    );
    await named(item.id, value);
    ElMessage.success(t("meta.prompt2.success") + value);
  } catch {
    ElMessage.info(t("meta.prompt2.info"));
  }
};

const named = async (id: number, newValue: string) => {
  try {
    await putPhototype(id, { title: newValue });
    refresh();
  } catch (error) {
    console.error(error);
  }
};

const copyWindow = async (item: PhototypeType) => {

};

const deletedWindow = async (item: { id: string }, resetLoading: () => void) => {
  try {
    await ElMessageBox.confirm(
      t("meta.confirm.message1"),
      t("meta.confirm.message2"),
      {
        confirmButtonText: t("meta.confirm.confirm"),
        cancelButtonText: t("meta.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deletePhototype(item.id);
    await refresh();
    ElMessage.success(t("meta.confirm.success"));
  } catch (e) {
    console.error(e);
    ElMessage.info(t("meta.confirm.info"));
    resetLoading(); // 操作取消后重置loading状态
  }
};

const sort = (value: string) => {
  sorted.value = value;
  refresh();
};

const search = async (value: string) => {
  // alert(value)
  searched.value = value;
  await refresh();

};
const addPrefabFromPolygen = async () => {
  try {
    const { value: name } = await ElMessageBox.prompt(
      t("phototype.prompt.message1"),
      t("meta.prompt.message2"),
      {
        confirmButtonText: t("meta.prompt.confirm"),
        cancelButtonText: t("meta.prompt.cancel"),
        inputValidator: (value: string) => {
          if (!value) return t("phototype.prompt.error1");
          if (value.length < 3) return t("phototype.prompt.error2");
          if (value.length > 20) return t("phototype.prompt.error3");
          return true;
        },
      }
    );

    ElMessage.success(t("phototype.prompt.success") + name);
    /*    const data = {
          title: name,
          custom: 1,
          uuid: uuidv4(),
        };
        const response = await postPhototype(data);*/
    //await editPhototype(response.data.id);
  } catch (e) {
    console.error(e);
    ElMessage.info(t("meta.prompt.info"));
  }
};
const addPrefab = async () => {
  try {
    const { value: name } = await ElMessageBox.prompt(
      t("phototype.prompt.message1"),
      t("meta.prompt.message2"),
      {
        confirmButtonText: t("meta.prompt.confirm"),
        cancelButtonText: t("meta.prompt.cancel"),
        inputValidator: (value: string) => {
          if (!value) return t("phototype.prompt.error1");
          if (value.length < 3) return t("phototype.prompt.error2");
          if (value.length > 20) return t("phototype.prompt.error3");
          return true;
        },
      }
    );

    ElMessage.success(t("phototype.prompt.success") + name);
    const data = {
      title: name,
      custom: 1,
      uuid: uuidv4(),
    };
    const response = await postPhototype(data);
    await refresh();
    //await editPhototype(response.data.id);
  } catch (e) {
    console.error(e);
    ElMessage.info(t("meta.prompt.info"));
  }
};

const edit = async (id: number) => {
  router.push({ path: "/phototype/edit", query: { id } });
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
};

const refresh = async () => {
  const response = await getPhototypes(
    sorted.value,
    searched.value,
    pagination.value.current,
    "image,author"
  );
  list.value = response.data;
  // alert(123)
  // console.error(list);
  pagination.value = {
    current: parseInt(response.headers["x-pagination-current-page"]),
    count: parseInt(response.headers["x-pagination-page-count"]),
    size: parseInt(response.headers["x-pagination-per-page"]),
    total: parseInt(response.headers["x-pagination-total-count"]),
  };
};

onMounted(async () => {
  await refresh();
});
</script>

<style scoped>
.phototype-list {
  padding: 20px;
}

.mrpp-title {
  font-size: 15px;
  padding: 0px 0px 0px 0px;
}

.card-title {
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
}

.clearfix {
  display: flex;
  justify-content: flex-end;
}

.el-button .custom-loading .circular {
  margin-right: 6px;
  width: 18px;
  height: 18px;
  animation: loading-rotate 2s linear infinite;
}

.el-button .custom-loading .circular .path {
  animation: loading-dash 1.5s ease-in-out infinite;
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  stroke-width: 2;
  stroke: var(--el-button-text-color);
  stroke-linecap: round;
}
</style>
