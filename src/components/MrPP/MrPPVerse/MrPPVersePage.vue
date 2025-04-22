<template>
  <div class="verse-index">

    <create v-if="props.created" ref="createdDialog" :dialog-title="$t('verse.page.dialogTitle')"
      :dialog-submit="$t('verse.page.dialogSubmit')" @submit="submitCreate"></Create>

    <br />
    <el-container>
      <el-header>
        <MrPPHeader :has-tags="true" @tags="tags" :sorted="sorted" :searched="searched" @search="search" @sort="sort">
          <el-button-group :inline="true">
            <el-button v-if="created" size="small" type="primary" @click="createWindow">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">{{
                $t("verse.page.title")
              }}</span>
            </el-button>
          </el-button-group>
        </MrPPHeader>
      </el-header>
      <el-main>
        <VerseList :items="items" @refresh="refresh"></VerseList>
      </el-main>
      <el-footer>
        <el-card class="box-card">
          <el-pagination :current-page="pagination.current" :page-count="pagination.count" :page-size="pagination.size"
            :total="pagination.total" layout="prev, pager, next, jumper" background
            @current-change="handleCurrentChange"></el-pagination>
        </el-card>
      </el-footer>
    </el-container>
    <br />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { postVerse, putVerse } from "@/api/v1/verse";
import VerseList from "@/components/MrPP/MrPPVerse/MrPPVerseList.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import Create from "@/components/MrPP/MrPPVerse/MrPPVerseWindowCreate.vue";
import type { VerseData, PostVerseData } from "@/api/v1/verse";

interface Pagination {
  current: number;
  count: number;
  size: number;
  total: number;
}

const props = defineProps<{ created: boolean }>();
const emit = defineEmits<{
  (e: "loaded", params: any, callback: (val: any) => void): void;
}>();

const createdDialog = ref<InstanceType<typeof Create> | null>(null);
const router = useRouter();
const items = ref<VerseData[] | null>(null);

const sorted = ref("-created_at");
const searched = ref("");
const tagList = ref<number[]>([]);
const pagination = ref<Pagination>({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});

const createWindow = () => {
  if (createdDialog.value) {
    createdDialog.value.show();
  }
};

const submitCreate = async (form: any, imageId: number | null) => {
  const data: PostVerseData = {
    name: form.name,
    description: form.description,
    uuid: uuidv4(),
  };
  if (imageId !== null) {
    data.image_id = imageId;
  }
  try {
    const response = await postVerse(data);
    router.push({ path: "/verse/view", query: { id: response.data.id } });
  } catch (error) {
    console.error(error);
  }
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  refresh();
};

const sort = (value: string) => {
  sorted.value = value;
  refresh();
};

const tags = (value: number[]) => {
  tagList.value = value;
  refresh();
};
const search = (value: string) => {
  searched.value = value;
  refresh();
};

const named = async (id: number, newValue: string) => {
  try {
    await putVerse(id, { name: newValue });
    refresh();
  } catch (error) {
    console.error(error);
  }
};

const refresh = () => {
  emit(
    "loaded",
    {
      sorted: sorted.value,
      searched: searched.value,
      current: pagination.value.current,
      tags: tagList.value,
    },
    (value: any) => {
      items.value = value.data;
      pagination.value = value.pagination;
    }
  );
};

onMounted(refresh);
</script>
