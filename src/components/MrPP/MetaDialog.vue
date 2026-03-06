<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      class="resource-dialog meta-dialog"
      width="90%"
      top="2vh"
      :show-close="false"
      append-to-body
      @close="cancel"
    >
      <template #header>
        <div class="dialog-header">
          <PageActionBar
            class="dialog-action-bar"
            :title="$t('verse.view.metaDialog.title')"
            :search-placeholder="$t('ui.search')"
            :show-view-toggle="false"
            :default-sort="active.sorted"
            @search="search"
            @sort-change="sort"
          >
            <template #actions>
              <el-button type="primary" @click="create">
                {{ $t("verse.view.metaDialog.create") }}
              </el-button>
              <el-button @click="dialogVisible = false">
                {{ $t("verse.view.metaDialog.cancel") }}
              </el-button>
            </template>
          </PageActionBar>
        </div>
      </template>

      <el-card
        v-loading="loading"
        class="resource-list-shell"
        shadow="never"
        :body-style="{ padding: '0' }"
      >
        <div v-if="active.items?.length" class="resource-grid meta-grid">
          <div
            v-for="item in active.items"
            :key="item.id"
            class="resource-item"
          >
            <StandardCard
              :image="item.image?.url || ''"
              :title="title(item)"
              :meta="{
                date: item.created_at
                  ? convertToLocalTime(item.created_at)
                  : '',
              }"
              :selection-mode="false"
              :show-checkbox="false"
              :type-icon="['fas', 'cube']"
              :placeholder-icon="['fas', 'cube']"
            ></StandardCard>
            <div class="card-actions">
              <el-button
                size="small"
                type="primary"
                @click="selected({ data: item })"
              >
                {{ $t("verse.view.metaDialog.select") }}
              </el-button>
            </div>
          </div>
        </div>
        <template v-else>
          <el-skeleton></el-skeleton>
        </template>
      </el-card>

      <template #footer>
        <div class="dialog-footer">
          <PagePagination
            :current-page="active.pagination.current"
            :total-pages="active.pagination.count || 1"
            @page-change="handleCurrentChange"
          ></PagePagination>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import { ElMessage, ElMessageBox } from "element-plus";
import { getMetas, metaInfo, postMeta } from "@/api/v1/meta";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import {
  PageActionBar,
  PagePagination,
  StandardCard,
} from "@/components/StandardPage";
import { useDialogList } from "@/composables/useDialogList";

const emit = defineEmits(["selected", "cancel"]);

const { t } = useI18n();
const metaCache = new Map<
  string,
  { data: metaInfo[]; headers?: Record<string, unknown> }
>();

const {
  dialogVisible,
  loading,
  active,
  sort,
  search,
  handleCurrentChange,
  openDialog,
} = useDialogList<metaInfo>(async (sorted, searched, page) => {
  const key = `${sorted}::${searched}::${page}`;
  const cached = metaCache.get(key);
  if (cached) return cached;

  const response = (await getMetas(
    sorted,
    searched,
    page,
    "image",
    "id,title,name,created_at,image"
  )) as { data: metaInfo[]; headers?: Record<string, unknown> };

  metaCache.set(key, response);
  return response;
});

type MetaSelection = {
  data: metaInfo;
  title?: string;
};

const title = (item: metaInfo) => {
  return item.title || item.name || "title";
};

const open = async (_newValue?: unknown, _newVerseId?: number) => {
  await openDialog();
};

const selected = async (data: MetaSelection | null) => {
  if (data) {
    data.title = data.data.title;
    emit("selected", data);
  } else {
    emit("selected", null);
  }
  dialogVisible.value = false;
};

const input = async (text: string): Promise<string> => {
  try {
    const { value } = (await ElMessageBox.prompt(
      text,
      t("verse.view.metaDialog.prompt.message"),
      {
        confirmButtonText: t("verse.view.metaDialog.prompt.confirm"),
        cancelButtonText: t("verse.view.metaDialog.prompt.cancel"),
      }
    )) as { value: string };
    return value;
  } catch {
    ElMessage.info(t("verse.view.metaDialog.prompt.info"));
    throw new Error("User cancelled input");
  }
};

const create = async () => {
  const name = await input(t("verse.view.metaDialog.input2"));
  const response = await postMeta({
    title: name || "新建实体",
    custom: true,
    uuid: uuidv4(),
  });
  metaCache.clear();
  selected({ data: response.data });
};

const cancel = () => {
  emit("cancel");
};

defineExpose({
  open,
});
</script>

<style scoped lang="scss">
.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 0;
}

:deep(.resource-dialog .el-dialog) {
  border-radius: 18px;
}

:deep(.resource-dialog .el-dialog__header) {
  padding: 10px 16px 0;
  border-bottom: none;
}

:deep(.resource-dialog .el-dialog__body) {
  padding: 2px 16px 0;
}

:deep(.resource-dialog .el-dialog__footer) {
  padding: 8px 16px 16px;
}

.dialog-action-bar {
  :deep(.page-action-bar) {
    margin-bottom: 0;
    border-bottom: none;
    padding-bottom: 0;
  }

  :deep(.title-row) {
    padding: 8px 0 12px;
  }

  :deep(.controls-row) {
    padding: 8px 0 8px;
  }

  :deep(.controls-right) {
    gap: 8px;
  }
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 0.96fr));
  gap: var(--resource-dialog-grid-gap, 26px);
  max-height: 67vh;
  overflow: auto;
  padding: 0 var(--resource-dialog-grid-padding-x, 20px)
    var(--resource-dialog-grid-padding-bottom, 6px)
    var(--resource-dialog-grid-padding-x, 20px);
  justify-content: space-between;
}

.resource-list-shell {
  border: none !important;
  background: transparent !important;
  margin-top: var(--resource-dialog-shell-offset-top, -6px);

  :deep(.el-card__body) {
    border: none !important;
    background: transparent !important;
  }

  :deep(.standard-card) {
    border: 1px solid
      var(--resource-dialog-card-border-color, var(--border-color, #e2e8f0));
    box-shadow: var(--resource-dialog-card-shadow, none);
  }

  :deep(.standard-card:hover) {
    border-color: var(
      --resource-dialog-card-hover-border-color,
      var(--border-color-hover, #cbd5e1)
    );
    box-shadow: var(
      --resource-dialog-card-hover-shadow,
      0 6px 16px rgba(15, 23, 42, 0.08)
    );
    transform: translateY(-2px);
  }
}

.resource-item {
  min-width: 0;
}

.card-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
  padding-top: 10px;

  :deep(.el-button) {
    min-width: 76px;
    height: 30px;
    padding: 0 14px;
    margin: 0;
    border-radius: 999px;
    font-size: 13px;
  }
}

.dialog-footer {
  margin-top: 0;
}

.dialog-footer :deep(.page-pagination) {
  padding: 12px 0 4px;
}

@media (max-width: 1680px) {
  .resource-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 1360px) {
  .resource-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
