<template>
  <div class="verse-index">
    <PersonCreator
      v-if="props.created"
      ref="createdDialogRef"
      :close-on-click-modal="false"
      :dialog-title="$t('manager.title')"
      @refresh="refresh"
      :dialog-submit="$t('manager.title')"
    ></PersonCreator>

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
            <el-button
              v-if="props.created"
              size="small"
              type="primary"
              @click="createWindow"
            >
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">{{ $t("manager.title") }}</span>
            </el-button>
          </el-button-group>
        </MrPPHeader>
      </el-header>
      <el-main>
        <el-row>
          <List
            v-if="items && items.length > 0"
            :items="items!"
            @refresh="refresh"
          ></List>
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
import PersonCreator from "./Creator.vue";
import List from "@/components/MrPP/Person/List.vue";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { userData } from "@/api/v1/person";

const props = defineProps<{
  created: boolean;
}>();
const emit = defineEmits<{
  (e: "loaded", params: any, callback: (val: any) => void): void;
}>();

interface Pagination {
  current: number;
  count: number;
  size: number;
  total: number;
}

const items = ref<userData[]>([]);
const sorted = ref("-created_at");
const searched = ref("");
const pagination = ref<Pagination>({
  current: 1,
  count: 1,
  size: 20,
  total: 20,
});
const createdDialogRef = ref<InstanceType<typeof PersonCreator>>();

const createWindow = () => {
  if (createdDialogRef.value) {
    createdDialogRef.value.show();
  }
};

const handleCurrentChange = async (page: number) => {
  pagination.value.current = page;
  await refresh();
  console.log(pagination.value.current);
};

const sort = async (value: string) => {
  sorted.value = value;
  await refresh();
};

const search = async (value: string) => {
  searched.value = value;
  await refresh();
};

const refresh = () => {
  emit(
    "loaded",
    {
      sorted: sorted.value,
      searched: searched.value,
      current: pagination.value.current,
    },
    (val: any) => {
      if (val && val.data) {
        items.value = val.data;
        pagination.value = val.pagination;
        setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
      } else {
        items.value = [];
      }
    }
  );
};

onMounted(refresh);
</script>
