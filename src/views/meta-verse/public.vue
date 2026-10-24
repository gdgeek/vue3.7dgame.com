<template>
  <TransitionWrapper>
    <div class="verse-public">
      <div class="hero-header">
        <div class="toolbar-main">
          <div class="hero-search-box">
            <font-awesome-icon
              :icon="['fas', 'search']"
              class="search-icon"
            ></font-awesome-icon>
            <input
              v-model="searchValue"
              type="text"
              class="hero-search-input"
              :placeholder="t('verse.publicPage.searchExamples')"
              @keyup.enter="handleHeroSearch"
            />
          </div>

          <div class="category-filter">
            <el-dropdown trigger="click">
              <button class="filter-btn" type="button">
                <font-awesome-icon
                  :icon="['fas', 'filter']"
                  class="filter-icon"
                ></font-awesome-icon>
                <span class="filter-label"
                  >{{ t("ui.filter") }} · {{ currentCategoryName }}</span
                >
                <font-awesome-icon
                  :icon="['fas', 'chevron-down']"
                  class="filter-arrow"
                ></font-awesome-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="tab in categories"
                    :key="tab.id"
                    @click="selectTab(tab.id)"
                  >
                    {{ tab.name }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <p class="hero-subtitle">
            {{ t("verse.publicPage.examplesSubtitle") }}
          </p>
        </div>
      </div>

      <ViewContainer
        class="list-view"
        :items="items"
        :view-mode="viewMode"
        :loading="loading"
        :card-gutter="denseResourceCardGutter"
        long-press-enabled
        @row-click="openDetail"
        @row-long-press="goToScene"
      >
        <template #grid-card="{ item }">
          <StandardCard
            class="example-card"
            v-long-press="() => goToScene(item)"
            :image="item.image?.url"
            :title="item.name || t('verse.listPage.unnamed')"
            :description="item.description"
            :meta="{
              author: item.author?.nickname || item.author?.username,
              date: formatItemDate(item.created_at),
            }"
            :type-icon="['fas', 'layer-group']"
            :placeholder-icon="['fas', 'image']"
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
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img
                v-if="item.image?.url"
                :src="toHttps(item.image.url)"
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
        </template>
      </ViewContainer>

      <PagePagination
        :current-page="pagination.current"
        :total-pages="totalPages"
        :sticky="true"
        @page-change="handlePageChange"
      >
      </PagePagination>

      <!-- Detail Panel -->
      <DetailPanel
        v-model="detailVisible"
        :title="t('verse.listPage.detailTitle')"
        :name="currentVerse?.name || ''"
        :loading="detailLoading"
        :properties="detailProperties"
        :placeholder-icon="['fas', 'image']"
        width="560px"
        :show-delete="false"
        :editable="false"
        action-layout="stacked"
        :secondary-action="false"
        :download-text="t('verse.publicPage.viewExample')"
        @download="handleGoToPage"
        @close="handlePanelClose"
      >
        <template #name>
          <SceneTitle :name="currentVerse?.name || ''"></SceneTitle>
        </template>
        <template #preview>
          <div class="verse-preview">
            <img
              v-if="currentVerse?.image?.url"
              :src="toHttps(currentVerse.image.url)"
              :alt="currentVerse.name"
            />
            <div v-else class="preview-placeholder">
              <font-awesome-icon :icon="['fas', 'image']"></font-awesome-icon>
            </div>
          </div>
        </template>
        <template #info>
          <div class="verse-detail-info">
            <!-- DescriptionSection -->
            <div class="info-section">
              <div class="section-header">
                {{ t("verse.listPage.sceneIntro") }}
              </div>
              <p class="description-text">
                {{
                  currentVerse?.description ||
                  t("verse.publicPage.noDescription")
                }}
              </p>
            </div>

            <!-- Tags Section -->
            <div class="info-section">
              <div class="section-header">
                {{ t("verse.listPage.sceneTags") }}
              </div>
              <div
                v-if="
                  currentVerse?.tags?.length || currentVerse?.verseTags?.length
                "
                class="tag-list"
              >
                <el-tag
                  v-for="tag in currentVerse.tags || currentVerse.verseTags"
                  :key="tag.id"
                  class="mr-2 mb-2"
                >
                  {{ tag.name }}
                </el-tag>
              </div>
              <div v-else class="empty-tags">
                {{ t("verse.listPage.noTags") }}
              </div>
            </div>
          </div>
        </template>
      </DetailPanel>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import SceneTitle from "@/components/SceneTitle.vue";
import { vLongPress } from "@/directive/longPress";
import { logger } from "@/utils/logger";
import { ref, onMounted, computed, watch, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  ViewContainer,
  PagePagination,
  StandardCard,
  DetailPanel,
} from "@/components/StandardPage";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { getPublic, getVerse } from "@/api/v1/verse";
import type { VerseData } from "@/api/v1/verse";
import { getTags } from "@/api/v1/tags";
import { usePageData } from "@/composables/usePageData";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import { ElMessage } from "element-plus";
import { toHttps } from "@/utils/helper";
import { denseResourceCardGutter } from "@/utils/resourceGrid";

const { t } = useI18n();
const router = useRouter();

const searchValue = ref("");
let searchTimer: ReturnType<typeof setTimeout> | null = null;
const categories = ref<{ id: number; name: string }[]>([
  { id: 0, name: t("verse.publicPage.allCategory") },
]);
const currentTab = ref(0);
const currentCategoryName = computed(() => {
  const activeCategory = categories.value.find(
    (item) => item.id === currentTab.value
  );
  return activeCategory?.name || t("verse.publicPage.allCategory");
});

