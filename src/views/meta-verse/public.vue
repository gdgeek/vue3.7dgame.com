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
                {{ t("ui.filter") }} · {{ currentCategoryName }}
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
        :breakpoints="denseResourceBreakpoints"
        :card-gutter="denseResourceCardGutter"
        @row-click="openDetail"
      >
        <template #grid-card="{ item }">
          <StandardCard
            :image="item.image?.url"
            :title="item.name || t('verse.listPage.unnamed')"
            :description="item.description"
            :meta="{
              author: item.author?.nickname || item.author?.username,
              date: formatItemDate(item.created_at),
            }"
            :action-text="t('verse.publicPage.viewExample')"
            :action-icon="['fas', 'eye']"
            :type-icon="['fas', 'layer-group']"
            :placeholder-icon="['fas', 'image']"
            :show-checkbox="false"
            aspect-ratio="1.6 / 1"
            @view="openDetail(item)"
            @action="goToScene(item)"
          >
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
                :src="toHttps(item.image.url)"
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
              @click.stop="openDetail(item)"
            >
              {{ $t("common.open") }}
            </el-button>
          </div>
          <div class="col-author">
            {{ item.author?.nickname || item.author?.username || "—" }}
          </div>
          <div class="col-date">{{ formatItemDate(item.created_at) }}</div>
          <div class="col-actions" @click.stop>
            <el-button type="primary" size="small" @click="openDetail(item)">
              {{ $t("common.open") }}
            </el-button>
          </div>
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
        action-layout="stacked"
        :secondary-action="false"
        :download-text="t('verse.publicPage.viewExample')"
        @download="handleGoToPage"
        @close="handlePanelClose"
      >
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
import { logger } from "@/utils/logger";
import { ref, onMounted, computed } from "vue";
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
import {
  denseResourceBreakpoints,
  denseResourceCardGutter,
} from "@/utils/resourceGrid";

const { t } = useI18n();
const router = useRouter();

const searchValue = ref("");
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
    const classifyTags = res.data
      .filter(
        (tag: { id: number; name: string; type?: string }) =>
          tag.type === "Classify"
      )
      .map((tag: { id: number; name: string; type?: string }) => ({
        id: tag.id,
        name: tag.name,
      }));
    categories.value = [
      { id: 0, name: t("verse.publicPage.allCategory") },
      ...classifyTags,
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
  handleSearch(searchValue.value);
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
  background: #f8fafc;
  padding: 12px 20px;
  margin-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;

  .toolbar-main {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .hero-subtitle {
    font-size: 14px;
    line-height: 1.5;
    color: #64748b;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hero-search-box {
    position: relative;
    width: 280px;
    flex-shrink: 0;

    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 18px;
    }

    .hero-search-input {
      width: 100%;
      height: 42px;
      padding: 0 12px 0 44px;
      border: 1px solid #e2e8f0;
      border-radius: 21px;
      background: #fff;
      font-size: 14px;
      color: #1e293b;
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &::placeholder {
        color: #94a3b8;
      }

      &:focus {
        border-color: #03a9f4;
        box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.1);
      }
    }
  }

  .category-filter {
    flex-shrink: 0;

    .filter-btn {
      height: 42px;
      padding: 0 16px;
      border: 1px solid #e2e8f0;
      border-radius: 21px;
      background: #fff;
      color: #334155;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;

      &:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
      }
    }

    .filter-icon {
      color: #64748b;
      font-size: 14px;
    }

    .filter-arrow {
      color: #94a3b8;
      font-size: 12px;
    }
  }
}

.list-view {
  padding: 0 20px 12px;

  :deep(.col-checkbox) {
    width: 40px;
  }

  .item-thumb {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    overflow: hidden;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
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

  .item-name {
    font-size: 14px;
    font-weight: 500;
    color: #1e293b;
  }

  .col-author,
  .col-date {
    width: 120px;
    text-align: right;
    font-size: 13px;
    color: #64748b;
    padding-right: 24px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-hover-action {
    opacity: 0;
    visibility: hidden;
    height: 28px;
    padding: 0 16px;
    margin-left: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    font-size: 12px;
    background: #03a9f4;
    border: none;
    color: white;
    transition: all 0.25s ease;

    &:hover {
      background: #039be5;
    }
  }

  :deep(.list-row:hover) {
    .btn-hover-action {
      opacity: 1;
      visibility: visible;
    }
  }
}

.verse-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

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
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary, #64748b);
  margin: 0;
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
