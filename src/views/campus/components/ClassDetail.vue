<template>
  <div class="class-detail-container" v-loading="loading">
    <!-- Class Header -->
    <div v-if="classInfo" class="class-wrapper">
      <div class="class-header">
        <div class="class-header-left">
          <div class="class-image">
            <Id2Image
              :id="classInfo.id"
              :image="classInfo.image?.url || null"
              :lazy="false"
              fit="cover"
            ></Id2Image>
          </div>
          <div class="class-info">
            <h3 class="class-name">{{ classInfo.name || "No Class Name" }}</h3>
            <p class="school-name">
              <el-icon>
                <OfficeBuilding></OfficeBuilding>
              </el-icon>
              {{ classInfo.school?.name || "-" }}
            </p>
          </div>
        </div>
        <div class="class-header-right">
          <slot name="header-actions"></slot>
        </div>
      </div>

      <!-- Group List Section -->
      <div class="group-section">
        <ClassGroupList
          ref="groupListRef"
          :class-id="classId"
          :my-groups="groups"
          :joining-group-id="joiningGroupId"
          @join-group="handleJoinGroup"
          @create-group="openGroupDialog()"
          @edit-group="openGroupDialog"
          @delete-group="handleDeleteGroup"
          @leave-group="handleLeaveGroup"
          @enter-group="handleEnterGroup"
        ></ClassGroupList>
      </div>
    </div>

    <el-empty
      v-else-if="!loading"
      :description="$t('common.noData')"
    ></el-empty>

    <!-- Create/Edit Group Dialog -->
    <el-dialog
      v-model="groupDialogVisible"
      :title="
        groupForm.id
          ? $t('common.edit')
          : $t('route.personalCenter.campus.createGroup')
      "
      width="500px"
    >
      <el-form :model="groupForm" label-width="100px">
        <el-form-item :label="$t('common.name')" required>
          <el-input
            v-model="groupForm.name"
            :placeholder="
              $t('route.personalCenter.campus.groupNamePlaceholder')
            "
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('common.description')">
          <el-input
            v-model="groupForm.description"
            type="textarea"
            :placeholder="
              $t('route.personalCenter.campus.groupDescPlaceholder')
            "
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('route.personalCenter.campus.groupImage')">
          <ImageSelector
            :item-id="groupForm.id || undefined"
            :image-url="groupForm.imageUrl"
            @image-selected="handleGroupImageSelected"
            @image-upload-success="handleGroupImageSelected"
          ></ImageSelector>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">{{
          $t("common.cancel")
        }}</el-button>
        <el-button
          type="primary"
          :loading="savingGroup"
          @click="handleSaveGroup"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { OfficeBuilding } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useUserStoreHook } from "@/store/modules/user";
import Id2Image from "@/components/Id2Image.vue";
import ClassGroupList from "./ClassGroupList.vue";
import ImageSelector from "@/components/MrPP/ImageSelector.vue";
import { getClass, getClassGroups, createClassGroup } from "@/api/v1/edu-class";
import {
  deleteGroup,
  joinGroup,
  leaveGroup,
  updateGroup,
} from "@/api/v1/group";
import type { EduClass } from "@/api/v1/types/edu-class";
import type { Group } from "@/api/v1/types/group";

const props = defineProps<{
  classId: number;
}>();

const emit = defineEmits<{
  "class-loaded": [classInfo: EduClass];
}>();

const { t } = useI18n();
const router = useRouter();

const loading = ref(false);
const classInfo = ref<EduClass | null>(null);
const groups = ref<Group[]>([]);
const groupListRef = ref<InstanceType<typeof ClassGroupList> | null>(null);

// Group dialog state
const groupDialogVisible = ref(false);
const savingGroup = ref(false);
const joiningGroupId = ref<number | null>(null);
const groupForm = ref({
  id: null as number | null,
  name: "",
  description: "",
  image_id: null as number | null,
  imageUrl: "",
});

const fetchClassInfo = async () => {
  if (!props.classId) return;
  loading.value = true;
  try {
    const response = await getClass(props.classId, "image,school");
    classInfo.value = response.data;
    emit("class-loaded", response.data);
    await fetchGroups();
  } catch (error) {
    console.error("Failed to fetch class info:", error);
    classInfo.value = null;
  } finally {
    loading.value = false;
  }
};

const fetchGroups = async () => {
  if (!props.classId) return;
  try {
    const response = await getClassGroups(
      props.classId,
      "-created_at",
      "",
      1,
      "image,user,joined"
    );
    const groupData = response.data;
    groups.value = Array.isArray(groupData)
      ? groupData
      : groupData
        ? [groupData]
        : [];
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    groups.value = [];
  }
};

