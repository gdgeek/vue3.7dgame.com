<template>
  <div class="class-management">
    <el-container>
      <el-header>
        <MrPPHeader :sorted="sorted" :searched="searched" @search="handleSearch" @sort="handleSort">
          <el-button-group :inline="true">
            <el-button size="small" type="primary" @click="handleCreate">
              <font-awesome-icon icon="plus"></font-awesome-icon>
              &nbsp;
              <span class="hidden-sm-and-down">{{ $t("manager.createClass") }}</span>
            </el-button>
          </el-button-group>
        </MrPPHeader>
      </el-header>
      <el-main>
        <el-row :gutter="20" v-loading="loading">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4" v-for="item in classes" :key="item.id">
            <el-card class="class-card" :body-style="{ padding: '0px' }">
              <div class="image-container">
                <img :src="item.image?.url || getDefaultImage(item.id)" class="image" />
              </div>
              <div style="padding: 14px">
                <span class="class-name" :title="item.name">{{ item.name }}</span>
                <div class="bottom clearfix">
                  <el-descriptions :column="1" size="small" class="class-info">
                    <el-descriptions-item :label="$t('manager.class.grade')">
                      {{ item.info?.grade || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item :label="$t('manager.class.teacher')">
                      {{ item.info?.teacher || '-' }}
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
          <el-empty v-if="!loading && classes.length === 0" description="No Data"></el-empty>
        </el-row>
      </el-main>
      <el-footer>
        <el-card class="box-card">
          <el-pagination :current-page="pagination.current" :page-size="pagination.size" :total="pagination.total"
            layout="prev, pager, next, jumper" background @current-change="handleCurrentChange"></el-pagination>
        </el-card>
      </el-footer>
    </el-container>

    <!-- Edit Class Dialog -->
    <el-dialog v-model="editDialogVisible" :title="$t('manager.class.dialog.editTitle')" width="500px"
      :close-on-click-modal="false">
      <el-form :model="editForm" label-width="120px">
        <el-form-item :label="$t('manager.class.form.name')">
          <el-input v-model="editForm.name" :placeholder="$t('manager.class.form.namePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('manager.class.form.image')">
          <ImageSelector :item-id="editForm.id" :image-url="editForm.imageUrl" @image-selected="handleImageSelected"
            @image-upload-success="handleImageSelected" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">{{ $t('manager.form.cancel') }}</el-button>
        <el-button type="primary" @click="handleSaveEdit">{{ $t('manager.form.submit') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import MrPPHeader from "@/components/MrPP/MrPPHeader/index.vue";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import { getClasses, deleteClass, createClass, updateClass } from "@/api/v1/edu-class";
import type { EduClass } from "@/api/v1/types/edu-class";
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const classes = ref<EduClass[]>([]);
const loading = ref(false);
const sorted = ref("-created_at");
const searched = ref("");
const pagination = ref({
  current: 1,
  size: 20,
  total: 0,
});

// Edit dialog state
const editDialogVisible = ref(false);
const editForm = ref({
  id: 0,
  name: '',
  image_id: null as number | null,
  imageUrl: '',
});

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await getClasses(
      sorted.value,
      searched.value,
      pagination.value.current
    );

    if (response.data) {
      classes.value = response.data;

      if (response.headers) {
        pagination.value.current = parseInt(response.headers["x-pagination-current-page"] || "1");
        pagination.value.size = parseInt(response.headers["x-pagination-per-page"] || "20");
        pagination.value.total = parseInt(response.headers["x-pagination-total-count"] || "0");
      }
    }

  } catch (error) {
    console.error(error);
    ElMessage.error('Failed to fetch classes');
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
    await ElMessageBox.confirm(
      t('manager.class.messages.createConfirm'),
      t('manager.class.dialog.createTitle'),
      {
        confirmButtonText: t('manager.form.submit'),
        cancelButtonText: t('manager.form.cancel'),
        type: 'info',
      }
    );

    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-').replace(/:/g, '-').replace(/ /g, '_');

    const defaultName = `新班级_${timestamp}`;

    await createClass({
      name: defaultName,
    });

    ElMessage.success(t('manager.class.messages.createSuccess'));
    fetchData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error);
      ElMessage.error(t('manager.class.messages.createFailed'));
    }
  }
};

const handleEdit = (item: EduClass) => {
  editForm.value = {
    id: item.id,
    name: item.name,
    image_id: item.image ? item.image.id : null,
    imageUrl: item.image ? item.image.url : '',
  };
  editDialogVisible.value = true;
};

const handleImageSelected = (data: { imageId: number; itemId: number; imageUrl?: string }) => {
  editForm.value.image_id = data.imageId;
  if (data.imageUrl) {
    editForm.value.imageUrl = data.imageUrl;
  }
};

const handleSaveEdit = async () => {
  try {
    await updateClass(editForm.value.id, {
      name: editForm.value.name,
      image_id: editForm.value.image_id,
    });
    ElMessage.success(t('manager.class.messages.updateSuccess'));
    editDialogVisible.value = false;
    fetchData();
  } catch (error) {
    console.error(error);
    ElMessage.error(t('manager.class.messages.updateFailed'));
  }
};

const handleDelete = async (item: EduClass) => {
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
    await deleteClass(item.id);
    ElMessage.success(t("manager.list.confirm.success"));
    fetchData();
  } catch {
    // Cancelled
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
.class-management {
  padding: 20px;
}

.class-card {
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

.class-name {
  font-size: 16px;
  font-weight: bold;
  display: block;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.class-info {
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
