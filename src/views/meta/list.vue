<template>
  <TransitionWrapper>
    <div class="meta-list">
      <PageActionBar
        :title="t('meta.list.pageTitle')"
        :show-title="false"
        :search-placeholder="t('meta.list.searchPlaceholder')"
        @search="handleSearchWithScope"
        @sort-change="handleSortChangeWithScope"
        @view-change="handleViewChange"
      >
        <template #filters>
          <ResourceScopeFilter
            mode="scene"
            :scene-id="selectedSceneId"
            :entity-id="null"
            :show-scene-select="true"
            :show-entity-select="false"
            :loading-scenes="loadingScenes"
            :loading-scene-detail="loadingSceneDetail"
            :loading-entity-detail="false"
            :scenes="scenes"
            :entities="[]"
            @scene-change="handleSceneChange"
          >
          </ResourceScopeFilter>
        </template>
        <template #actions>
          <el-button type="primary" @click="addMeta">
            <font-awesome-icon
              :icon="['fas', 'plus']"
              style="margin-right: 4px; font-size: 18px"
            ></font-awesome-icon>
            {{ t("meta.list.createAction") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer
        class="list-view"
        :items="displayItems"
        :view-mode="viewMode"
        :loading="loading"
        :show-empty="!loadingSceneDetail"
        :breakpoints="denseResourceBreakpoints"
        :card-gutter="denseResourceCardGutter"
        @row-click="openDetail"
      >
        <template #grid-card="{ item }">
          <StandardCard
            :image="item.image?.url"
            :title="item.title || item.name || t('meta.list.unnamed')"
            :type-icon="['fas', 'puzzle-piece']"
            :placeholder-icon="['fas', 'puzzle-piece']"
            :show-checkbox="false"
            @view="openDetail(item)"
          >
            <template #actions>
              <div class="single-card-actions">
                <button
                  class="single-card-action-btn"
                  @click.stop="goToEditor(item)"
                >
                  <font-awesome-icon
                    :icon="['fas', 'pen-to-square']"
                  ></font-awesome-icon>
                  {{ t("route.meta.sceneEditor") }}
                </button>
              </div>
            </template>
          </StandardCard>
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">{{ t("meta.list.columns.name") }}</div>
          <div class="col-author">{{ t("meta.list.columns.author") }}</div>
          <div class="col-resources">
            {{ t("meta.list.columns.resources") }}
          </div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.image?.url"
                :src="item.image.url"
                :alt="item.title"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon
                  :icon="['fas', 'puzzle-piece']"
                ></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">{{ item.title || item.name || "—" }}</span>
            <el-button
              class="btn-hover-action"
              type="primary"
              @click.stop="goToEditor(item)"
            >
              {{ t("meta.list.enterEditor") }}
            </el-button>
          </div>
          <div class="col-author">
            {{ item.author?.nickname || item.author?.username || "—" }}
          </div>
          <div class="col-resources">{{ getResourceCount(item) }}</div>
          <div class="col-actions" @click.stop>
            <el-dropdown trigger="click">
              <font-awesome-icon
                :icon="['fas', 'ellipsis']"
                class="actions-icon"
              ></font-awesome-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)">{{
                    t("meta.list.viewDetail")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="goToEditor(item)">{{
                    t("meta.list.enterEditor")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="copyWindow(item)">{{
                    t("meta.copy")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)">{{
                    t("meta.list.rename")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item, () => {})">{{
                    t("meta.delete")
                  }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :icon="['fas', 'folder-open']"
            :text="t('meta.list.emptyText')"
            :action-text="t('meta.list.createAction')"
            @action="addMeta"
          ></EmptyState>
        </template>
      </ViewContainer>

      <PagePagination
        :current-page="displayCurrentPage"
        :total-pages="displayTotalPages"
        :sticky="true"
        @page-change="handlePageChangeWithScope"
      >
      </PagePagination>

      <!-- Detail Panel -->
      <DetailPanel
        v-model="detailVisible"
        :title="t('meta.list.detailTitle')"
        :name="currentMeta?.title || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'folder-open']"
        :show-delete="true"
        :secondary-action="true"
        :download-text="t('meta.list.copyEntity')"
        :delete-text="t('meta.list.deleteEntity')"
        action-layout="grid"
        width="560px"
        @download="handleCopy"
        @rename="handleRename"
        @delete="handleDelete"
        @close="handlePanelClose"
      >
        <template #actions>
          <button
            class="btn-pill-primary enter-edit-btn"
            @click="handleGoToEditor"
          >
            <font-awesome-icon
              :icon="['fas', 'pen-to-square']"
            ></font-awesome-icon>
            {{ t("route.meta.sceneEditor") }}
          </button>
          <div class="actions-row">
            <button class="btn-pill-secondary" @click="handleCopy">
              <font-awesome-icon :icon="['fas', 'copy']"></font-awesome-icon>
              {{ t("meta.list.copyEntity") }}
            </button>
            <button class="btn-pill-danger" @click="handleDelete">
              <font-awesome-icon
                :icon="['fas', 'trash-can']"
              ></font-awesome-icon>
              {{ t("meta.list.deleteEntity") }}
            </button>
          </div>
        </template>
        <template #preview>
          <div class="meta-preview" @click="triggerFileSelect">
            <img
              v-if="currentMeta?.image?.url"
              :src="currentMeta.image.url"
              :alt="currentMeta.title"
            />
            <div v-else class="preview-placeholder">
              <font-awesome-icon
                :icon="['fas', 'th-large']"
              ></font-awesome-icon>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              class="hidden-input"
              @change="handleCoverUpload"
            />
          </div>
        </template>
        <template #info>
          <SignalInfoPanel
            :inputs="eventInputs"
            :outputs="eventOutputs"
          ></SignalInfoPanel>
        </template>
        <template #property-used-scenes>
          <div class="used-scenes-value">
            <template v-if="usedSceneOptions.length === 0">
              {{ t("meta.list.properties.noScenes") }}
            </template>
            <template v-else>
              <div ref="usedScenesControlsRef" class="used-scenes-controls">
                <el-select
                  v-model="selectedUsedSceneModel"
                  class="used-scenes-select"
                  size="small"
                  popper-class="detail-link-select-popper detail-link-select-popper-scene"
                  @visible-change="handleUsedScenesDropdownVisible"
                >
                  <el-option
                    v-for="scene in usedSceneOptions"
                    :key="scene.id"
                    :label="scene.name"
                    :value="scene.id"
                  ></el-option>
                </el-select>
                <el-button
                  type="primary"
                  class="used-scenes-enter-btn"
                  size="small"
                  @click="handleEnterSelectedScene"
                >
                  {{ t("meta.list.properties.enterScene") }}
                </el-button>
              </div>
            </template>
          </div>
        </template>
      </DetailPanel>
    </div>

    <!-- Selection Method Dialog -->
    <el-dialog
      v-model="imageSelectDialogVisible"
      :title="$t('meta.metaEdit.selectImageMethod')"
      width="500px"
      align-center
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="selection-container">
        <div class="selection-card" @click="openResourceDialog">
          <div class="card-icon">
            <el-icon :size="32">
              <FolderOpened></FolderOpened>
            </el-icon>
          </div>
          <div class="card-title">
            {{ $t("meta.metaEdit.selectFromResource") }}
          </div>
          <div class="card-description">
            {{ $t("imageSelector.selectFromResourceDesc") }}
          </div>
        </div>

        <div class="selection-card" @click="openLocalUpload">
          <div class="card-icon">
            <el-icon :size="32">
              <Upload></Upload>
            </el-icon>
          </div>
          <div class="card-title">{{ $t("meta.metaEdit.uploadLocal") }}</div>
          <div class="card-description">
            {{ $t("imageSelector.uploadLocalDesc") }}
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- Resource Dialog -->
    <ResourceDialog
      :multiple="false"
      @selected="onResourceSelected"
      ref="resourceDialogRef"
    ></ResourceDialog>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
// import { ElMessage, ElMessageBox } from "element-plus";
import { Message, MessageBox } from "@/components/Dialog";
import { v4 as uuidv4 } from "uuid";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  EmptyState,
  StandardCard,
  DetailPanel,
  ResourceScopeFilter,
} from "@/components/StandardPage";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import {
  getMetas,
  postMeta,
  deleteMeta,
  putMeta,
  getMeta,
  putMetaCode,
} from "@/api/v1/meta";
import { getVerses, getVerse, type VerseData } from "@/api/v1/verse";
import type { metaInfo } from "@/api/v1/meta";
import { usePageData } from "@/composables/usePageData";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { getPicture } from "@/api/v1/resources/index";
import type { UploadFileType } from "@/api/user/model";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import SignalInfoPanel from "@/components/Meta/SignalInfoPanel.vue";
import { FolderOpened, Upload } from "@element-plus/icons-vue";
import type { CardInfo } from "@/utils/types";
import {
  denseResourceBreakpoints,
  denseResourceCardGutter,
} from "@/utils/resourceGrid";
import { compareMultilingualText } from "@/utils/multilingualSort";
import { convertToLocalTime } from "@/utils/utilityFunctions";

const { t } = useI18n();
const router = useRouter();

type MetaListItem = {
  id: number;
  title: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  author?: {
    nickname?: string;
    username?: string;
  };
  image?: {
    url?: string;
  } | null;
  resource_count?: number;
  resources_count?: number;
  resources?: unknown[];
};

const {
  items,
  loading,
  pagination,
  viewMode,
  totalPages,
  refresh,
  handleSearch,
  handleSortChange,
  handlePageChange,
  handleViewChange,
} = usePageData<MetaListItem>({
  fetchFn: async (params) => {
    const response = await getMetas(
      params.sort,
      params.search,
      params.page,
      "image,author",
      "id,title,name,created_at,updated_at,image,author,resource_count,resources_count",
      Number(params.pageSize) || 24
    );
    return response;
  },
  pageSize: 24,
});

type SceneOption = {
  id: number;
  name: string;
};

const selectedSceneId = ref<number | null>(null);
const scenes = ref<SceneOption[]>([]);
const loadingScenes = ref(false);
const loadingSceneDetail = ref(false);
const scopedMetas = ref<MetaListItem[]>([]);
const scopedSearch = ref("");
const scopedSort = ref("-created_at");
const scopedPage = ref(1);

const isSceneFilterActive = computed(() => selectedSceneId.value !== null);

const normalizeText = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const parseTimeValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const text = value.trim();
  if (!text) return 0;
  const direct = Date.parse(text);
  if (!Number.isNaN(direct)) return direct;
  const normalized = text.replace(/-/g, "/");
  const fallback = Date.parse(normalized);
  return Number.isNaN(fallback) ? 0 : fallback;
};

