<template>
  <div class="class-group-list-wrapper">
    <CardListPage
      ref="cardListPageRef"
      :fetch-data="fetchGroups"
      :page-size="pageSize"
      :card-width="250"
      :show-header="true"
      :auto-fill="true"
      :min-card-width="240"
      wrapper-class="group-list-wrapper"
      @refresh="handleRefresh"
    >
      <template #header-actions>
        <slot name="header-actions">
          <!-- Always allow create, or controlled by parent -->
          <el-button type="primary" size="small" @click="$emit('create-group')">
            <el-icon>
              <Plus></Plus>
            </el-icon>
            {{ $t("route.personalCenter.campus.createGroup") }}
          </el-button>
        </slot>
      </template>

      <template #card="{ item }">
        <MrPPCard
          :item="item"
          type="小组"
          color="#d35400"
          :show-actions="false"
        >
          <template #enter>
            <div class="card-actions">
              <!-- If this is one of my groups -->
              <template v-if="isMyGroup(item)">
                <el-tag type="success" size="small" class="my-group-tag">{{
                  $t("route.personalCenter.campus.myGroup")
                }}</el-tag>
                <div class="action-buttons">
                  <el-button-group>
                    <el-button
                      type="success"
                      size="small"
                      @click="$emit('enter-group', item)"
                    >
                      {{ $t("common.enter") }}
                    </el-button>
                    <el-button
                      type="primary"
                      size="small"
                      @click="$emit('edit-group', item)"
                    >
                      {{ $t("common.edit") }}
                    </el-button>
                    <el-button
                      type="danger"
                      size="small"
                      @click="$emit('delete-group', item)"
                    >
                      {{ $t("common.delete") }}
                    </el-button>
                  </el-button-group>
                </div>
              </template>

              <!-- If I have joined this group -->
              <template v-else-if="item.joined">
                <div class="spacer"></div>
                <div class="action-buttons">
                  <el-button-group>
                    <el-button
                      type="success"
                      size="small"
                      @click="$emit('enter-group', item)"
                    >
                      {{ $t("common.enter") }}
                    </el-button>
                    <el-button
                      type="danger"
                      size="small"
                      :loading="joiningGroupId === item.id"
                      @click="$emit('leave-group', item)"
                    >
                      {{ $t("route.personalCenter.campus.leaveGroup") }}
                    </el-button>
                  </el-button-group>
                </div>
              </template>

              <!-- If I am not in this group, show Join -->
              <div v-else class="action-buttons join-action">
                <el-button
                  type="primary"
                  size="small"
                  :loading="joiningGroupId === item.id"
                  @click="$emit('join-group', item)"
                >
                  {{ $t("route.personalCenter.campus.join") }}
                </el-button>
              </div>
            </div>
          </template>
        </MrPPCard>
      </template>
    </CardListPage>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useUserStoreHook } from "@/store/modules/user";
import { Plus } from "@element-plus/icons-vue";
import CardListPage from "@/components/MrPP/CardListPage/index.vue";
import MrPPCard from "@/components/MrPP/MrPPCard/index.vue";
import { getClassGroups } from "@/api/v1/edu-class";
import type { Group } from "@/api/v1/types/group";
import type {
  FetchParams,
  FetchResponse,
} from "@/components/MrPP/CardListPage/types";

const props = defineProps<{
  classId: number;
  myGroups: Group[]; // Changed from myGroup | null
  joiningGroupId?: number | null;
  pageSize?: number;
}>();

const emit = defineEmits<{
  (e: "create-group"): void;
  (e: "edit-group", group: Group): void;
  (e: "delete-group", group: Group): void;
  (e: "join-group", group: Group): void;
  (e: "leave-group", group: Group): void;
  (e: "enter-group", group: Group): void;
}>();

const userStore = useUserStoreHook();
const currentUserId = computed(() => userStore.userInfo?.id);

const isMyGroup = (group: Group) => {
  return group.user_id === currentUserId.value;
};

const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const fetchGroups = async (params: FetchParams): Promise<FetchResponse> => {
  console.log("ClassGroupList: fetchGroups called with", params);
  const response = await getClassGroups(
    props.classId,
    params.sort,
    params.search,
    params.page,
    "image,user,joined"
  );
  return response;
};

const handleRefresh = () => {
  // Optional: emit refresh event up if needed
};

// Expose refresh method to parent
const refresh = () => {
  cardListPageRef.value?.refresh();
};

defineExpose({
  refresh,
});
</script>

<style scoped lang="scss">
.group-list-wrapper {
  padding: 0 !important; // Override CardListPage padding

  // Target specifically the outer container card of card-list-page
  // Structure: .class-group-list-wrapper > .group-list-wrapper > .el-container > .el-main > .el-card
  // We use child combinator > to avoid hitting nested cards in the slot
  :deep(> .group-list-wrapper > .el-container > .el-main > .el-card) {
    border: none;
    box-shadow: none;

    > .el-card__body {
      padding: 0;
    }
  }

  // Also fix the header/footer layout which are direct children of that card
  :deep(.group-list-wrapper .el-header) {
    padding: 0 0 16px 0;
    height: auto;
  }

  :deep(.group-list-wrapper .el-footer) {
    padding: 16px 0 0 0;
    height: auto;
  }
}

.card-actions {
  display: flex;
  justify-content: space-between; // Changed from flex-end to space-between
  align-items: center;
  width: 100%;
  gap: 8px;
  padding: 8px;
}

.spacer {
  flex-grow: 1;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  // Ensure buttons stay to the right if only buttons exist
  margin-left: auto;
}

// Special case for join button to be centered or right aligned?
// Original was right aligned. margin-left: auto handles it.
.join-action {
  width: 100%;
  justify-content: flex-end;
}
</style>
