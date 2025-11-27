<template>
  <div class="school-management">
    <el-container>
      <el-header>
        <MrPPHeader :sorted="sorted" :searched="searched" @search="handleSearch" @sort="handleSort">
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="handleCreate">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">{{ $t("manager.createSchool") }}</span>
            </el-button>
          </el-button-group>
        </MrPPHeader>
      </el-header>
      <el-main>
        <el-row :gutter="20" v-loading="loading">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4" v-for="school in schools" :key="school.id">
            <el-card class="school-card" :body-style="{ padding: '0px' }">
              <div class="image-container">
                <img :src="school.image?.url || getDefaultImage(school.id)" class="image" />
              </div>
              <div style="padding: 14px">
                <span class="school-name" :title="school.name">{{ school.name }}</span>
                <div class="bottom clearfix">
                  <el-descriptions :column="1" size="small" class="school-info">
                    <el-descriptions-item :label="$t('manager.school.principal')">
                      <span v-if="school.principal">
                        {{ (school.principal as any).nickname || (school.principal as any).username || '-' }}
                      </span>
                      <el-button v-else type="primary" size="small" :icon="Plus" circle
                        @click="handleAssignPrincipal(school)" />
                    </el-descriptions-item>
                    <el-descriptions-item :label="$t('manager.school.address')">
                      {{ school.info?.address || '-' }}
                    </el-descriptions-item>
                  </el-descriptions>
                  <div class="actions">
                    <el-button type="primary" size="small" link @click="handleEdit(school)">{{ $t('manager.form.edit')
                    }}</el-button>
                    <el-button type="danger" size="small" link @click="handleDelete(school)">{{
                      $t('manager.list.cancel') }}</el-button>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-empty v-if="!loading && schools.length === 0" :description="$t('manager.errors.noData')"></el-empty>
        </el-row>
      </el-main>
      <el-footer>
        <el-card class="box-card">
          <el-pagination :current-page="pagination.current" :page-size="pagination.size" :total="pagination.total"
            layout="prev, pager, next, jumper" background @current-change="handleCurrentChange"></el-pagination>
        </el-card>
      </el-footer>
    </el-container>

    <!-- Edit School Dialog -->
    <el-dialog v-model="editDialogVisible" :title="$t('manager.dialog.editTitle')" width="500px"
      :close-on-click-modal="false">
      <el-form :model="editForm" label-width="120px">
        <el-form-item :label="$t('manager.form.name')">
          <el-input v-model="editForm.name" :placeholder="$t('manager.form.namePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('manager.form.image')">
          <ImageSelector :item-id="editForm.id" :image-url="editForm.imageUrl" @image-selected="handleImageSelected"
            @image-upload-success="handleImageSelected" />
        </el-form-item>
        <el-form-item :label="$t('manager.form.principal')">
          <el-button @click="openPrincipalSelector">
            {{ editForm.principalName || $t('manager.form.principalPlaceholder') }}
          </el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">{{ $t('manager.form.cancel') }}</el-button>
        <el-button type="primary" @click="handleSaveEdit">{{ $t('manager.form.submit') }}</el-button>
      </template>
    </el-dialog>

    <!-- User Selection Dialog -->
    <UserSelector v-model="userDialogVisible" :title="$t('common.selectUser')" @select="handleSelectUser" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import UserSelector from "@/components/UserSelector/index.vue";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import type { EduSchool } from '@/api/v1/types/edu-school';
import { getSchools, deleteSchool, createSchool, updateSchool } from "@/api/v1/edu-school";
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const schools = ref<EduSchool[]>([]);
const loading = ref(false);
const sorted = ref("-created_at");
const searched = ref("");
const pagination = ref({
  current: 1,
  size: 20,
  total: 0,
});

// User selection dialog state
const userDialogVisible = ref(false);
const selectedSchool = ref<EduSchool | null>(null);

