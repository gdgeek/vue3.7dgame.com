<template>
  <el-dialog :model-value="modelValue" :title="title || $t('common.selectUser')" width="900px"
    :close-on-click-modal="false" append-to-body @update:model-value="$emit('update:modelValue', $event)">
    <div class="user-selector-header">
      <MrPPHeader :sorted="sorted" :searched="searched" @search="handleSearch" @sort="handleSort" :hasTags="false">
      </MrPPHeader>
    </div>

    <div class="user-list" v-loading="loading">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="user in users" :key="user.id">
          <el-card class="user-card" :body-style="{ padding: '0px' }" @click="handleSelect(user)">
            <div class="image-container">
              <el-image :src="user.avatar?.url ||
                `https://api.dicebear.com/9.x/glass/svg?seed=${user.username}`
                " fit="cover" class="image">
                <template #error>
                  <div class="image-slot">
                    <img :src="`https://api.dicebear.com/9.x/glass/svg?seed=${user.username}`" class="image" />
                  </div>
                </template>
              </el-image>
            </div>
            <div style="padding: 14px">
              <span class="user-name" :title="user.nickname || user.username">{{
                user.nickname || user.username
                }}</span>
              <div class="bottom clearfix">
                <span class="user-username">{{ user.username }}</span>
                <el-button type="primary" size="small" class="button" @click.stop="handleSelect(user)">
                  {{ $t("common.select") }}
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty v-if="!loading && users.length === 0" :description="$t('common.noUsers')"></el-empty>
    </div>

    <div class="pagination-container">
      <el-pagination v-if="pagination.total > 0" :current-page="pagination.current" :page-size="pagination.size"
        :total="pagination.total" layout="prev, pager, next" @current-change="handlePageChange"
        background></el-pagination>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { getPerson } from "@/api/v1/person";
import { useI18n } from "vue-i18n";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";

const { t } = useI18n();

interface Props {
  modelValue: boolean;
  title?: string;
  excludeIds?: number[];
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  excludeIds: () => [],
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  select: [user: any];
}>();

const users = ref<any[]>([]);
const loading = ref(false);
const sorted = ref("-created_at");
const searched = ref("");
const pagination = ref({
  current: 1,
  size: 12, // Show 12 items per page for grid layout
  total: 0,
});

const fetchUsers = async () => {
  loading.value = true;
  try {
    const response = await getPerson(
      sorted.value,
      searched.value,
      pagination.value.current,
      "avatar" // Request avatar field
    );

    const headers = response.headers;
    pagination.value.total = parseInt(
      headers["x-pagination-total-count"] || "0"
    );
    pagination.value.current = parseInt(
      headers["x-pagination-current-page"] || "1"
    );
    pagination.value.size = parseInt(headers["x-pagination-per-page"] || "12");

    // Filter out excluded IDs
    users.value = (response.data || []).filter(
      (user: any) => !props.excludeIds.includes(user.id)
    );
  } catch (error) {
    console.error("Failed to fetch users:", error);
    users.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSelect = (user: any) => {
  emit("select", user);
};

const handlePageChange = (page: number) => {
  pagination.value.current = page;
  fetchUsers();
};

const handleSearch = (value: string) => {
  searched.value = value;
  pagination.value.current = 1;
  fetchUsers();
};

const handleSort = (value: string) => {
  sorted.value = value;
  fetchUsers();
};

// Fetch users when dialog opens
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      // Reset state when opening
      pagination.value.current = 1;
      searched.value = "";
      sorted.value = "-created_at";
      fetchUsers();
    }
  }
);
</script>

<style scoped lang="scss">
.user-selector-header {
  margin-bottom: 20px;
}

.user-list {
  min-height: 400px;
}

.user-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    border-color: var(--el-color-primary);
  }
}

.image-container {
  width: 100%;
  height: 150px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-size: 16px;
  font-weight: bold;
  display: block;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-username {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 10px;
}

.bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
