<template>
  <TransitionWrapper>
    <div v-if="!isAllScenes || isRoot" class="verse-index">
      <PageActionBar
        :title="
          t(
            isAllScenes ? 'verse.listPage.allScenes' : 'verse.listPage.myScenes'
          )
        "
        :show-title="false"
        :search-placeholder="t('verse.listPage.searchScenes')"
        :show-tags="true"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
      >
        <template #filters>
          <el-input
            v-if="isAllScenes && isRoot"
            v-model="authorSearchInput"
            class="scene-author-filter"
            :placeholder="t('verse.listPage.searchAuthors')"
            v-bind="{ 'aria-label': t('verse.listPage.searchAuthors') }"
            :maxlength="255"
            clearable
            @keyup.enter="applyAuthorSearch"
            @clear="applyAuthorSearch"
          ></el-input>
          <div v-if="isAllScenes && isRoot" class="scene-property-filter">
            <el-select
              v-model="globalPropertyId"
              class="scene-property-filter__select"
              filterable
              clearable
              :loading="globalPropertiesLoading"
              :placeholder="t('verse.listPage.globalPropertyFilter')"
              v-bind="{
                'aria-label': t('verse.listPage.globalPropertyFilter'),
              }"
            >
              <el-option
                v-for="property in globalProperties"
                :key="property.id"
                :value="property.id"
                :label="property.key"
              ></el-option>
            </el-select>
            <el-button
              v-if="globalPropertiesError"
              @click="loadGlobalProperties"
              >{{ t("verse.listPage.retryPropertyOptions") }}</el-button
            >
          </div>
          <TagsSelect
            v-if="canViewSceneFilter"
            @tags-change="handleTagsChange"
          ></TagsSelect>
        </template>
        <template #actions>
          <el-button v-if="!isAllScenes" type="primary" @click="createWindow">
            <font-awesome-icon
              :icon="['fas', 'plus']"
              style="margin-right: 4px; font-size: 18px"
            ></font-awesome-icon>
            {{ t("verse.listPage.createScene") }}
          </el-button>
          <el-button v-if="!isAllScenes" @click="openImportDialog">
            <font-awesome-icon
              :icon="['fas', 'upload']"
              style="margin-right: 4px; font-size: 18px"
            ></font-awesome-icon>
            {{ t("ui.importScene") }}
          </el-button>
        </template>
      </PageActionBar>
      <p
        v-if="isAllScenes && isRoot && globalPropertiesError"
        class="scene-property-filter__error"
        role="alert"
      >
        {{ globalPropertiesError }}
      </p>

      <ViewContainer
        class="list-view"
        :items="items"
        :view-mode="viewMode"
        :loading="loading"
        :card-gutter="denseResourceCardGutter"
        :long-press-enabled="canEditScene"
        @row-click="openDetail"
        @row-long-press="goToEditor"
      >
        <template #grid-card="{ item }">
          <StandardCard
            v-long-press="
              canEditScene(item) ? () => goToEditor(item) : undefined
            "
            :image="item.image?.url"
            :title="item.name || t('verse.listPage.unnamed')"
            :description="item.description"
            :meta="
              isAllScenes
                ? {
                    author: item.author?.nickname || item.author?.username,
                    date: formatItemDate(item.created_at),
                  }
                : undefined
            "
            :type-icon="['fas', 'layer-group']"
            :placeholder-icon="['fas', 'layer-group']"
            :show-checkbox="false"
            @view="openDetail(item)"
          >
            <template #title>
              <SceneTitle
                :name="item.name || t('verse.listPage.unnamed')"
              ></SceneTitle>
            </template>
          </StandardCard>
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">{{ t("verse.listPage.sceneName") }}</div>
          <div class="col-author">{{ t("verse.listPage.author") }}</div>
          <div class="col-date">{{ t("verse.listPage.modifiedDate") }}</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.image?.url"
                :src="item.image.url"
                :alt="item.name"
              />
              <div v-else class="thumb-placeholder">
                <font-awesome-icon
                  :icon="['fas', 'layer-group']"
                ></font-awesome-icon>
              </div>
            </div>
            <span class="item-name">
              <SceneTitle :name="item.name || '—'"></SceneTitle>
            </span>
          </div>
          <div class="col-author">
            {{ item.author?.nickname || item.author?.username || "—" }}
          </div>
          <div class="col-date">{{ formatItemDate(item.created_at) }}</div>
          <div class="col-actions" @click.stop>
            <el-dropdown trigger="click">
              <font-awesome-icon
                :icon="['fas', 'ellipsis']"
                class="actions-icon"
              ></font-awesome-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openDetail(item)">{{
                    t("verse.listPage.viewDetail")
                  }}</el-dropdown-item>
                  <el-dropdown-item
                    v-if="canEditScene(item)"
                    @click="namedWindow(item)"
                    >{{ t("verse.listPage.rename") }}</el-dropdown-item
                  >
                  <el-dropdown-item
                    v-if="canEditScene(item)"
                    @click="deletedWindow(item)"
                    >{{ t("verse.listPage.delete") }}</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :icon="['fas', 'layer-group']"
            :text="t('verse.listPage.emptyText')"
            :action-text="
              isAllScenes ? undefined : t('verse.listPage.createScene')
            "
            @action="createWindow"
          ></EmptyState>
        </template>
      </ViewContainer>

      <PagePagination
        :current-page="pagination.current"
        :total-pages="totalPages"
        :sticky="true"
        @page-change="handlePageChange"
      >
      </PagePagination>

      <!-- Create Dialog -->
      <create
        ref="createdDialog"
        :dialog-title="$t('verse.page.dialogTitle')"
        :dialog-submit="$t('verse.page.dialogSubmit')"
        @submit="submitCreate"
      ></create>

      <!-- Detail Panel -->
      <DetailPanel
        v-model="detailVisible"
        :close-on-escape="!propertyDialogOpen"
        :title="t('verse.listPage.detailTitle')"
        :name="currentVerse?.name || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'image']"
        width="560px"
        :show-delete="canEditCurrentScene"
        :editable="canEditCurrentMetadata"
        action-layout="grid"
        :download-text="t('ui.exportScene')"
        :download-icon="['fas', 'download']"
        :delete-text="t('verse.listPage.deleteScene')"
        @download="handleExport"
        @rename="handleRename"
        @delete="handleDelete"
        @close="handlePanelClose"
      >
        <template #name>
          <SceneTitle :name="currentVerse?.name || ''"></SceneTitle>
        </template>
        <template #actions>
          <div class="scene-detail-actions">
            <template v-if="canEditCurrentScene">
              <button
                class="btn-pill-primary enter-edit-btn"
                @click="handleGoToEditor"
              >
                <font-awesome-icon
                  :icon="['fas', 'pen-to-square']"
                ></font-awesome-icon>
                {{ t("route.project.sceneEditor") }}
              </button>
              <div class="actions-row">
                <button class="btn-pill-secondary" @click="handleExport">
                  <font-awesome-icon
                    :icon="['fas', 'download']"
                  ></font-awesome-icon>
                  {{ t("ui.exportScene") }}
                </button>
                <button class="btn-pill-danger" @click="handleDelete">
                  <font-awesome-icon
                    :icon="['fas', 'trash-can']"
                  ></font-awesome-icon>
                  {{ t("verse.listPage.deleteScene") }}
                </button>
              </div>
            </template>
          </div>
        </template>
        <template #preview>
          <div class="verse-preview" @click="triggerFileSelect">
            <img
              v-if="currentVerse?.image?.url"
              :src="currentVerse.image.url"
              :alt="currentVerse.name"
            />
            <div v-else class="preview-placeholder">
              <font-awesome-icon :icon="['fas', 'image']"></font-awesome-icon>
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
          <div class="verse-detail-info">
            <!-- DescriptionSection -->
            <div class="info-section">
              <div class="section-header">
                {{ t("verse.listPage.sceneIntro") }}
              </div>
              <el-input
                v-model="editingDescription"
                :readonly="!canEditCurrentMetadata"
                type="textarea"
                :rows="4"
                :placeholder="t('verse.listPage.sceneIntroPlaceholder')"
                @blur="handleDescriptionBlur"
              ></el-input>
            </div>

            <!-- Tags Section (Restricted) -->
            <div
              v-if="canManage && canEditCurrentMetadata"
              class="info-section"
            >
              <div class="section-header">
                {{ t("verse.listPage.sceneTags") }}
              </div>
              <div v-if="currentVerse?.tags?.length" class="tag-list">
                <el-tag
                  v-for="tag in currentVerse.tags"
                  :key="tag.id"
                  closable
                  class="mr-2 mb-2"
                  @close="handleRemoveTag(tag.id)"
                >
                  {{ tag.name }}
                </el-tag>
              </div>
              <div v-else class="empty-tags">
                {{ t("verse.listPage.noTags") }}
              </div>
              <el-select
                v-model="selectedTag"
                :placeholder="t('verse.listPage.addTag')"
                filterable
                class="tag-select"
                @change="handleAddTag"
              >
                <el-option
                  v-for="tag in allTags"
                  :key="tag.value"
                  :label="tag.label"
                  :value="tag.value"
                  :disabled="isTagSelected(tag.value)"
                ></el-option>
              </el-select>
            </div>

            <ScenePropertiesDialog
              v-if="canManageProperties && currentVerse"
              :key="currentVerse.id"
              :scene-id="currentVerse.id"
              :scene-name="currentVerse.name"
              @open-change="propertyDialogOpen = $event"
              @added="handleScenePropertyAdded"
              @removed="handleScenePropertyRemoved"
              @globally-deleted="handleScenePropertyGloballyDeleted"
            ></ScenePropertiesDialog>
          </div>
        </template>
        <template #property-loaded-entities>
          <div class="loaded-entities-value">
            <template
              v-if="!canEditCurrentScene && loadedEntityOptions.length"
              >{{
                loadedEntityOptions.map((entity) => entity.name).join(", ")
              }}</template
            >
            <template v-else-if="loadedEntityOptions.length === 0">
              {{ t("verse.listPage.noLoadedEntities") }}
            </template>
            <template v-else>
              <div
                ref="loadedEntitiesControlsRef"
                class="loaded-entities-controls"
              >
                <el-select
                  v-model="selectedLoadedEntityModel"
                  class="loaded-entities-select"
                  size="small"
                  popper-class="detail-link-select-popper detail-link-select-popper-entity"
                  @visible-change="handleLoadedEntitiesDropdownVisible"
                >
                  <el-option
                    v-for="entity in loadedEntityOptions"
                    :key="entity.id"
                    :label="entity.name"
                    :value="entity.id"
                  ></el-option>
                </el-select>
                <el-button
                  type="primary"
                  class="loaded-entities-enter-btn"
                  size="small"
                  @click="handleEnterSelectedEntity"
                >
                  {{ t("verse.listPage.enterEntity") }}
                </el-button>
              </div>
            </template>
          </div>
        </template>
      </DetailPanel>
    </div>
    <el-empty v-else :description="t('errorPage.noPermission')"></el-empty>
  </TransitionWrapper>

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

  <!-- Import Dialog -->
  <ImportDialog
    v-model="importDialogVisible"
    @success="handleImportSuccess"
  ></ImportDialog>
