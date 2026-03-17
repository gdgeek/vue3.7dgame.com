<template>
  <TransitionWrapper>
    <div class="verse-index">
      <PageActionBar
        :title="t('verse.listPage.myScenes')"
        :show-title="false"
        :search-placeholder="t('verse.listPage.searchScenes')"
        :show-tags="true"
        @search="handleSearch"
        @sort-change="handleSortChange"
        @view-change="handleViewChange"
      >
        <template #filters>
          <TagsSelect
            v-if="canViewSceneFilter"
            @tags-change="handleTagsChange"
          ></TagsSelect>
        </template>
        <template #actions>
          <el-button type="primary" @click="createWindow">
            <font-awesome-icon
              :icon="['fas', 'plus']"
              style="font-size: 18px; margin-right: 4px"
            ></font-awesome-icon>
            {{ t("verse.listPage.createScene") }}
          </el-button>
          <el-button @click="openImportDialog">
            <font-awesome-icon
              :icon="['fas', 'upload']"
              style="font-size: 18px; margin-right: 4px"
            ></font-awesome-icon>
            {{ t("ui.importScene") }}
          </el-button>
        </template>
      </PageActionBar>

      <ViewContainer
        class="list-view"
        :items="items"
        :view-mode="viewMode"
        :loading="loading"
        :breakpoints="denseResourceBreakpoints"
        :card-gutter="denseResourceCardGutter"
        @row-click="openDetail"
      >
        <template #grid-card="{ item }">
          <StandardCard
            :image="item.image?.url"
            :title="item.name || t('verse.listPage.unnamed')"
            :description="item.description"
            :type-icon="['fas', 'layer-group']"
            :placeholder-icon="['fas', 'layer-group']"
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
                  {{ t("route.project.sceneEditor") }}
                </button>
              </div>
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
            <span class="item-name">{{ item.name || "—" }}</span>
            <el-button
              class="btn-hover-action"
              type="primary"
              @click.stop="goToEditor(item)"
            >
              {{ t("verse.listPage.enterEditor") }}
            </el-button>
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
                  <el-dropdown-item @click="goToEditor(item)">{{
                    t("verse.listPage.enterEditor")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="namedWindow(item)">{{
                    t("verse.listPage.rename")
                  }}</el-dropdown-item>
                  <el-dropdown-item @click="deletedWindow(item)">{{
                    t("verse.listPage.delete")
                  }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #empty>
          <EmptyState
            :icon="['fas', 'layer-group']"
            :text="t('route.project.noVerses')"
            :action-text="t('verse.listPage.createScene')"
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
        :title="t('verse.listPage.detailTitle')"
        :name="currentVerse?.name || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'image']"
        width="560px"
        :show-delete="true"
        action-layout="grid"
        :download-text="t('ui.exportScene')"
        :download-icon="['fas', 'download']"
        :delete-text="t('verse.listPage.deleteScene')"
        @download="handleExport"
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
                type="textarea"
                :rows="4"
                :placeholder="t('verse.listPage.sceneIntroPlaceholder')"
                @blur="handleDescriptionBlur"
              ></el-input>
            </div>

            <!-- Tags Section (Restricted) -->
            <div v-if="canManage" class="info-section">
              <div class="section-header">
                {{ t("verse.listPage.sceneTags") }}
              </div>
              <div v-if="currentVerse?.verseTags?.length" class="tag-list">
                <el-tag
                  v-for="tag in currentVerse.verseTags"
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

            <!-- Visibility Section (Restricted) -->
            <div v-if="canManage" class="info-section">
              <div class="section-header">
                {{ t("verse.listPage.visibility") }}
              </div>
              <div class="visibility-group">
                <button
                  class="vis-btn"
                  :class="{ active: !currentVerse?.public }"
                  @click="handleVisibilityChange(false)"
                >
                  <font-awesome-icon
                    :icon="['fas', 'lock']"
                  ></font-awesome-icon>
                  {{ t("verse.listPage.private") }}
                </button>
                <button
                  class="vis-btn"
                  :class="{ active: currentVerse?.public }"
                  @click="handleVisibilityChange(true)"
                >
                  <font-awesome-icon
                    :icon="['fas', 'globe']"
                  ></font-awesome-icon>
                  {{ t("verse.listPage.public") }}
                </button>
              </div>
            </div>
          </div>
        </template>
        <template #property-loaded-entities>
          <div class="loaded-entities-value">
            <template v-if="loadedEntityOptions.length === 0">
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
import { FolderOpened, Upload } from "@element-plus/icons-vue";
import { logger } from "@/utils/logger";
import { ref, computed, watch } from "vue";
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
import ImportDialog from "@/components/ScenePackage/ImportDialog.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import {
  getVerses,
  getVerse,
  postVerse,
  putVerse,
  deleteVerse,
  addPublic,
  removePublic,
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
import {
  denseResourceBreakpoints,
  denseResourceCardGutter,
} from "@/utils/resourceGrid";

const { t } = useI18n();
const router = useRouter();
const createdDialog = ref<InstanceType<typeof Create> | null>(null);

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
  fetchFn: async (params) =>
    await getVerses({
      sort: params.sort,
      search: params.search,
      page: params.page,
      perPage: Number(params.pageSize) || 24,
      tags: params.tags,
      expand: "image,author",
    }),
  pageSize: 24,
});

const detailVisible = ref(false);
const detailLoading = ref(false);
const currentVerse = ref<VerseData | null>(null);
const ability = useAbility();

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
  // data is CardInfo, but to be sure
  const imageId =
    (data.context as Record<string, unknown>)?.image_id ||
    data.image?.id ||
    data.id;
  if (imageId && currentVerse.value) {
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

      await putVerse(currentVerse.value.id, {
        image_id: finalImageId as number | undefined,
      });
      Message.success(t("verse.view.image.updateSuccess"));
      await openDetail(currentVerse.value);
    } catch (error) {
      logger.error("Failed to update verse image:", error);
      Message.error(t("verse.view.image.updateError"));
    } finally {
      detailLoading.value = false;
    }
  }
};