const getMetaDisplayName = (item: MetaListItem) =>
  String(item.title || item.name || "");

const getMetaSortTime = (item: MetaListItem, field: string) => {
  if (field === "created_at") {
    return (
      parseTimeValue(item.created_at) ||
      parseTimeValue(item.updated_at) ||
      parseTimeValue((item as Record<string, unknown>).createdAt) ||
      parseTimeValue((item as Record<string, unknown>).updatedAt)
    );
  }
  if (field === "updated_at") {
    return (
      parseTimeValue(item.updated_at) ||
      parseTimeValue(item.created_at) ||
      parseTimeValue((item as Record<string, unknown>).updatedAt) ||
      parseTimeValue((item as Record<string, unknown>).createdAt)
    );
  }
  return parseTimeValue((item as Record<string, unknown>)[field]);
};

const sortScopedMetas = (list: MetaListItem[], sortValue: string) => {
  const descending = sortValue.startsWith("-");
  const field = descending ? sortValue.slice(1) : sortValue;

  if (field === "name" || field === "title") {
    return [...list].sort((a, b) => {
      const compared = compareMultilingualText(
        getMetaDisplayName(a),
        getMetaDisplayName(b)
      );
      if (compared !== 0) return descending ? -compared : compared;
      return descending ? b.id - a.id : a.id - b.id;
    });
  }

  return [...list].sort((a, b) => {
    const aVal = getMetaSortTime(a, field);
    const bVal = getMetaSortTime(b, field);
    if (aVal === bVal) {
      return descending ? b.id - a.id : a.id - b.id;
    }
    return descending ? bVal - aVal : aVal - bVal;
  });
};