</template>

<script setup lang="ts">
import SceneTitle from "@/components/SceneTitle.vue";
import { formatClonedSceneName } from "@/utils/sceneName";
import { vLongPress } from "@/directive/longPress";
import { FolderOpened, Upload } from "@element-plus/icons-vue";
import { logger } from "@/utils/logger";
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import { v4 as uuidv4 } from "uuid";
import {
  PageActionBar,
  ViewContainer,
  PagePagination,
  EmptyState,
  StandardCard,
  DetailPanel,
} from "@/components/StandardPage";
import TagsSelect from "@/components/TagsSelect.vue";
import Create from "@/components/MrPP/MrPPVerse/MrPPVerseWindowCreate.vue";
import ScenePropertiesDialog from "@/components/MrPP/MrPPVerse/ScenePropertiesDialog.vue";
import {
  getGlobalScenePropertyOptions,
  type SceneProperty,
} from "@/api/v1/scene-properties";
import ImportDialog from "@/components/ScenePackage/ImportDialog.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import {
  getVerses,
  getVerse,
  getAllVerses,
  getAllVerse,
  postVerse,
  putVerse,
  deleteVerse,
  addTag,
  removeTag,
} from "@/api/v1/verse";
import { exportScene } from "@/services/scene-package/export-service";
import { getPicture } from "@/api/v1/resources/index";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import type { UploadFileType } from "@/api/user/model";
import { getTags } from "@/api/v1/tags";
import type { PostVerseData, VerseData } from "@/api/v1/verse";
import type { CardInfo } from "@/utils/types";
import { usePageData } from "@/composables/usePageData";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import { useAbility } from "@casl/vue";
import { denseResourceCardGutter } from "@/utils/resourceGrid";

