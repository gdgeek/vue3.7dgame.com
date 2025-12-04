<template>
  <div class="student-management">
    <el-container>
      <el-header>
        <MrPPHeader :sorted="sorted" :searched="searched" @search="handleSearch" @sort="handleSort">
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="handleCreate">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">{{ $t("manager.createStudent") }}</span>
            </el-button>
          </el-button-group>
        </MrPPHeader>
      </el-header>
      <el-main>
        <el-row :gutter="20" v-loading="loading">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4" v-for="item in students" :key="item.id">
            <el-card class="student-card" :body-style="{ padding: '0px' }">
              <div class="image-container">
                <img :src="(item.avatar as any)?.url || '/src/assets/images/author/author-boy.png'" class="image" />
              </div>
              <div style="padding: 14px">
                <span class="student-name" :title="item.name">{{ item.name }}</span>
                <div class="bottom clearfix">
                  <el-descriptions :column="1" size="small" class="student-info">
                    <el-descriptions-item :label="$t('manager.student.grade')">
                      {{ item.grade || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item :label="$t('manager.student.class')">
                      {{ item.class || '-' }}
                    </el-descriptions-item>
                  </el-descriptions>
                  <div class="actions">
                    <el-button type="primary" size="small" link @click="handleEdit(item)">{{ $t('meta.edit')
                    }}</el-button>
                    <el-button type="danger" size="small" link @click="handleDelete(item)">{{ $t('manager.list.cancel')
                    }}</el-button>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-empty v-if="!loading && students.length === 0" description="No Data"></el-empty>
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
import { ref, onMounted } from 'vue';
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import { getStudents, deleteStudent, Student } from "@/api/v1/edu-student";
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const students = ref<Student[]>([]);
const loading = ref(false);
const sorted = ref("-created_at");
const searched = ref("");
const pagination = ref({
  current: 1,
  size: 20,
  total: 0,
});

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await getStudents(
      sorted.value,
      searched.value,
      pagination.value.current
    );

    if (response.data) {
      students.value = response.data;

      if (response.headers) {
        pagination.value.current = parseInt(response.headers["x-pagination-current-page"] || "1");
        pagination.value.size = parseInt(response.headers["x-pagination-per-page"] || "20");
        pagination.value.total = parseInt(response.headers["x-pagination-total-count"] || "0");
      }
    }

  } catch (error) {
    console.error(error);
    ElMessage.error('Failed to fetch students');
  } finally {
    loading.value = false;
  }
};

const handleSearch = (value: string) => {
  searched.value = value;
  pagination.value.current = 1;
  fetchData();
};

const handleSort = (value: string) => {
  sorted.value = value;
  fetchData();
};

const handleCurrentChange = (page: number) => {
  pagination.value.current = page;
  fetchData();
};

const handleCreate = () => {
  ElMessage.info('Create functionality to be implemented');
};

const handleEdit = (item: Student) => {
  ElMessage.info(`Edit student: ${item.name}`);
};

const handleDelete = async (item: Student) => {
  try {
    await ElMessageBox.confirm(
      t("manager.list.confirm.message1"),
      t("manager.list.confirm.message2"),
      {
        confirmButtonText: t("manager.list.confirm.confirm"),
        cancelButtonText: t("manager.list.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteStudent(item.id);
    ElMessage.success(t("manager.list.confirm.success"));
    fetchData();
  } catch {
    // Cancelled
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped lang="scss">
.student-management {
  padding: 20px;
}

.student-card {
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

.student-name {
  font-size: 16px;
  font-weight: bold;
  display: block;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-info {
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