const searchedScopedMetas = computed(() => {
  const keyword = normalizeText(scopedSearch.value);
  if (!keyword) return scopedMetas.value;
  const result: MetaListItem[] = [];
  for (const item of scopedMetas.value) {
    const label = String(item.title || item.name || "");
    if (normalizeText(label).includes(keyword)) {
      result.push(item);
    }
  }
  return result;
});

const sortedScopedMetas = computed(() =>
  sortScopedMetas(searchedScopedMetas.value, scopedSort.value)
);

const scopedTotalPages = computed(() =>
  Math.max(1, Math.ceil(sortedScopedMetas.value.length / 24))
);

const pagedScopedMetas = computed(() => {
  const start = (scopedPage.value - 1) * 24;
  return sortedScopedMetas.value.slice(start, start + 24);
});

const displayItems = computed<MetaListItem[] | null>(() =>
  isSceneFilterActive.value ? pagedScopedMetas.value : items.value
);

const displayCurrentPage = computed(() =>
  isSceneFilterActive.value ? scopedPage.value : pagination.current
);

const displayTotalPages = computed(() =>
  isSceneFilterActive.value ? scopedTotalPages.value : totalPages.value
);

watch(scopedTotalPages, (count) => {
  if (scopedPage.value > count) {
    scopedPage.value = count;
  }
});