const { t } = useI18n();
const props = withDefaults(defineProps<{ scope?: "mine" | "all" }>(), {
  scope: "mine",
});
const isAllScenes = computed(() => props.scope === "all");
const router = useRouter();
const createdDialog = ref<InstanceType<typeof Create> | null>(null);
const ability = useAbility();
const isRoot = computed(() => ability.can("root", "all"));
const globalPropertyId = ref<number>();
const globalProperties = ref<SceneProperty[]>([]);
const globalPropertiesLoading = ref(false);
const globalPropertiesError = ref("");
const authorSearchInput = ref("");
const authorSearch = ref("");
let authorSearchTimer: ReturnType<typeof setTimeout> | undefined;
function applyAuthorSearch() {
  clearTimeout(authorSearchTimer);
  if (!isAllScenes.value || !isRoot.value) return;
  authorSearch.value = authorSearchInput.value.trim();
}
let globalCatalogVersion = 0;
let detailRequestVersion = 0;
const isGlobalScope = computed(() => isAllScenes.value && isRoot.value);
async function loadGlobalProperties() {
  if (!isAllScenes.value || !isRoot.value) return;
  const version = ++globalCatalogVersion;
  globalPropertiesLoading.value = true;
  globalPropertiesError.value = "";
  try {
    const { data } = await getGlobalScenePropertyOptions();
    if (version !== globalCatalogVersion || !isRoot.value) return;
    globalProperties.value = data;
    if (
      globalPropertyId.value &&
      !data.some((property) => property.id === globalPropertyId.value)
    )
      globalPropertyId.value = undefined;
  } catch {
    if (version === globalCatalogVersion && isRoot.value)
      globalPropertiesError.value = t("verse.listPage.propertyOptionsFailed");
  } finally {
    if (version === globalCatalogVersion) globalPropertiesLoading.value = false;
  }
}

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
  handleTagsChange,
} = usePageData({
  fetchFn: async (params) => {
    if (isAllScenes.value && !isRoot.value) return { data: [], headers: {} };
    const query = {
      sort: params.sort,
      search: params.search,
      page: params.page,
      perPage: Number(params.pageSize) || 24,
      tags: params.tags,
      expand: "image,author,public",
    };
    return isAllScenes.value
      ? getAllVerses({
          ...query,
          authorSearch: authorSearch.value || undefined,
          propertyId: globalPropertyId.value,
        })
      : getVerses(query);
  },
  pageSize: 24,
});

