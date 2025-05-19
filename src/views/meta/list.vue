<template>
  <TransitionWrapper>
    <div class="root">
      <div>
        <br />
        <el-container>
          <el-header>
            <mr-p-p-header :sorted="sorted" :searched="searched" sortByTime="created_at" sortByName="title"
              @search="search" @sort="sort">
              <el-button-group :inline="true">
                <el-button size="small" type="primary" @click="addMeta">
                  <font-awesome-icon icon="plus"></font-awesome-icon>
                  &nbsp;
                  <span class="hidden-sm-and-down">{{ $t("meta.title") }}</span>
                </el-button>
              </el-button-group>
            </mr-p-p-header>
          </el-header>
          <el-main>
            <el-card style="width: 100%; min-height: 400px;">

              <Waterfall v-if="metaData" :list="metaData" :width="320" :gutter="20" :hasAroundGutter="false"
                :breakpoints="{
                  640: { rowPerView: 1 },
                }" :backgroundColor="'rgba(255, 255, 255, .05)'">
                <template #default="{ item }">
                  <mr-p-p-card :item="item" :isMeta="true" @named="namedWindow" @deleted="deletedWindow">
                    <template #enter>
                      <el-button-group>
                        <el-button type="primary" size="small" @click="edit(item.id)">{{
                          $t("meta.enter")
                          }}</el-button>
                        <el-button type="primary" :loading="copyLoadingMap.get(item.id)" size="small"
                          icon="CopyDocument" @click="copyWindow(item)">
                          <template #loading>
                            <div class="custom-loading">
                              <svg class="circular" viewBox="-10, -10, 50, 50">
                                <path class="path" d="
                                  M 30 15
                                  L 28 17
                                  M 25.61 25.61
                                  A 15 15, 0, 0, 1, 15 30
                                  A 15 15, 0, 1, 1, 27.99 7.5
                                  L 15 15
                                " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)" />
                              </svg>
                            </div>
                          </template>
                        </el-button>
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
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { getMetas, postMeta, deleteMeta, putMeta, getMeta, putMetaCode } from "@/api/v1/meta";
import type { metaInfo } from "@/api/v1/meta";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const router = useRouter();
const metaData = ref<metaInfo[] | null>(null);
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
    await putMeta(id, { title: newValue });
    refresh();
  } catch (error) {
    console.error(error);
  }
};

const copyWindow = async (item: metaInfo) => {
  copyLoadingMap.value.set(item.id, true);
  try {
    const { value } = await ElMessageBox.prompt(
      t("meta.prompt3.message1"),
      t("meta.prompt3.message2"),
      {
        confirmButtonText: t("meta.prompt3.confirm"),
        cancelButtonText: t("meta.prompt3.cancel"),
        closeOnClickModal: false,
        inputValue: `${item.title} (${t("meta.copy")})`,
        inputValidator: (value: string) => {
          if (!value) {
            return t("meta.prompt.inputValidator.item1");
          }
          if (value.length < 3) {
            return t("meta.prompt.inputValidator.item2");
          }
          if (value.length > 20) {
            return t("meta.prompt.inputValidator.item3");
          }
          return true;
        },
      }
    );

    const response = await getMeta(item.id, { expand: "cyber,event,share,metaCode" });
    const originalMeta = response.data;//获取原始meta数据
    console.log("originalMeta", originalMeta);

    // 创建新的meta数据
    const newMetaData = {
      info: originalMeta.info,
      data: originalMeta.data,
      image_id: originalMeta.image_id,
      uuid: uuidv4(),
      events: originalMeta.events,
      title: value,
      prefab: originalMeta.prefab,
    };

    const newMeta = await postMeta(newMetaData);

    // 传递blockly
    await putMetaCode(newMeta.data.id, {
      blockly: originalMeta.metaCode?.blockly || "",
    });

    copyLoadingMap.value.set(item.id, false);

    await refresh();
    ElMessage.success(t("meta.prompt3.success") + value);
  } catch (error) {
    console.error(error);
    copyLoadingMap.value.set(item.id, false);
    ElMessage.info(t("meta.prompt3.info"));
  }
};

const deletedWindow = async (item: { id: number }) => {
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
    await deleteMeta(item.id);
    await refresh();
    ElMessage({
      type: "success",
      message: t("meta.confirm.success"),
    });
  } catch (e) {
    console.error(e);
    ElMessage({
      type: "info",
      message: t("meta.confirm.info"),
    });
  }
};

const sort = (value: string) => {
  sorted.value = value;
  refresh();
};

const search = (value: string) => {
  searched.value = value;
  refresh();
};

const addMeta = async () => {
  try {
    const input = await ElMessageBox.prompt(
      t("meta.prompt.message1"),
      t("meta.prompt.message2"),
      {
        confirmButtonText: t("meta.prompt.confirm"),
        cancelButtonText: t("meta.prompt.cancel"),
        inputValidator: (value: string) => {
          if (!value) {
            return t("meta.prompt.inputValidator.item1");
          }
          if (value.length < 3) {
            return t("meta.prompt.inputValidator.item2");
          }
          if (value.length > 20) {
            return t("meta.prompt.inputValidator.item3");
          }
          return true;
        },
      }
    );
    ElMessage.success(t("meta.prompt.success") + input.value);

    const data = {
      title: input.value,
      custom: 1,
      uuid: uuidv4(),
    };
    const response = await postMeta(data);
    await edit(response.data.id);
  } catch (e) {
    console.error();
    ElMessage.info(t("meta.prompt.info"));
  }
};

const edit = async (id: number) => {
  router.push({ path: "/meta/meta-edit", query: { id } });
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
};

const refresh = async () => {
  const response = await getMetas(
    sorted.value,
    searched.value,
    pagination.value.current,
    "image,author"
  );
  metaData.value = response.data;

  // if (metaData.value) {
  //   const newMap = new Map<number, boolean>();

  //   metaData.value.forEach(item => {
  //     const isLoading = copyLoadingMap.value.get(item.id) || false;
  //     newMap.set(item.id, isLoading);
  //   });

  //   copyLoadingMap.value = newMap;
  // }

  pagination.value = {
    current: parseInt(response.headers["x-pagination-current-page"]),
    count: parseInt(response.headers["x-pagination-page-count"]),
    size: parseInt(response.headers["x-pagination-per-page"]),
    total: parseInt(response.headers["x-pagination-total-count"]),
  };
};

onMounted(() => {
  refresh();
});
</script>

<style scoped>
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