// 从 API 加载标签分类
onMounted(async () => {
  try {
    const res = await getTags();
    const tagCategories = res.data.map((tag: { id: number; name: string }) => ({
      id: tag.id,
      name: tag.name,
    }));
    categories.value = [
      { id: 0, name: t("verse.publicPage.allCategory") },
      ...tagCategories,
    ];
  } catch (e) {
    logger.error("Failed to load tags:", e);
  }
});

const {
  items,
  loading,
  pagination,
  viewMode,
  totalPages,
  refresh: _refresh,
  handleSearch,
  handleSortChange: _handleSortChange,
  handlePageChange,
  handleViewChange: _handleViewChange,
  handleTagsChange,
} = usePageData({
  fetchFn: async (params) =>
    await getPublic({
      sort: params.sort,
      search: params.search,
      page: params.page,
      perPage: Number(params.pageSize) || 24,
      tags: params.tags,
      expand: "image,author,tags",
    }),
  pageSize: 24,
});

const handleHeroSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  handleSearch(searchValue.value);
};

const scheduleSearch = (value: string) => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(() => {
    handleSearch(value);
    searchTimer = null;
  }, 300);
};

const selectTab = (id: number) => {
  currentTab.value = id;
  if (id === 0) {
    handleTagsChange([]);
  } else {
    handleTagsChange([id]);
  }
};

const formatItemDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};

// Detail Panel Logic
const detailVisible = ref(false);
const detailLoading = ref(false);
const currentVerse = ref<VerseData | null>(null);

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
      label: t("verse.publicPage.updatedTime"),
      value: currentVerse.value.updated_at
        ? convertToLocalTime(currentVerse.value.updated_at)
        : "—",
    },
  ];
});

const openDetail = async (item: VerseData) => {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await getVerse(item.id, "image,author,tags");
    currentVerse.value = response.data;
  } catch (err) {
    ElMessage.error(String(err));
  } finally {
    detailLoading.value = false;
  }
};

const handlePanelClose = () => {
  currentVerse.value = null;
};

const handleGoToPage = () => {
  if (currentVerse.value) {
    goToScene(currentVerse.value);
  }
};

watch(searchValue, (value) => {
  if (value === "") {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    handleSearch("");
    return;
  }

  scheduleSearch(value);
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});

const goToScene = (item: VerseData) => {
  const title = encodeURIComponent(
    t("verse.listPage.editorTitle", {
      name: item.name || t("verse.listPage.unnamed"),
    })
  );
  router.push({ path: "/verse/scene", query: { id: item.id, title } });
};
</script>

<style scoped lang="scss">
.hero-header {
  padding: var(--spacing-md, 16px) 20px;
  margin-bottom: var(--spacing-sm, 8px);
  background: var(--bg-card, #fff);
  border-bottom: 1px solid var(--border-color, #e2e8f0);

  .toolbar-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .hero-subtitle {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-secondary, #64748b);
    overflow-wrap: anywhere;
  }

  .hero-search-box {
    position: relative;
    min-width: 0;

    .search-icon {
      position: absolute;
      top: 50%;
      left: 16px;
      font-size: 18px;
      color: var(--text-muted, #94a3b8);
      transform: translateY(-50%);
    }

    .hero-search-input {
      width: 100%;
      height: 42px;
      padding: 0 12px 0 44px;
      font-size: 14px;
      color: var(--text-primary, #1e293b);
      background: var(--bg-hover, #f8fafc);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: var(--standard-page-max-radius, 8px);
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &::placeholder {
        color: var(--text-muted, #94a3b8);
      }

      &:focus {
        border-color: var(--primary-color, #03a9f4);
        box-shadow: 0 0 0 3px var(--primary-light, rgb(3 169 244 / 10%));
      }
    }
  }

  .category-filter {
    min-width: 0;
    max-width: 240px;

    :deep(.el-dropdown) {
      width: 100%;
      min-width: 0;
    }

    .filter-btn {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      max-width: 100%;
      height: 42px;
      padding: 0 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary, #334155);
      cursor: pointer;
      background: var(--bg-card, #fff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: var(--standard-page-max-radius, 8px);
      transition: all 0.2s ease;

      &:hover {
        background: var(--bg-hover, #f8fafc);
        border-color: var(--primary-color, #03a9f4);
      }
    }

    .filter-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .filter-icon {
      flex-shrink: 0;
      font-size: 14px;
      color: var(--text-secondary, #64748b);
    }

    .filter-arrow {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
    }
  }
}

.list-view {
  padding: 0 20px 12px;

  :deep(.col-checkbox) {
    width: 40px;
  }

  .col-name {
    display: flex;
    flex: 1;
    gap: 12px;
    align-items: center;
    min-width: 0;
  }

  .item-thumb {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    overflow: hidden;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .item-name {
    min-width: 0;
    overflow: hidden;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #1e293b);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-author,
  .col-date {
    flex-shrink: 0;
    width: 120px;
    padding-right: 24px;
    overflow: hidden;
    font-size: 13px;
    color: var(--text-secondary, #64748b);
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (width <= 640px) {
  .hero-header {
    padding: var(--spacing-md, 16px);

    .toolbar-main {
      grid-template-columns: minmax(0, 1fr);
    }

    .category-filter {
      max-width: 100%;

      .filter-btn {
        width: 100%;
      }

      .filter-arrow {
        margin-left: auto;
      }
    }
  }

  .list-view {
    padding: 0 var(--spacing-md, 16px) var(--spacing-md, 16px);
  }
}

.verse-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: var(--radius-lg, 16px);
  }
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

.description-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary, #64748b);
  white-space: pre-wrap;
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
</style>