const detailVisible = ref(false);
const propertyDialogOpen = ref(false);
const detailLoading = ref(false);
const currentVerse = ref<VerseData | null>(null);
const canEditScene = (item: { editable?: boolean }) =>
  !isAllScenes.value || (isRoot.value && item.editable === true);
const canEditCurrentScene = computed(
  () => Boolean(currentVerse.value) && canEditScene(currentVerse.value!)
);
const canEditCurrentMetadata = computed(
  () =>
    Boolean(currentVerse.value) &&
    ((isAllScenes.value && isRoot.value) || canEditCurrentScene.value)
);
const metadataRequestIsCurrent = (sceneId: number, request: number) =>
  request === detailRequestVersion &&
  detailVisible.value &&
  currentVerse.value?.id === sceneId &&
  canEditCurrentMetadata.value;
const canManageProperties = computed(
  () => ability.can("admin", "all") || ability.can("root", "all")
);

const syncVerseVisibility = (verseId: number, isPublic: boolean) => {
  if (currentVerse.value?.id === verseId) {
    currentVerse.value = {
      ...currentVerse.value,
      public: isPublic,
    };
  }

  const item = (items.value ?? []).find((verse) => verse.id === verseId);
  if (item) {
    item.public = isPublic;
  }
};

const canManage = computed(() => {
  return (
    ability.can("manager", "all") ||
    ability.can("admin", "all") ||
    ability.can("root", "all")
  );
});

const canViewSceneFilter = computed(() => {
  return ability.can("admin", "all") || ability.can("root", "all");
});

const editingDescription = ref("");
const fileStore = useFileStore();
const allTags = ref<{ label: string; value: number }[]>([]);
const selectedTag = ref<number | undefined>(undefined);

// Image selection state
const imageSelectDialogVisible = ref(false);
const resourceDialogRef = ref<InstanceType<typeof ResourceDialog> | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
// Import dialog state
const importDialogVisible = ref(false);

const openImportDialog = () => {
  importDialogVisible.value = true;
};

const handleImportSuccess = (_verseId: number) => {
  importDialogVisible.value = false;
  refresh();
  Message.success(t("verse.listPage.importSuccess"));
};

const normalizeEntityName = (value: unknown) => String(value || "").trim();

type LoadedEntityOption = {
  id: number | string;
  name: string;
};

const selectedLoadedEntityId = ref<number | string | null>(null);
const selectedLoadedEntityModel = computed<number | string | undefined>({
  get: () => selectedLoadedEntityId.value ?? undefined,
  set: (value) => {
    selectedLoadedEntityId.value = value ?? null;
  },
});
const loadedEntitiesControlsRef = ref<HTMLElement | null>(null);

const loadedEntityOptions = computed<LoadedEntityOption[]>(() => {
  if (!currentVerse.value || !Array.isArray(currentVerse.value.metas)) {
    return [];
  }

  const options: LoadedEntityOption[] = [];
  const seenMetaIds = new Set<number | string>();

  currentVerse.value.metas.forEach((meta) => {
    const metaId = meta?.id;
    if (metaId !== undefined && metaId !== null) {
      if (seenMetaIds.has(metaId)) return;
      seenMetaIds.add(metaId);
    }

    const title = normalizeEntityName(
      (meta as { title?: string | null }).title
    );
    const name = normalizeEntityName((meta as { name?: string | null }).name);

    if (title) {
      options.push({ id: metaId, name: title });
      return;
    }
    if (name) {
      options.push({ id: metaId, name });
      return;
    }
    if (metaId !== undefined && metaId !== null) {
      options.push({
        id: metaId,
        name: `${t("verse.listPage.entityFallback")}${metaId}`,
      });
    }
  });

  return options;
});

watch(
  () => loadedEntityOptions.value,
  (options) => {
    const hasCurrentSelection =
      selectedLoadedEntityId.value !== null &&
      options.some((entity) => entity.id === selectedLoadedEntityId.value);
    selectedLoadedEntityId.value = hasCurrentSelection
      ? selectedLoadedEntityId.value
      : (options[0]?.id ?? null);
  },
  { immediate: true }
);

const detailProperties = computed(() => {
  if (!currentVerse.value) return [];
  return [
    { label: t("verse.listPage.type"), value: t("verse.listPage.scene") },
    {
      label: t("verse.listPage.author"),
      value:
        currentVerse.value.author?.nickname ||
        currentVerse.value.author?.username ||
        "—",
    },
    {
      label: t("verse.listPage.loadedEntities"),
      value:
        loadedEntityOptions.value.length > 0
          ? loadedEntityOptions.value[0].name
          : t("verse.listPage.noLoadedEntities"),
      slotName: "loaded-entities",
    },
    {
      label: t("verse.listPage.createdTime"),
      value: currentVerse.value.created_at
        ? convertToLocalTime(currentVerse.value.created_at)
        : "—",
    },
  ];
});