// Edit dialog state
const editDialogVisible = ref(false);
const editForm = ref({
  id: 0,
  name: '',
  principal_id: null as number | null,
  principalName: '',
  image_id: null as number | null,
  imageUrl: '',
});

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await getSchools(
      sorted.value,
      searched.value,
      pagination.value.current,
      "image,principal"
    );

    // Assuming the response structure matches the one in person.ts (with headers for pagination)
    // If the API returns a different structure, this needs adjustment.
    // Based on getPerson in person.ts, it returns response.data directly as array if typed as request<userData[]>
    // But usually pagination info is in headers or a wrapper object.
    // Let's assume standard response handling or adjust based on actual API behavior.
    // Since I don't see the backend, I'll assume standard headers pagination like in user.vue

    if (response.data) {
      schools.value = response.data;

      if (response.headers) {
        pagination.value.current = parseInt(response.headers["x-pagination-current-page"] || "1");
        pagination.value.size = parseInt(response.headers["x-pagination-per-page"] || "20");
        pagination.value.total = parseInt(response.headers["x-pagination-total-count"] || "0");
      }
    }

  } catch (error) {
    console.error(error);
    ElMessage.error(t('manager.errors.fetchFailed'));
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

const handleCreate = async () => {
  try {
    // Ask for confirmation first
    await ElMessageBox.confirm(
      t('manager.messages.createConfirm'),
      t('manager.dialog.createTitle'),
      {
        confirmButtonText: t('manager.form.submit'),
        cancelButtonText: t('manager.form.cancel'),
        type: 'info',
      }
    );

    // Generate a default name with timestamp
    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-').replace(/:/g, '-').replace(/ /g, '_');

    const defaultName = `新学校_${timestamp}`;

    await createSchool({
      name: defaultName,
    });

    ElMessage.success(t('manager.messages.createSuccess'));
    fetchData(); // Refresh the list
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error);
      ElMessage.error(t('manager.messages.createFailed'));
    }
  }
};

const handleEdit = async (school: EduSchool) => {
  editForm.value = {
    id: school.id,
    name: school.name,
    principal_id: school.principal ? (school.principal as any).id : null,
    principalName: school.principal ? ((school.principal as any).nickname || (school.principal as any).username) : '',
    image_id: school.image ? school.image.id : null,
    imageUrl: school.image ? school.image.url : '',
  };
  editDialogVisible.value = true;
};

const openPrincipalSelector = () => {
  userDialogVisible.value = true;
};

const handleImageSelected = (data: { imageId: number; itemId: number; imageUrl?: string }) => {
  editForm.value.image_id = data.imageId;
  if (data.imageUrl) {
    editForm.value.imageUrl = data.imageUrl;
  }
};

const handleSaveEdit = async () => {
  try {
    await updateSchool(editForm.value.id, {
      name: editForm.value.name,
      principal_id: editForm.value.principal_id,
      image_id: editForm.value.image_id,
    });
    ElMessage.success(t('manager.messages.updateSuccess'));
    editDialogVisible.value = false;
    fetchData();
  } catch (error) {
    console.error(error);
    ElMessage.error(t('manager.messages.updateFailed'));
  }
};

const handleDelete = async (school: EduSchool) => {
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

    await deleteSchool(school.id);
    ElMessage.success(t("manager.list.confirm.success"));
    fetchData(); // Refresh the list
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error);
      ElMessage.error(t('manager.messages.deleteFailed'));
    }
  }
};

const handleAssignPrincipal = (school: EduSchool) => {
  selectedSchool.value = school;
  userDialogVisible.value = true;
};

const handleSelectUser = async (user: any) => {
  // If editing, update the edit form
  if (editDialogVisible.value) {
    editForm.value.principal_id = user.id;
    editForm.value.principalName = user.nickname || user.username;
    userDialogVisible.value = false;
    return;
  }

  // If assigning principal directly
  if (!selectedSchool.value) return;

  try {
    await updateSchool(selectedSchool.value.id, {
      principal_id: user.id,
    });

    ElMessage.success(t('manager.principal.assignSuccess'));
    userDialogVisible.value = false;
    fetchData(); // Refresh school list
  } catch (error) {
    console.error(error);
    ElMessage.error(t('manager.principal.assignFailed'));
  }
};



const getDefaultImage = (id: number) => {
  const index = id % 100;
  return new URL(`../../assets/images/items/${index}.webp`, import.meta.url).href;
};

onMounted(() => {
  fetchData();
});
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