const resetScopedState = () => {
  scopedSearch.value = "";
  scopedSort.value = "-created_at";
  scopedPage.value = 1;
};

const dedupeMetas = (metas: MetaListItem[]) => {
  const map = new Map<number, MetaListItem>();
  metas.forEach((meta) => {
    const id = meta.id;
    if (typeof id === "number") {
      map.set(id, meta);
    }
  });
  return Array.from(map.values());
};

const toSceneName = (scene: VerseData) =>
  String(scene.name || `Scene-${scene.id}`).trim();

const loadScenes = async () => {
  loadingScenes.value = true;
  try {
    const allScenes: VerseData[] = [];
    let page = 1;
    let pageCount = 1;

    do {
      const response = await getVerses({
        sort: "-updated_at",
        page,
        perPage: 100,
      });
      allScenes.push(...response.data);
      pageCount = parseInt(
        String(response.headers["x-pagination-page-count"] || "1")
      );
      page += 1;
    } while (page <= pageCount);

    scenes.value = allScenes.map((scene) => ({
      id: scene.id,
      name: toSceneName(scene),
    }));
  } finally {
    loadingScenes.value = false;
  }
};

const handleSceneChange = async (sceneId: number | null) => {
  selectedSceneId.value = sceneId;
  resetScopedState();

  if (sceneId == null) {
    scopedMetas.value = [];
    handleSearch("");
    return;
  }

  loadingSceneDetail.value = true;
  try {
    const response = await getVerse(sceneId, "metas");
    const verseMetas = Array.isArray(response.data?.metas)
      ? (response.data.metas as unknown as MetaListItem[])
      : [];
    scopedMetas.value = dedupeMetas(verseMetas);
  } finally {
    loadingSceneDetail.value = false;
  }
};

const handleSearchWithScope = (value: string) => {
  if (isSceneFilterActive.value) {
    scopedSearch.value = value;
    scopedPage.value = 1;
    return;
  }
  handleSearch(value);
};

const handleSortChangeWithScope = (value: string) => {
  if (isSceneFilterActive.value) {
    scopedSort.value = value;
    scopedPage.value = 1;
    return;
  }
  handleSortChange(value);
};

const handlePageChangeWithScope = (page: number) => {
  if (isSceneFilterActive.value) {
    scopedPage.value = page;
    return;
  }
  handlePageChange(page);
};

onMounted(async () => {
  await loadScenes();
});

const detailVisible = ref(false);
const detailLoading = ref(false);
const currentMeta = ref<metaInfo | null>(null);

// Image selection state
const imageSelectDialogVisible = ref(false);
const resourceDialogRef = ref<InstanceType<typeof ResourceDialog> | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const fileStore = useFileStore();

const triggerFileSelect = () => {
  imageSelectDialogVisible.value = true;
};

const openLocalUpload = () => {
  imageSelectDialogVisible.value = false;
  fileInput.value?.click();
};

const openResourceDialog = () => {
  imageSelectDialogVisible.value = false;
  resourceDialogRef.value?.openIt({ type: "picture" });
};

const onResourceSelected = async (data: CardInfo) => {
  const context =
    typeof data.context === "object" && data.context !== null
      ? (data.context as { image_id?: number })
      : undefined;
  const imageId = context?.image_id || data.image?.id || data.id;
  if (imageId && currentMeta.value) {
    detailLoading.value = true;
    try {
      let finalImageId = imageId;
      if (data.type === "picture") {
        const response = await getPicture(data.id);
        finalImageId = response.data.image_id || response.data.file?.id;
      }
      await putMeta(String(currentMeta.value.id), { image_id: finalImageId });
      Message.success(t("meta.metaEdit.image.updateSuccess"));
      // Refresh details
      const response = await getMeta(currentMeta.value.id, {
        expand: "image,author",
      });
      currentMeta.value = response.data;
      refresh();
    } catch (error) {
      logger.error("Failed to update meta image:", error);
      Message.error(t("meta.metaEdit.image.updateError"));
    } finally {
      detailLoading.value = false;
    }
  }
};

const handleCoverUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    Message.error(t("meta.list.selectImageFile"));
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    Message.error(t("meta.list.imageTooLarge"));
    return;
  }

  detailLoading.value = true;
  try {
    const md5 = await fileStore.store.fileMD5(file);
    const extension = file.name.substring(file.name.lastIndexOf("."));
    const handler = await fileStore.store.publicHandler();
    const dir = "picture";
    const has = await fileStore.store.fileHas(md5, extension, handler, dir);

    if (!has) {
      await new Promise<void>((resolve, reject) => {
        fileStore.store
          .fileUpload(md5, extension, file, (_p: number) => {}, handler, dir)
          .then(() => resolve())
          .catch(reject);
      });
    }

    const fileData: UploadFileType = {
      filename: file.name,
      md5,
      key: md5 + extension,
      url: fileStore.store.fileUrl(md5, extension, handler, dir),
    };
    const response = await postFile(fileData);
    const imageId = response.data.id;

    if (currentMeta.value) {
      await putMeta(String(currentMeta.value.id), { image_id: imageId });
      Message.success(t("meta.metaEdit.image.updateSuccess"));
      const res = await getMeta(currentMeta.value.id, {
        expand: "image,author",
      });
      currentMeta.value = res.data;
      refresh();
    }
  } catch (error) {
    logger.error("Upload failed", error);
    Message.error(t("meta.metaEdit.image.updateError"));
  } finally {
    detailLoading.value = false;
    target.value = "";
  }
};

const detailProperties = computed(() => {
  if (!currentMeta.value) return [];
  return [
    {
      label: t("meta.list.properties.type"),
      value: t("meta.list.properties.entity"),
    },
    {
      label: t("meta.list.properties.author"),
      value:
        currentMeta.value.author?.nickname ||
        currentMeta.value.author?.username ||
        "—",
    },
    {
      label: t("meta.list.properties.resources"),
      value: getResourceCount(currentMeta.value),
    },
    {
      label: t("meta.list.properties.scenes"),
      value:
        usedSceneOptions.value.length > 0
          ? usedSceneOptions.value[0].name
          : t("meta.list.properties.noScenes"),
      slotName: "used-scenes",
    },
    {
      label: t("ui.createdAt"),
      value: currentMeta.value.created_at
        ? convertToLocalTime(currentMeta.value.created_at)
        : "-",
    },
  ];
});

const getResourceCount = (item?: {
  resources?: unknown;
  resource_count?: number;
  resources_count?: number;
}) => {
  if (typeof item?.resource_count === "number") {
    return item.resource_count;
  }
  if (typeof item?.resources_count === "number") {
    return item.resources_count;
  }
  return Array.isArray(item?.resources) ? item.resources.length : 0;
};

const selectedUsedSceneId = ref<number | null>(null);
const selectedUsedSceneModel = computed<number | undefined>({
  get: () => selectedUsedSceneId.value ?? undefined,
  set: (value) => {
    selectedUsedSceneId.value = value ?? null;
  },
});
const usedScenesControlsRef = ref<HTMLElement | null>(null);

type MetaVerseRelation = {
  verse_id?: number | null;
};

type MetaSceneUsageSource = {
  verseMetas?: MetaVerseRelation[] | null;
} | null;

const getUsedSceneOptions = (item?: MetaSceneUsageSource) => {
  const verseMetas = Array.isArray(item?.verseMetas) ? item.verseMetas : [];
  if (verseMetas.length === 0) return [] as SceneOption[];

  const sceneNameMap = new Map<number, string>();
  scenes.value.forEach((scene) => {
    sceneNameMap.set(scene.id, scene.name);
  });

  const usedSceneOptions: SceneOption[] = [];
  const seenSceneIds = new Set<number>();

  verseMetas.forEach((relation) => {
    const verseId = relation?.verse_id;
    if (typeof verseId !== "number" || seenSceneIds.has(verseId)) return;
    seenSceneIds.add(verseId);
    usedSceneOptions.push({
      id: verseId,
      name:
        sceneNameMap.get(verseId) ||
        `${t("meta.list.properties.sceneFallback")}${verseId}`,
    });
  });

  return usedSceneOptions;
};

const usedSceneOptions = computed<SceneOption[]>(() =>
  getUsedSceneOptions(currentMeta.value as MetaSceneUsageSource)
);

watch(
  () => usedSceneOptions.value,
  (options) => {
    const hasCurrentSelection =
      selectedUsedSceneId.value !== null &&
      options.some((scene) => scene.id === selectedUsedSceneId.value);
    selectedUsedSceneId.value = hasCurrentSelection
      ? selectedUsedSceneId.value
      : (options[0]?.id ?? null);
  },
  { immediate: true }
);

type MetaEventItem = { title: string; name: string; type: string };

const normalizeEventList = (value: unknown): MetaEventItem[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const title = String(record.title ?? record.name ?? `#${index + 1}`);
    const name = String(record.name ?? "");
    const rawType = record.type;
    return {
      title,
      name,
      type: rawType === null || rawType === undefined ? "" : String(rawType),
    };
  });
};

const eventInputs = computed(() =>
  normalizeEventList(currentMeta.value?.events?.inputs)
);
const eventOutputs = computed(() =>
  normalizeEventList(currentMeta.value?.events?.outputs)
);