const triggerFileSelect = () => {
  if (!canEditCurrentMetadata.value) return;
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
  const scene = currentVerse.value;
  if (!canEditCurrentMetadata.value || !scene) return;
  const request = detailRequestVersion;
  // data is CardInfo, but to be sure
  const imageId =
    (data.context as Record<string, unknown>)?.image_id ||
    data.image?.id ||
    data.id;
  if (imageId) {
    detailLoading.value = true;
    try {
      // If the selected resource is a picture resource, we might need to get its file ID or image ID check
      // But usually image_id refers to the File ID of the image or Image ID.
      // Let's assume imageId is correct for now or verify with getPicture like ImageSelector did.
      // ImageSelector logic:
      // const response = await getPicture(pictureResourceId);
      // const finalImageId = response.data.image_id || response.data.file?.id;

      // Ensure we have the correct ID. 'data.id' is likely the Resource ID.
      let finalImageId = imageId;
      if (data.type === "picture") {
        const response = await getPicture(data.id);
        finalImageId = response.data.image_id || response.data.file?.id;
      }

      if (!metadataRequestIsCurrent(scene.id, request)) return;
      if (!finalImageId) throw new Error(t("verse.listPage.selectImageFile"));
      await putVerse(scene.id, {
        image_id: finalImageId as number | undefined,
      });
      refresh();
      if (!metadataRequestIsCurrent(scene.id, request)) return;
      Message.success(t("verse.view.image.updateSuccess"));
      await openDetail(scene);
    } catch (error) {
      logger.error("Failed to update verse image:", error);
      if (metadataRequestIsCurrent(scene.id, request))
        Message.error(t("verse.view.image.updateError"));
    } finally {
      if (metadataRequestIsCurrent(scene.id, request))
        detailLoading.value = false;
    }
  }
};

const handleCoverUpload = async (event: Event) => {
  const scene = currentVerse.value;
  if (!canEditCurrentMetadata.value || !scene) return;
  const request = detailRequestVersion;
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // Simple validation
  if (!file.type.startsWith("image/")) {
    Message.error(t("verse.listPage.selectImageFile"));
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    Message.error(t("verse.listPage.imageTooLarge"));
    return;
  }

  detailLoading.value = true;
  try {
    // 1. MD5
    const md5 = await fileStore.store.fileMD5(file);
    const extension = file.name.substring(file.name.lastIndexOf("."));
    const handler = await fileStore.store.publicHandler();
    const dir = "picture";

    // 2. Check existence
    const has = await fileStore.store.fileHas(md5, extension, handler, dir);

    // 3. Upload if needed
    if (!has) {
      await new Promise<void>((resolve, reject) => {
        fileStore.store
          .fileUpload(
            md5,
            extension,
            file,
            (_p: number) => {}, // progress
            handler,
            dir
          )
          .then(() => resolve())
          .catch(reject);
      });
    }

    // 4. Register File
    if (!metadataRequestIsCurrent(scene.id, request)) return;
    const fileData: UploadFileType = {
      filename: file.name,
      md5,
      key: md5 + extension,
      url: fileStore.store.fileUrl(md5, extension, handler, dir),
    };
    const response = await postFile(fileData);
    const imageId = response.data.id;

    // 5. Update Verse
    if (metadataRequestIsCurrent(scene.id, request)) {
      await putVerse(scene.id, { image_id: imageId });
      refresh();
      if (!metadataRequestIsCurrent(scene.id, request)) return;
      Message.success(t("verse.view.image.updateSuccess"));
      // Refresh details
      await openDetail(scene);
    }
  } catch (error) {
    logger.error("Upload failed", error);
    if (metadataRequestIsCurrent(scene.id, request))
      Message.error(t("verse.view.image.updateError"));
  } finally {
    if (metadataRequestIsCurrent(scene.id, request))
      detailLoading.value = false;
    // Reset input
    target.value = "";
  }
};

