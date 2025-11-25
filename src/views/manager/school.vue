<template>
  <div class="school-management">
    <el-container>
      <el-header>
        <MrPPHeader :sorted="sorted" :searched="searched" @search="handleSearch" @sort="handleSort">
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="createSchool">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">{{ $t("manager.createSchool") }}</span>
            </el-button>
          </el-button-group>
        </MrPPHeader>
      </el-header>
      <el-main>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4" v-for="school in paginatedSchools" :key="school.id">
            <el-card class="school-card" :body-style="{ padding: '0px' }">
              <div class="image-container">
                <img :src="school.avatar" class="image" />
              </div>
              <div style="padding: 14px">
                <span class="school-name">{{ school.name }}</span>
                <div class="bottom clearfix">
                  <el-descriptions :column="1" size="small" class="school-info">
                    <el-descriptions-item :label="$t('manager.school.principal')">
                      {{ school.principal }}
                    </el-descriptions-item>
                    <el-descriptions-item :label="$t('manager.school.address')">
                      {{ school.address }}
                    </el-descriptions-item>
                  </el-descriptions>
                  <div class="actions">
                    <el-button type="primary" size="small" link>{{ $t('meta.edit') }}</el-button>
                    <el-button type="danger" size="small" link>{{ $t('manager.list.cancel') }}</el-button>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
      <el-footer>
        <el-card class="box-card">
          <el-pagination :current-page="pagination.current" :page-size="pagination.size" :total="pagination.total"
            layout="prev, pager, next, jumper" background @current-change="handleCurrentChange"></el-pagination>
        </el-card>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";

interface School {
  id: number;
  name: string;
  address: string;
  principal: string;
  avatar: string;
}

// Mock Data
const allSchools: School[] = Array.from({ length: 35 }).map((_, index) => ({
  id: index + 1,
  name: `School ${index + 1}`,
  address: `Address ${index + 1}, City`,
  principal: `Principal ${String.fromCharCode(65 + (index % 26))}`,
  avatar: `https://picsum.photos/id/${(index % 10) + 1}/200/200`,
}));

const sorted = ref("-created_at");
const searched = ref("");
const pagination = ref({
  current: 1,
  size: 12,
  total: allSchools.length,
});

const filteredSchools = computed(() => {
  let result = [...allSchools];

  // Filter
  if (searched.value) {
    const keyword = searched.value.toLowerCase();
    result = result.filter(school =>
      school.name.toLowerCase().includes(keyword) ||
      school.principal.toLowerCase().includes(keyword)
    );
  }

  // Sort (Mock implementation)
  if (sorted.value === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sorted.value === '-name') {
    result.sort((a, b) => b.name.localeCompare(a.name));
  }

  return result;
});

const paginatedSchools = computed(() => {
  pagination.value.total = filteredSchools.value.length;
  const start = (pagination.value.current - 1) * pagination.value.size;
  const end = start + pagination.value.size;
  return filteredSchools.value.slice(start, end);
});

const handleSearch = (value: string) => {
  searched.value = value;
  pagination.value.current = 1; // Reset to first page on search
};

const handleSort = (value: string) => {
  sorted.value = value;
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
};

const createSchool = () => {
  console.log("Create School Clicked");
};
</script>

<style scoped lang="scss">
.school-management {
  padding: 20px;
}

.school-card {
  margin-bottom: 20px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
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

.school-name {
  font-size: 16px;
  font-weight: bold;
  display: block;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.school-info {
  margin-bottom: 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
}
</style>