const handleCoverUpload = async (event: Event) => {
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
    const fileData: UploadFileType = {
      filename: file.name,
      md5,
      key: md5 + extension,
      url: fileStore.store.fileUrl(md5, extension, handler, dir),
    };
    const response = await postFile(fileData);
    const imageId = response.data.id;

    // 5. Update Verse
    if (currentVerse.value) {
      await putVerse(currentVerse.value.id, { image_id: imageId });
      Message.success(t("verse.view.image.updateSuccess"));
      // Refresh details
      await openDetail(currentVerse.value);
    }
  } catch (error) {
    logger.error("Upload failed", error);
    Message.error(t("verse.view.image.updateError"));
  } finally {
    detailLoading.value = false;
    // Reset input
    target.value = "";
  }
};

const openDetail = async (item: VerseData) => {
  detailVisible.value = true;
  detailLoading.value = true;

  try {
    const response = await getVerse(item.id, "image,author,verseTags,metas");
    currentVerse.value = response.data;
    editingDescription.value = response.data.description || "";

    if (canManage.value) {
      const tagsRes = await getTags();
      allTags.value = tagsRes.data.map((tag: { id: number; name: string }) => ({
        label: tag.name,
        value: tag.id,
      }));
    }
  } catch (err) {
    Message.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handleDescriptionBlur = async () => {
  if (
    !currentVerse.value ||
    editingDescription.value === (currentVerse.value.description || "")
  )
    return;

  try {
    await putVerse(currentVerse.value.id, {
      description: editingDescription.value,
    });
    currentVerse.value.description = editingDescription.value;
    Message.success(t("verse.listPage.descriptionUpdated"));
    refresh();
  } catch (err) {
    Message.error(t("verse.listPage.descriptionUpdateFailed"));
    editingDescription.value = currentVerse.value.description || "";
  }
};

const isTagSelected = (tagId: number) => {
  return currentVerse.value?.verseTags?.some((t) => t.id === tagId);
};

const handleAddTag = async (tagId: number | undefined) => {
  if (tagId === undefined || !currentVerse.value) return;
  try {
    await addTag(currentVerse.value.id, tagId);
    const tag = allTags.value.find((t) => t.value === tagId);
    if (tag) {
      if (!currentVerse.value.verseTags) currentVerse.value.verseTags = [];
      currentVerse.value.verseTags.push({ id: tag.value, name: tag.label });
    }
    selectedTag.value = undefined;
    Message.success(t("verse.listPage.tagAdded"));
    refresh();
  } catch (err) {
    Message.error(t("verse.listPage.tagAddFailed"));
  }
};

const handleRemoveTag = async (tagId: number) => {
  if (!currentVerse.value) return;
  try {
    await removeTag(currentVerse.value.id, tagId);
    currentVerse.value.verseTags =
      currentVerse.value.verseTags?.filter((t) => t.id !== tagId) ?? [];
    Message.success(t("verse.listPage.tagRemoved"));
    refresh();
  } catch (err) {
    Message.error(t("verse.listPage.tagRemoveFailed"));
  }
};

const handleVisibilityChange = async (isPublic: boolean) => {
  if (!currentVerse.value || currentVerse.value.public === isPublic) return;

  try {
    if (isPublic) {
      await addPublic(currentVerse.value.id);
    } else {
      await removePublic(currentVerse.value.id);
    }
    currentVerse.value.public = isPublic;
    Message.success(
      isPublic
        ? t("verse.view.public.addSuccess")
        : t("verse.view.public.removeSuccess")
    );
    refresh();
  } catch (err) {
    Message.error(t("verse.listPage.visibilityUpdateFailed"));
  }
};

const handlePanelClose = () => {
  currentVerse.value = null;
};

const goToEditor = (item: VerseData) => {
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
  if (selectedLoadedEntityId.value === null) return;
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
        defaultValue: `${currentVerse.value.name}${t("verse.listPage.copySuffix")}`,
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
  if (!currentVerse.value) return;
  try {
    await putVerse(currentVerse.value.id, { name: newName });
    currentVerse.value.name = newName;
    refresh();
    Message.success(t("verse.listPage.renameSuccess") + newName);
  } catch (err) {
    Message.error(String(err));
  }
};

const handleDelete = async () => {
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

.col-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.col-author {
  width: 120px;
  text-align: right;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  flex-shrink: 0;
  padding-right: 24px;
}

.col-date {
  width: 120px;
  text-align: right;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #64748b);
  flex-shrink: 0;
  padding-right: 24px;
}

.col-actions {
  width: 48px;
  text-align: center;
  flex-shrink: 0;
}

.item-thumb {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm, 12px);
  overflow: hidden;
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

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
  font-size: var(--font-size-md, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--text-primary, #1e293b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-icon {
  font-size: 22px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm, 12px);
  transition: all var(--transition-fast, 0.15s ease);
  opacity: 0.6;

  &:hover {
    background: var(--bg-active, #e2e8f0);
    color: var(--text-primary, #1e293b);
    opacity: 1;
  }
}

.verse-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  overflow: hidden;

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
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
    border-radius: var(--radius-lg, 16px);
    color: white;

    .svg-inline--fa {
      font-size: 48px;
      margin-bottom: 8px;
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
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.loaded-entities-select {
  flex: 1;
  min-width: 120px;

  :deep(.el-select__wrapper) {
    min-height: 24px;
    align-items: center;
  }

  :deep(.el-select__selection) {
    min-width: 0;
    align-items: center;
  }

  :deep(.el-select__selected-item),
  :deep(.el-select__placeholder) {
    width: 100%;
    text-align: center;
    line-height: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.loaded-entities-enter-btn {
  flex-shrink: 0;
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

:global(.detail-link-select-popper .el-select-dropdown__item) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  box-sizing: border-box;
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
  background: var(--primary-light, rgba(3, 169, 244, 0.12)) !important;
  color: var(--primary-color, #03a9f4) !important;
}

:global(
  .detail-link-select-popper.el-select__popper
    .el-select-dropdown__item.selected:not(.hover):not(.is-hovering):not(
      :hover
    ),
  .detail-link-select-popper.el-select__popper
    .el-select-dropdown__item.is-selected:not(.hover):not(.is-hovering):not(
      :hover
    )
) {
  background: transparent !important;
  color: var(--primary-color, #03a9f4) !important;
  font-weight: 500 !important;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #94a3b8);
  width: 100%;
  height: 100%;
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
  border: 2px solid var(--border-color, #e4e7ed);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-card, #ffffff);

  &:hover {
    border-color: var(--primary-color, #0ea5e9);
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(14, 165, 233, 0.2);
    background: var(--bg-hover, #f8fafc);

    .card-icon {
      transform: scale(1.1);
      color: var(--primary-color, #0ea5e9);
    }
  }
}

.card-icon {
  color: var(--primary-color, #409eff);
  margin-bottom: 15px;
  transition: transform 0.3s ease;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #303133);
  margin-bottom: 8px;
}

.card-description {
  font-size: 13px;
  color: var(--text-secondary, #909399);
  line-height: 1.5;
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

.visibility-group {
  display: flex;
  gap: 12px;
}

.vis-btn {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 22px;
  border: 1.5px solid var(--border-color, #e2e8f0);
  background: var(--bg-card, #fff);
  color: var(--text-secondary, #64748b);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  .svg-inline--fa {
    font-size: 20px;
  }

  &:hover {
    border-color: var(--primary-color, #03a9f4);
    color: var(--primary-color, #03a9f4);
  }

  &.active {
    background: var(--primary-light, rgba(3, 169, 244, 0.1));
    border-color: var(--primary-color, #03a9f4);
    color: var(--primary-color, #03a9f4);
    font-weight: 600;
  }
}

:deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  transition: all 0.2s ease;

  &:focus {
    background: var(--bg-card, #fff);
    border-color: var(--primary-color, #03a9f4);
    box-shadow: 0 0 0 3px var(--primary-light, rgba(3, 169, 244, 0.1));
  }
}

.list-view {
  :deep(.single-card-actions) {
    display: flex;
    border-top: var(--border-width, 1px) solid var(--border-color, #e2e8f0);
  }

  :deep(.single-card-action-btn) {
    width: 100%;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    background: var(--bg-hover, #f8fafc);
    color: var(--text-secondary, #64748b);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  :deep(.single-card-action-btn:hover) {
    color: var(--primary-color, #03a9f4);
    background: var(--bg-active, #eef7ff);
  }

  :deep(.standard-card .card-content) {
    padding: 10px 14px;
    gap: 4px;
  }

  :deep(.col-checkbox) {
    width: 40px;
  }

  .col-name {
    gap: 12px;
  }

  .col-author {
    width: 120px;
    text-align: right;
    font-size: var(--font-size-sm, 13px);
    color: var(--text-secondary, #64748b);
    flex-shrink: 0;
    padding-right: 24px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-hover-action {
    opacity: 0;
    visibility: hidden;
    height: 28px;
    width: 84px;
    padding: 0;
    margin-left: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 500;
    flex-shrink: 0;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--primary-color, #03a9f4);
    border: none;
    color: white;
    box-shadow: 0 4px 12px rgba(3, 169, 244, 0.3);

    &:hover {
      background: var(--primary-hover, #039be5);
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(3, 169, 244, 0.4);
    }
  }

  :deep(.list-row:hover) {
    .btn-hover-action {
      opacity: 1;
      visibility: visible;
    }
  }
}

.enter-edit-btn {
  width: 100%;
  height: 52px !important;
  min-height: 52px !important;
  border-radius: 26px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
}

:deep(.panel-actions .dual-primary-btn) {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 999px;
  background: var(--primary-color, #03a9f4);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.panel-actions .dual-primary-btn:hover) {
  background: var(--primary-hover, #039be5);
}
</style>