const loadDetail = async (item: VerseData, preserveCurrent = false) => {
  const request = ++detailRequestVersion;
  const propertyId = isGlobalScope.value ? globalPropertyId.value : undefined;
  const descriptionAtRequest = editingDescription.value;
  const hadDescriptionDraft =
    preserveCurrent && descriptionAtRequest !== (item.description || "");
  detailVisible.value = true;
  detailLoading.value = true;
  if (!preserveCurrent) currentVerse.value = null;
  const currentRequest = () =>
    request === detailRequestVersion &&
    detailVisible.value &&
    (!currentVerse.value || currentVerse.value.id === item.id) &&
    propertyId === (isGlobalScope.value ? globalPropertyId.value : undefined);
  try {
    const response = isAllScenes.value
      ? await getAllVerse(item.id, "image,author,tags,metas,public")
      : await getVerse(item.id, "image,author,tags,metas");
    if (!currentRequest()) return;
    currentVerse.value = response.data;
    const index = (items.value ?? []).findIndex(
      (verse) => verse.id === item.id
    );
    if (index >= 0)
      items.value![index] = { ...items.value![index], ...response.data };
    if (
      !preserveCurrent ||
      (!hadDescriptionDraft &&
        editingDescription.value === descriptionAtRequest)
    )
      editingDescription.value = response.data.description || "";
    if (!preserveCurrent && canManage.value && canEditCurrentMetadata.value) {
      const tagsRes = await getTags();
      if (!currentRequest()) return;
      allTags.value = tagsRes.data.map((tag: { id: number; name: string }) => ({
        label: tag.name,
        value: tag.id,
      }));
    }
  } catch (err) {
    if (currentRequest()) Message.error(String(err));
  } finally {
    if (currentRequest()) detailLoading.value = false;
  }
};
const openDetail = (item: VerseData) => loadDetail(item);
const refreshSceneDetails = () => {
  void refresh();
  if (detailVisible.value && currentVerse.value)
    void loadDetail(currentVerse.value, true);
};

const handleDescriptionBlur = async () => {
  if (
    !currentVerse.value ||
    !canEditCurrentMetadata.value ||
    editingDescription.value === (currentVerse.value.description || "")
  )
    return;

  const scene = currentVerse.value;
  const request = detailRequestVersion;
  const description = editingDescription.value;
  try {
    await putVerse(scene.id, {
      description,
    });
    refresh();
    if (!metadataRequestIsCurrent(scene.id, request)) return;
    scene.description = description;
    Message.success(t("verse.listPage.descriptionUpdated"));
  } catch (err) {
    if (!metadataRequestIsCurrent(scene.id, request)) return;
    Message.error(t("verse.listPage.descriptionUpdateFailed"));
    if (editingDescription.value === description)
      editingDescription.value = scene.description || "";
  }
};

const isTagSelected = (tagId: number) => {
  return currentVerse.value?.tags?.some((t) => t.id === tagId);
};

const handleAddTag = async (tagId: number | undefined) => {
  if (
    tagId === undefined ||
    !currentVerse.value ||
    !canEditCurrentMetadata.value ||
    !canManage.value
  )
    return;
  const scene = currentVerse.value;
  const request = detailRequestVersion;
  try {
    await addTag(scene.id, tagId);
    refresh();
    if (!metadataRequestIsCurrent(scene.id, request)) return;
    const tag = allTags.value.find((t) => t.value === tagId);
    if (tag) {
      if (!scene.tags) scene.tags = [];
      scene.tags.push({ id: tag.value, name: tag.label });
    }
    selectedTag.value = undefined;
    Message.success(t("verse.listPage.tagAdded"));
  } catch (err) {
    if (metadataRequestIsCurrent(scene.id, request))
      Message.error(t("verse.listPage.tagAddFailed"));
  }
};

const handleRemoveTag = async (tagId: number) => {
  if (!canEditCurrentMetadata.value || !canManage.value) return;
  if (!currentVerse.value) return;
  const scene = currentVerse.value;
  const request = detailRequestVersion;
  try {
    await removeTag(scene.id, tagId);
    refresh();
    if (!metadataRequestIsCurrent(scene.id, request)) return;
    scene.tags = scene.tags?.filter((t) => t.id !== tagId) ?? [];
    Message.success(t("verse.listPage.tagRemoved"));
  } catch (err) {
    if (metadataRequestIsCurrent(scene.id, request))
      Message.error(t("verse.listPage.tagRemoveFailed"));
  }
};