const openDetail = async (item: { id: number }) => {
  detailVisible.value = true;
  detailLoading.value = true;

  try {
    const response = await getMeta(item.id, {
      expand: "image,author,resources,verseMetas",
    });
    currentMeta.value = response.data;
  } catch (err) {
    Message.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handlePanelClose = () => {
  currentMeta.value = null;
};

const goToEditor = (item: { id: number; title?: string; name?: string }) => {
  const title = encodeURIComponent(
    t("meta.list.editorTitle", {
      name: item.title || t("meta.list.unnamed"),
    })
  );
  router.push({ path: "/meta/scene", query: { id: item.id, title } });
};

const goToSceneEditor = (sceneId: number, sceneName?: string) => {
  const title = encodeURIComponent(
    t("verse.listPage.editorTitle", {
      name: sceneName || t("verse.listPage.unnamed"),
    })
  );
  router.push({ path: "/verse/scene", query: { id: sceneId, title } });
};

const handleGoToEditor = () => {
  if (currentMeta.value) {
    goToEditor(currentMeta.value);
  }
};

const handleEnterSelectedScene = () => {
  if (selectedUsedSceneId.value === null) return;
  const selectedScene = usedSceneOptions.value.find(
    (scene) => scene.id === selectedUsedSceneId.value
  );
  goToSceneEditor(selectedUsedSceneId.value, selectedScene?.name);
};

const updateUsedScenesDropdownWidth = () => {
  if (typeof document === "undefined") return;
  const controlsWidth = usedScenesControlsRef.value?.offsetWidth;
  if (!controlsWidth) return;
  document.documentElement.style.setProperty(
    "--detail-link-select-scene-width",
    `${controlsWidth}px`
  );
};

const handleUsedScenesDropdownVisible = (visible: boolean) => {
  if (!visible) return;
  updateUsedScenesDropdownWidth();
};

const handleCopy = async () => {
  if (!currentMeta.value) return;
  try {
    const { value } = (await MessageBox.prompt(
      t("meta.prompt.message1"),
      t("meta.prompt.message2"),
      {
        confirmButtonText: t("meta.prompt.confirm"),
        cancelButtonText: t("meta.prompt.cancel"),
        defaultValue: `${currentMeta.value.title}${t("meta.list.copySuffix")}`,
      }
    )) as { value: string };
    await copy(currentMeta.value.id, value);
    Message.success(t("meta.prompt.success") + value);
  } catch {
    Message.info(t("meta.prompt.info"));
  }
};

const copy = async (id: number, newTitle: string) => {
  try {
    const response = await getMeta(id, { expand: "image,author,metaCode" });
    const meta = response.data;
    const newMeta = {
      title: newTitle,
      uuid: uuidv4(),
      image_id: meta.image_id,
      data: meta.data,
      info: meta.info,
      events: meta.events,
      prefab: meta.prefab,
    };
    const createResponse = await postMeta(newMeta);
    const newMetaId = createResponse.data.id;
    if (meta.metaCode) await putMetaCode(newMetaId, meta.metaCode);
    refresh();
  } catch (error) {
    logger.error("Copy error:", error);
    Message.error(t("meta.copyError"));
  }
};

const handleRename = async (newName: string) => {
  if (!currentMeta.value) return;
  try {
    await putMeta(String(currentMeta.value.id), { title: newName });
    currentMeta.value.title = newName;
    refresh();
    Message.success(t("meta.prompt.success") + newName);
  } catch (err) {
    Message.error(String(err));
  }
};

const handleDelete = async () => {
  if (!currentMeta.value) return;
  try {
    await MessageBox.confirm(
      t("meta.confirm.message1"),
      t("meta.confirm.message2"),
      {
        confirmButtonText: t("meta.confirm.confirm"),
        cancelButtonText: t("meta.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteMeta(String(currentMeta.value.id));
    detailVisible.value = false;
    refresh();
    Message.success(t("meta.confirm.success"));
  } catch {
    Message.info(t("meta.confirm.info"));
  }
};

const generateDefaultName = (prefix: string) => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  return `${prefix}_${dateStr}_${timeStr}`;
};

const addMeta = async () => {
  try {
    const { value } = (await MessageBox.prompt(
      t("meta.create.namePlaceholder"),
      t("meta.create.title"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        defaultValue: generateDefaultName(t("meta.create.defaultName")),
        inputValidator: (val) =>
          !val || !val.trim() ? t("meta.create.nameRequired") : true,
      }
    )) as { value: string };
    await postMeta({ title: value.trim(), uuid: uuidv4() });
    refresh();
    Message.success(t("meta.create.success"));
  } catch {
    /* User cancelled */
  }
};

const copyWindow = async (item: { id: number; title?: string }) => {
  try {
    const { value } = (await MessageBox.prompt(
      t("meta.prompt.message1"),
      t("meta.prompt.message2"),
      {
        confirmButtonText: t("meta.prompt.confirm"),
        cancelButtonText: t("meta.prompt.cancel"),
        defaultValue: `${item.title}${t("meta.list.copySuffix")}`,
      }
    )) as { value: string };
    await copy(item.id, value);
    Message.success(t("meta.prompt.success") + value);
  } catch {
    Message.info(t("meta.prompt.info"));
  }
};

const namedWindow = async (item: { id: number; title?: string }) => {
  try {
    const { value } = (await MessageBox.prompt(
      t("meta.prompt.message1"),
      t("meta.prompt.message2"),
      {
        confirmButtonText: t("meta.prompt.confirm"),
        cancelButtonText: t("meta.prompt.cancel"),
        defaultValue: item.title,
      }
    )) as { value: string };
    await putMeta(String(item.id), { title: value });
    refresh();
    Message.success(t("meta.prompt.success") + value);
  } catch {
    Message.info(t("meta.prompt.info"));
  }
};

const deletedWindow = async (
  item: { id: number },
  resetLoading: () => void
) => {
  try {
    await MessageBox.confirm(
      t("meta.confirm.message1"),
      t("meta.confirm.message2"),
      {
        confirmButtonText: t("meta.confirm.confirm"),
        cancelButtonText: t("meta.confirm.cancel"),
        type: "warning",
      }
    );
    await deleteMeta(String(item.id));
    refresh();
    Message.success(t("meta.confirm.success"));
  } catch {
    Message.info(t("meta.confirm.info"));
    resetLoading();
  }
};
</script>

<style scoped lang="scss">
.meta-list {
  padding: 12px;
}

.col-name {
  display: flex;
  flex: 1;
  gap: 16px;
  align-items: center;
  min-width: 0;
}

.col-size,
.col-author {
  flex-shrink: 0;
  width: 100px;
  padding-right: 24px;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  text-align: right;
}

.col-resources {
  flex-shrink: 0;
  width: 90px;
  padding-right: 24px;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  text-align: right;
}

.col-actions {
  flex-shrink: 0;
  width: 48px;
  text-align: center;
}

.item-thumb {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  overflow: hidden;
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-sm, 12px);
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  color: var(--text-muted, #94a3b8);
}

.thumb-placeholder .svg-inline--fa {
  font-size: 24px;
}

.item-name {
  overflow: hidden;
  font-size: var(--font-size-md, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1e293b);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-icon {
  padding: 6px;
  font-size: 22px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  border-radius: var(--radius-sm, 12px);
  opacity: 0.6;
  transition: all var(--transition-fast, 0.15s ease);
}

.actions-icon:hover {
  color: var(--text-primary, #1e293b);
  background: var(--bg-active, #e2e8f0);
  opacity: 1;
}

.meta-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: var(--radius-lg, 16px);
    transition: filter 0.3s;
  }

  .upload-overlay {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: white;
    background: rgb(0 0 0 / 40%);
    border-radius: var(--radius-lg, 16px);
    opacity: 0;
    transition: opacity 0.3s;

    .svg-inline--fa {
      margin-bottom: 8px;
      font-size: 48px;
    }

    .overlay-text {
      font-size: 14px;
      font-weight: 500;
    }
  }

  &:hover {
    .upload-overlay {
      opacity: 1;
    }

    img {
      filter: blur(2px);
    }
  }
}

.hidden-input {
  display: none;
}

.events-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.events-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.events-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.events-card {
  min-height: 88px;
  padding: 10px;
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 12px);
}

.events-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
}

.events-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  color: var(--primary-color, #03a9f4);
  background: var(--primary-light, rgb(3 169 244 / 12%));
  border-radius: 9px;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.events-item {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 8px;
  font-size: 12px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
}

.events-index {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  background: var(--bg-hover, #f1f5f9);
  border-radius: 999px;
}

.events-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.events-title-text {
  overflow: hidden;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.events-name-sub {
  overflow: hidden;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.events-type {
  flex-shrink: 0;
  padding: 2px 8px;
  color: var(--text-secondary, #64748b);
  background: var(--bg-hover, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 999px;
}

.events-empty {
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}

.used-scenes-value {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.used-scenes-controls {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.used-scenes-select {
  flex: 1;
  min-width: 120px;

  :deep(.el-select__wrapper) {
    align-items: center;
    min-height: 24px;
  }

  :deep(.el-select__selection) {
    align-items: center;
    min-width: 0;
  }

  :deep(.el-select__selected-item),
  :deep(.el-select__placeholder) {
    width: 100%;
    overflow: hidden;
    line-height: 20px;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.used-scenes-enter-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  line-height: 1;
  border-radius: 12px;
}

:global(.detail-link-select-popper .el-select-dropdown__item) {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  text-align: left;
}

:global(.detail-link-select-popper-scene.el-select__popper) {
  width: var(--detail-link-select-scene-width) !important;
  min-width: var(--detail-link-select-scene-width) !important;
  padding: 0 !important;
}

:global(
  .detail-link-select-popper-scene.el-select__popper .el-select-dropdown
) {
  width: 100% !important;
  min-width: 100% !important;
}

:global(
  .detail-link-select-popper.el-select__popper .el-select-dropdown__item.hover,
  .detail-link-select-popper.el-select__popper .el-select-dropdown__item:hover,
  .detail-link-select-popper.el-select__popper
    .el-select-dropdown__item.is-hovering
) {
  color: var(--primary-color, #03a9f4) !important;
  background: var(--primary-light, rgb(3 169 244 / 12%)) !important;
}

:global(
  .detail-link-select-popper.el-select__popper
    .el-select-dropdown__item.selected:not(.hover, .is-hovering, :hover),
  .detail-link-select-popper.el-select__popper
    .el-select-dropdown__item.is-selected:not(.hover, .is-hovering, :hover)
) {
  font-weight: 500 !important;
  color: var(--primary-color, #03a9f4) !important;
  background: transparent !important;
}

.selection-container {
  display: flex;
  gap: 15px;
  padding: 5px;
}

.selection-card {
  flex: 1;
  padding: 20px 15px;
  text-align: center;
  cursor: pointer;
  background: var(--bg-card, #fff);
  border: 2px solid var(--border-color, #e4e7ed);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--bg-hover, #f8fafc);
    border-color: var(--primary-color, #0ea5e9);
    box-shadow: 0 8px 16px rgb(14 165 233 / 20%); // Keep specific shadow color or use var if available
    transform: translateY(-5px);

    .card-icon {
      color: var(--primary-color, #0ea5e9);
      transform: scale(1.1);
    }
  }
}

.card-icon {
  margin-bottom: 15px;
  color: var(--primary-color, #409eff);
  transition: transform 0.3s ease;
}

.card-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #303133);
}

.card-description {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary, #909399);
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #94a3b8);

  .svg-inline--fa {
    font-size: 64px;
  }
}

.list-view {
  :deep(.single-card-actions) {
    display: flex;
    background: var(--resource-card-action-surface-bg, var(--bg-card, #fff));
    border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  }

  :deep(.single-card-action-btn) {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 44px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary, #64748b);
    cursor: pointer;
    background: var(--resource-card-action-btn-bg, var(--bg-hover, #f8fafc));
    border: 1px solid
      var(--resource-card-action-btn-border, var(--border-color, #e2e8f0));
    transition: all 0.2s ease;
  }

  :deep(.single-card-action-btn:hover) {
    color: var(--primary-color, #03a9f4);
    background: var(
      --resource-card-action-btn-hover-bg,
      var(--bg-active, #e2e8f0)
    );
  }

  :deep(.standard-card .card-content) {
    gap: 4px;
    padding: 10px 14px;
  }

  :deep(.col-checkbox) {
    width: 40px;
  }

  .col-name {
    gap: 12px;
  }

  .col-author {
    flex-shrink: 0;
    width: 120px;
    padding-right: 24px;
    overflow: hidden;
    font-size: var(--font-size-sm, 13px);
    color: var(--text-secondary, #64748b);
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-hover-action {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 84px;
    height: 28px;
    padding: 0;
    margin-left: 8px;
    font-size: 12px;
    font-weight: 500;
    color: white;
    visibility: hidden;
    background: var(--primary-color, #03a9f4);
    border: none;
    border-radius: 14px;
    box-shadow: 0 4px 12px rgb(3 169 244 / 30%);
    opacity: 0;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: var(--primary-hover, #039be5);
      box-shadow: 0 6px 16px rgb(3 169 244 / 40%);
      transform: scale(1.05);
    }
  }

  :deep(.list-row:hover) {
    .btn-hover-action {
      visibility: visible;
      opacity: 1;
    }
  }
}

.enter-edit-btn {
  display: inline-flex !important;
  gap: 8px !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100%;
  height: 52px !important;
  min-height: 52px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  border-radius: var(
    --standard-page-max-radius,
    calc(var(--radius-lg, 24px) / 3)
  ) !important;
}
</style>
