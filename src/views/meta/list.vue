<template>
  <div>
    <br />
    <el-container>
      <el-header>
        <mr-p-p-header
          :sorted="sorted"
          :searched="searched"
          sortByTime="created_at"
          sortByName="title"
          @search="search"
          @sort="sort"
        >
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
        <el-card style="width: 100%">
          <Waterfall
            :list="metaData as unknown as ViewCard[]"
            :width="320"
            :gutter="20"
            :hasAroundGutter="false"
            :breakpoints="{
              640: { rowPerView: 1 },
            }"
            :backgroundColor="'rgba(255, 255, 255, .05)'"
          >
            <template #default="{ item }">
              <el-card style="width: 320px" class="box-card">
                <template #header>
                  <div>
                    <el-card shadow="hover" :body-style="{ padding: '0px' }">
                      <template #header>
                        <span class="mrpp-title">
                          <b class="card-title" nowrap>{{ item.title }}</b>
                        </span>
                      </template>
                      <router-link :to="`/meta/meta-edit?id=${item.id}`">
                        <img
                          v-if="!item.image"
                          src="@/assets/image/none.png"
                          style="
                            width: 100%;
                            height: 270px;
                            object-fit: contain;
                          "
                        />
                        <img
                          v-else
                          style="width: 100%; height: 270px"
                          fit="contain"
                          :src="item.image.url!"
                          lazy
                        />
                      </router-link>
                    </el-card>
                  </div>
                </template>
                <div class="clearfix">
                  <el-button-group style="float: right" :inline="true">
                    <el-button
                      @click="editor(item.id)"
                      type="success"
                      size="small"
                      icon="Edit"
                      >{{ $t("meta.edit") }}</el-button
                    >

                    <el-button
                      @click="del(item.id)"
                      type="danger"
                      size="small"
                      icon="Delete"
                    >
                      {{ $t("meta.delete") }}</el-button
                    >
                  </el-button-group>
                </div>
                <div class="bottom clearfix"></div>
              </el-card>
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
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { getMetas, postMeta, deleteMeta } from "@/api/v1/meta";
import type { metaInfo } from "@/api/v1/meta";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { ViewCard } from "vue-waterfall-plugin-next/dist/types/types/waterfall";

const router = useRouter();
const metaData = ref<metaInfo[]>([]);
const sorted = ref<string>("-created_at");
const searched = ref<string>("");
const pagination = ref<{
  current: number;
  count: number;
  size: number;
  total: number;
}>({ current: 1, count: 1, size: 20, total: 20 });

const { t } = useI18n();

const editor = (id: number) => {
  router.push({ path: "/meta/meta-edit", query: { id } });
};

const del = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      t("meta.confirm.message1"),
      t("meta.confirm.message2"),
      {
        confirmButtonText: t("meta.confirm.confirm"),
        cancelButtonText: t("meta.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteMeta(id);
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
</style>