const handleScenePropertyAdded = (property: SceneProperty) => {
  if (isAllScenes.value && isRoot.value) {
    globalProperties.value = [
      ...globalProperties.value.filter((item) => item.id !== property.id),
      property,
    ];
    void loadGlobalProperties();
  }
  if (property.key === "public" && currentVerse.value)
    syncVerseVisibility(currentVerse.value.id, true);
  refreshSceneDetails();
};
const handleScenePropertyRemoved = (property: SceneProperty) => {
  if (property.key === "public" && currentVerse.value)
    syncVerseVisibility(currentVerse.value.id, false);
  if (isGlobalScope.value && globalPropertyId.value === property.id) {
    const sceneId = currentVerse.value?.id;
    items.value = (items.value ?? []).filter((item) => item.id !== sceneId);
    handlePanelClose();
    void refresh();
  } else refreshSceneDetails();
};
const handleScenePropertyGloballyDeleted = (property: SceneProperty) => {
  if (property.key === "public" && currentVerse.value)
    syncVerseVisibility(currentVerse.value.id, false);
  ++globalCatalogVersion;
  globalPropertiesLoading.value = false;
  globalProperties.value = globalProperties.value.filter(
    (item) => item.id !== property.id
  );
  if (globalPropertyId.value === property.id)
    globalPropertyId.value = undefined;
  else refreshSceneDetails();
  if (isRoot.value) void loadGlobalProperties();
};
const handlePanelClose = () => {
  ++detailRequestVersion;
  detailVisible.value = false;
  detailLoading.value = false;
  propertyDialogOpen.value = false;
  currentVerse.value = null;
};
watch(
  [globalPropertyId, authorSearch],
  () => {
    handlePanelClose();
    items.value = [];
    pagination.current = 1;
    void refresh();
  },
  { flush: "sync" }
);
watch(authorSearchInput, (value) => {
  clearTimeout(authorSearchTimer);
  if (!value.trim()) applyAuthorSearch();
  else authorSearchTimer = setTimeout(applyAuthorSearch, 300);
});
watch(
  isRoot,
  (root) => {
    ++globalCatalogVersion;
    globalProperties.value = [];
    globalPropertiesLoading.value = false;
    globalPropertiesError.value = "";
    if (!root) {
      handlePanelClose();
      if (isAllScenes.value) {
        authorSearchInput.value = "";
        authorSearch.value = "";
        items.value = [];
        void refresh();
      }
      if (globalPropertyId.value !== undefined)
        globalPropertyId.value = undefined;
    } else void loadGlobalProperties();
  },
  { immediate: true, flush: "sync" }
);
onBeforeUnmount(() => {
  ++globalCatalogVersion;
  ++detailRequestVersion;
  clearTimeout(authorSearchTimer);
});
const goToEditor = (item: VerseData) => {
  if (!canEditScene(item)) return;
  const title = encodeURIComponent(
    t("verse.listPage.editorTitle", {
      name: item.name || t("verse.listPage.unnamed"),
    })
  );
  router.push({ path: "/verse/scene", query: { id: item.id, title } });
};

const goToEntityEditor = (entityId: number | string, entityName?: string) => {
  const title = encodeURIComponent(
    t("meta.list.editorTitle", {
      name: entityName || t("meta.list.unnamed"),
    })
  );
  router.push({ path: "/meta/scene", query: { id: entityId, title } });
};

const handleGoToEditor = () => {
  if (currentVerse.value) {
    goToEditor(currentVerse.value);
  }
};

const handleEnterSelectedEntity = () => {
  if (selectedLoadedEntityId.value === null || !canEditCurrentScene.value)
    return;
  const selectedEntity = loadedEntityOptions.value.find(
    (entity) => entity.id === selectedLoadedEntityId.value
  );
  goToEntityEditor(selectedLoadedEntityId.value, selectedEntity?.name);
};

const updateLoadedEntitiesDropdownWidth = () => {
  if (typeof document === "undefined") return;
  const controlsWidth = loadedEntitiesControlsRef.value?.offsetWidth;
  if (!controlsWidth) return;
  document.documentElement.style.setProperty(
    "--detail-link-select-entity-width",
    `${controlsWidth}px`
  );
};

const handleLoadedEntitiesDropdownVisible = (visible: boolean) => {
  if (!visible) return;
  updateLoadedEntitiesDropdownWidth();
};

const _handleCopy = async () => {
  if (!currentVerse.value) return;
  try {
    const { value } = (await MessageBox.prompt(
      t("verse.listPage.copyPromptMessage"),
      t("verse.listPage.copyPromptTitle"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        defaultValue: formatClonedSceneName(
          currentVerse.value.name,
          t("verse.listPage.copySuffix")
        ),
      }
    )) as { value: string };

    const data: PostVerseData = {
      name: value,
      description: currentVerse.value.description || "",
      uuid: uuidv4(),
      image_id: currentVerse.value.image?.id,
    };
    await postVerse(data);
    refresh();
    Message.success(t("verse.listPage.copySuccess") + value);
  } catch {
    Message.info(t("verse.listPage.cancelInfo"));
  }
};

const handleExport = async () => {
  if (!currentVerse.value) return;
  try {
    await exportScene(currentVerse.value.id);
    Message.success(t("ui.exportSuccess"));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("ui.unknownError");
    Message.error(t("ui.exportFailed", { message }));
  }
};

const handleRename = async (newName: string) => {
  if (!canEditCurrentMetadata.value) return;
  if (!currentVerse.value) return;
  const scene = currentVerse.value;
  const request = detailRequestVersion;
  try {
    await putVerse(scene.id, { name: newName });
    refresh();
    if (!metadataRequestIsCurrent(scene.id, request)) return;
    scene.name = newName;
    Message.success(t("verse.listPage.renameSuccess") + newName);
  } catch (err) {
    if (metadataRequestIsCurrent(scene.id, request)) Message.error(String(err));
  }
};

