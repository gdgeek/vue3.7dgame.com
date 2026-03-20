<template>
  <el-dialog
    :model-value="modelValue"
    :title="title || $t('common.selectUser')"
    width="900px"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="user-selector-header">
      <MrPPHeader
        :sorted="sorted"
        :searched="searched"
        @search="handleSearch"
        @sort="handleSort"
        :hasTags="false"
      >
      </MrPPHeader>
    </div>

    <div class="user-list" v-loading="loading">
      <el-row :gutter="20">
        <el-col
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          v-for="user in users"
          :key="user.id"
        >
          <el-card
            class="user-card"
            :body-style="{ padding: '0px' }"
            @click="handleSelect(user)"
          >
            <div class="image-container">
              <el-image
                :src="getUserAvatarUrl(user.avatar?.url, user.username)"
                fit="cover"
                class="image"
              >
                <template #error>
                  <div class="image-slot">
                    <img
                      :src="getDefaultAvatarUrl(user.username)"
                      class="image"
                    />
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
                <el-button
                  type="primary"
                  size="small"
                  class="button"
                  @click.stop="handleSelect(user)"
                >
                  {{ $t("common.select") }}
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty
        v-if="!loading && users.length === 0"
        :description="$t('common.noUsers')"
      ></el-empty>
    </div>

    <div class="pagination-container">
      <el-pagination
        v-if="pagination.total > 0"
        :current-page="pagination.current"
        :page-size="pagination.size"
        :total="pagination.total"
        layout="prev, pager, next, jumper"
        @current-change="handlePageChange"
        background
      ></el-pagination>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { ref, watch } from "vue";
import { getPerson, type userData } from "@/api/v1/person";
import { useI18n } from "vue-i18n";
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { getUserAvatarUrl, getDefaultAvatarUrl } from "@/utils/avatar";

const {} = useI18n();

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
  select: [user: userData];
}>();

const users = ref<userData[]>([]);
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
      (user) => !props.excludeIds.includes(Number(user.id))
    );
  } catch (error) {
    logger.error("Failed to fetch users:", error);
    users.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSelect = (user: userData) => {
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
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
    transform: translateY(-5px);
  }
}

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 150px;
  overflow: hidden;
  background-color: #f5f7fa;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  display: block;
  margin-bottom: 5px;
  overflow: hidden;
  font-size: 16px;
  font-weight: bold;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-username {
  display: block;
  margin-bottom: 10px;
  font-size: 12px;
  color: #909399;
}

.bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
