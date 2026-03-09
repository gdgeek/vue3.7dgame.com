<template>
  <TransitionWrapper>
    <div class="verse-public">
      <!-- Custom Hero Header -->
      <div class="hero-header">
        <div class="header-main">
          <div class="title-section">
            <h1 class="hero-title">
              {{ t("verse.publicPage.examplesTitle") }}
            </h1>
            <p class="hero-subtitle">
              {{ t("verse.publicPage.examplesSubtitle") }}
            </p>
          </div>
          <div class="search-section">
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
          </div>
        </div>

        <div class="header-tabs">
          <div
            v-for="tab in categories"
            :key="tab.id"
            class="tab-item"
            :class="{ active: currentTab === tab.id }"
            @click="selectTab(tab.id)"
          >
            {{ tab.name }}
          </div>
        </div>
      </div>

      <ViewContainer
        class="list-view"
        :items="items"
        :view-mode="viewMode"
        :loading="loading"
        :breakpoints="cardBreakpoints"
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

const { t } = useI18n();
const router = useRouter();

const searchValue = ref("");
const categories = ref<{ id: number; name: string }[]>([
  { id: 0, name: t("verse.publicPage.allCategory") },
]);
const currentTab = ref(0);

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
      tags: params.tags,
      expand: "image,author,tags",
    }),
});

const cardBreakpoints = {
  4000: { rowPerView: 4 },
  1200: { rowPerView: 4 },
  800: { rowPerView: 3 },
  500: { rowPerView: 2 },
  300: { rowPerView: 1 },
};

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
  padding: 48px 48px 0;
  margin-bottom: 32px;
  background: var(--bg-card, #f8fafc);
  border-bottom: 1px solid var(--border-color, #e2e8f0);

  .header-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 40px;
  }

  .hero-title {
    margin: 0 0 16px;
    font-size: 36px;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
    letter-spacing: -0.02em;
  }

  .hero-subtitle {
    max-width: 600px;
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-secondary, #64748b);
  }

  .hero-search-box {
    position: relative;
    width: 320px;

    .search-icon {
      position: absolute;
      top: 50%;
      left: 18px;
      font-size: 20px;
      color: var(--text-muted, #94a3b8);
      transform: translateY(-50%);
    }

    .hero-search-input {
      width: 100%;
      height: 52px;
      padding: 0 12px 0 52px;
      font-size: 15px;
      color: var(--text-primary, #1e293b);
      background: var(--bg-page, #fff);
      border: 1.5px solid var(--border-color, #e2e8f0);
      border-radius: 26px;
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &::placeholder {
        color: var(--text-muted, #94a3b8);
      }

      &:focus {
        border-color: var(--primary-color, #03a9f4);
        box-shadow: 0 0 0 4px var(--primary-light, rgb(3 169 244 / 10%));
      }
    }
  }

  .header-tabs {
    display: flex;
    gap: 40px;

    .tab-item {
      position: relative;
      padding: 0 4px 16px;
      font-size: 16px;
      font-weight: 500;
      color: var(--text-secondary, #64748b);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        color: var(--text-primary, #1e293b);
        background: var(--bg-hover, transparent);
      }

      &.active {
        font-weight: 600;
        color: var(--primary-color, #03a9f4);

        &::after {
          position: absolute;
          right: 0;
          bottom: -1px;
          left: 0;
          height: 3px;
          content: "";
          background: var(--primary-color, #03a9f4);
          border-radius: 3px 3px 0 0;
        }
      }
    }
  }
}

.list-view {
  padding: 0 48px 48px;

  :deep(.col-checkbox) {
    width: 40px;
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
    border-radius: 12px;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .item-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #1e293b);
  }

  .col-author,
  .col-date {
    width: 120px;
    padding-right: 24px;
    overflow: hidden;
    font-size: 13px;
    color: var(--text-secondary, #64748b);
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-hover-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    padding: 0 16px;
    margin-left: 8px;
    font-size: 12px;
    color: var(--text-inverse, white);
    visibility: hidden;
    background: var(--primary-color, #03a9f4);
    border: none;
    border-radius: 14px;
    opacity: 0;
    transition: all 0.25s ease;

    &:hover {
      background: var(--primary-hover, #039be5);
    }
  }

  :deep(.list-row:hover) {
    .btn-hover-action {
      visibility: visible;
      opacity: 1;
    }
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