const handleDelete = async () => {
  if (!canEditCurrentScene.value) return;
  if (!currentVerse.value) return;
  try {
    await MessageBox.confirm(
      t("verse.listPage.deleteConfirmMessage"),
      t("verse.listPage.deleteConfirmTitle"),
      {
        confirmButtonText: t("verse.listPage.delete"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      }
    );
    await deleteVerse(currentVerse.value.id);
    detailVisible.value = false;
    refresh();
    Message.success(t("common.deleteSuccess"));
  } catch {
    Message.info(t("verse.listPage.cancelInfo"));
  }
};

const createWindow = () => {
  createdDialog.value?.show();
};

const submitCreate = async (
  form: Record<string, string>,
  imageId: number | null
) => {
  const data: PostVerseData = {
    name: form.name,
    description: form.description,
    uuid: uuidv4(),
  };
  if (imageId !== null) data.image_id = imageId;
  try {
    const response = await postVerse(data);
    const title = encodeURIComponent(
      t("verse.listPage.editorTitle", { name: form.name })
    );
    router.push({
      path: "/verse/scene",
      query: { id: response.data.id, title },
    });
  } catch (error) {
    logger.error(error);
  }
};

const namedWindow = async (item: VerseData) => {
  if (!canEditScene(item)) return;
  try {
    const { value } = (await MessageBox.prompt(
      t("meta.prompt2.message1"),
      t("meta.prompt2.message2"),
      {
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
        defaultValue: item.name,
      }
    )) as { value: string };
    await putVerse(item.id, { name: value });
    refresh();
    Message.success(t("verse.listPage.renameSuccess") + value);
  } catch {
    Message.info(t("verse.listPage.cancelInfo"));
  }
};

const deletedWindow = async (item: VerseData) => {
  if (!canEditScene(item)) return;
  try {
    await MessageBox.confirm(
      t("verse.listPage.deleteConfirmMessage"),
      t("verse.listPage.deleteConfirmTitle"),
      {
        confirmButtonText: t("verse.listPage.delete"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      }
    );
    await deleteVerse(item.id);
    refresh();
    Message.success(t("common.deleteSuccess"));
  } catch {
    Message.info(t("verse.listPage.cancelInfo"));
  }
};

const formatItemDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};
</script>

<style scoped lang="scss">
.verse-index {
  padding: 12px;
}

.scene-detail-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
  width: 100%;
  min-width: 0;

  .actions-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}

:deep(.page-action-bar .controls-left) {
  flex-wrap: wrap;
  min-width: 0;
}

.scene-property-filter {
  display: flex;
  gap: 8px;
  align-items: center;

  &__select {
    width: 240px;
  }

  &__error {
    color: var(--el-color-danger);
  }
}

.scene-author-filter {
  width: 240px;
  max-width: 100%;
}

@media (width <= 767px) {
  :deep(.controls-left),
  :deep(.controls-right) {
    flex-wrap: wrap;
    width: 100%;
    min-width: 0;
  }

  :deep(.controls-right) {
    flex-shrink: 1;
    gap: 10px;
  }

  :deep(.controls-right > .el-button) {
    margin-left: 0;
  }

  :deep(.search-box) {
    width: 100%;
  }

  .scene-property-filter__select {
    width: 190px;
  }
}

.col-name {
  display: flex;
  flex: 1;
  gap: 16px;
  align-items: center;
  min-width: 0;
}

.col-author {
  flex-shrink: 0;
  width: 120px;
  padding-right: 24px;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  text-align: right;
}

.col-date {
  flex-shrink: 0;
  width: 120px;
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

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.thumb-placeholder {
  color: var(--text-muted, #94a3b8);

  .svg-inline--fa {
    font-size: 24px;
  }
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

  &:hover {
    color: var(--text-primary, #1e293b);
    background: var(--bg-active, #e2e8f0);
    opacity: 1;
  }
}

.verse-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
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

.loaded-entities-value {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.loaded-entities-controls {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.loaded-entities-select {
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

.loaded-entities-enter-btn {
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

:global(.detail-link-select-popper-entity.el-select__popper) {
  width: var(--detail-link-select-entity-width) !important;
  min-width: var(--detail-link-select-entity-width) !important;
  padding: 0 !important;
}

:global(
  .detail-link-select-popper-entity.el-select__popper .el-select-dropdown
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

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-muted, #94a3b8);
  background: #f1f5f9;
  border-radius: var(--radius-lg, 16px);

  .svg-inline--fa {
    font-size: 64px;
  }
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
    box-shadow: 0 8px 16px rgb(14 165 233 / 20%);
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

.verse-detail-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 12px 0;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.empty-tags {
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
}

.tag-select {
  width: 100%;
}

:deep(.el-textarea__inner) {
  padding: 12px 16px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  transition: all 0.2s ease;

  &:focus {
    background: var(--bg-card, #fff);
    border-color: var(--primary-color, #03a9f4);
    box-shadow: 0 0 0 3px var(--primary-light, rgb(3 169 244 / 10%));
  }
}

.list-view {
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

:deep(.panel-actions .dual-primary-btn) {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: var(--primary-color, #03a9f4);
  border: none;
  border-radius: var(
    --standard-page-max-radius,
    calc(var(--radius-lg, 24px) / 3)
  );
  transition: all 0.2s ease;
}

:deep(.panel-actions .dual-primary-btn:hover) {
  background: var(--primary-hover, #039be5);
}
</style>