const openGroupDialog = (group?: Group) => {
  if (group) {
    groupForm.value = {
      id: group.id,
      name: group.name,
      description: group.description || "",
      image_id: (group as any).image_id || group.image?.id || null,
      imageUrl: group.image?.url || "",
    };
  } else {
    const userStore = useUserStoreHook();
    const user = userStore.userInfo;
    const userName =
      user?.userData?.nickname ||
      user?.userData?.username ||
      user?.userData?.email ||
      "User";
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const defaultName = `${t("route.personalCenter.campus.defaultGroupName", { name: userName })} ${dateStr}`;
    groupForm.value = {
      id: null,
      name: defaultName,
      description: "",
      image_id: null,
      imageUrl: "",
    };
  }
  groupDialogVisible.value = true;
};

const handleGroupImageSelected = (data: {
  imageId: number;
  itemId: number | null;
  imageUrl?: string;
}) => {
  groupForm.value.image_id = data.imageId;
  groupForm.value.imageUrl = data.imageUrl || "";
};

const handleSaveGroup = async () => {
  if (!groupForm.value.name.trim()) {
    ElMessage.warning(t("route.personalCenter.campus.groupNameRequired"));
    return;
  }
  if (!props.classId) return;

  savingGroup.value = true;
  try {
    if (groupForm.value.id) {
      await updateGroup(groupForm.value.id, {
        name: groupForm.value.name,
        description: groupForm.value.description,
        image_id: groupForm.value.image_id ?? undefined,
      });
      ElMessage.success(t("common.updateSuccess"));
    } else {
      await createClassGroup(props.classId, {
        name: groupForm.value.name,
        description: groupForm.value.description,
        image_id: groupForm.value.image_id ?? undefined,
      });
      ElMessage.success(t("common.createSuccess"));
    }
    groupDialogVisible.value = false;
    await fetchGroups();
    groupListRef.value?.refresh();
  } catch (error: any) {
    console.error("Failed to save group:", error);
    const errorMsg =
      error.response?.data?.message || t("common.operationFailed");
    ElMessage.error(errorMsg);
  } finally {
    savingGroup.value = false;
  }
};

const handleJoinGroup = async (group: Group) => {
  joiningGroupId.value = group.id;
  try {
    await ElMessageBox.confirm(
      t("route.personalCenter.campus.confirmJoinGroup"),
      t("route.personalCenter.campus.joinGroup"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        type: "info",
      }
    );
    await joinGroup(group.id);
    ElMessage.success(t("route.personalCenter.campus.joinSuccess"));
    await fetchGroups();
    groupListRef.value?.refresh();
  } catch (error: any) {
    if (error !== "cancel") {
      const backendMsg = error.response?.data?.message || "";
      let errorMsg = t("route.personalCenter.campus.joinFailed");
      if (backendMsg.includes("already joined")) {
        errorMsg = t("route.personalCenter.campus.alreadyJoinedGroup");
      }
      ElMessage.error(errorMsg);
    }
  } finally {
    joiningGroupId.value = null;
  }
};

const handleLeaveGroup = async (group: Group) => {
  joiningGroupId.value = group.id;
  try {
    await ElMessageBox.confirm(
      t("route.personalCenter.campus.confirmLeave"),
      t("route.personalCenter.campus.leaveGroup"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      }
    );
    await leaveGroup(group.id);
    ElMessage.success(t("route.personalCenter.campus.leaveSuccess"));
    await fetchGroups();
    groupListRef.value?.refresh();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(
        error.response?.data?.message || t("common.operationFailed")
      );
    }
  } finally {
    joiningGroupId.value = null;
  }
};

const handleDeleteGroup = async (group: Group) => {
  try {
    await ElMessageBox.confirm(
      t("route.personalCenter.campus.confirmDeleteGroup"),
      t("common.confirm"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      }
    );
    await deleteGroup(group.id);
    ElMessage.success(t("common.deleteSuccess"));
    await fetchGroups();
    groupListRef.value?.refresh();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(
        error.response?.data?.message || t("common.deleteFailed")
      );
    }
  }
};

const handleEnterGroup = (group: Group) => {
  router.push({ path: "/campus/group", query: { group_id: group.id } });
};

watch(
  () => props.classId,
  () => {
    fetchClassInfo();
  },
  { immediate: true }
);

defineExpose({ refresh: fetchGroups });
</script>

<style scoped lang="scss">
.class-detail-container {
  min-height: 200px;
}

.class-wrapper {
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.class-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
}

.class-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.class-image {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.class-info {
  flex: 1;
  min-width: 0;

  .class-name {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .school-name {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.class-header-right {
  flex-shrink: 0;
  margin-left: 20px;
}

.group-section {
  padding: 16px 20px;
}
</style>
