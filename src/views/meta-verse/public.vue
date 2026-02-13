<template>
  <TransitionWrapper>
    <div class="verse-public">
      <!-- Custom Hero Header -->
      <div class="hero-header">
        <div class="header-main">
          <div class="title-section">
            <h1 class="hero-title">场景示例</h1>
            <p class="hero-subtitle">从我们精心设计的示例开始，快速启动您的下一个 AR 项目。</p>
          </div>
          <div class="search-section">
            <div class="hero-search-box">
              <span class="material-symbols-outlined search-icon">search</span>
              <input v-model="searchValue" type="text" class="hero-search-input" placeholder="搜索示例..."
                @keyup.enter="handleHeroSearch" />
            </div>
          </div>
        </div>

        <div class="header-tabs">
          <div v-for="tab in categories" :key="tab.id" class="tab-item" :class="{ active: currentTab === tab.id }"
            @click="selectTab(tab.id)">
            {{ tab.name }}
          </div>
        </div>
      </div>

      <ViewContainer class="list-view" :items="items" :view-mode="viewMode" :loading="loading"
        :breakpoints="cardBreakpoints" @row-click="openDetail">
        <template #grid-card="{ item }">
          <StandardCard :image="item.image?.url" :title="item.name || '未命名'" :description="item.description"
            :meta="{ author: item.author?.nickname || item.author?.username, date: formatItemDate(item.created_at) }"
            action-text="查看此示例" action-icon="visibility" type-icon="layers" placeholder-icon="landscape"
            :show-checkbox="false" aspect-ratio="1.6 / 1" @view="openDetail(item)" @action="goToScene(item)" />
        </template>

        <template #list-header>
          <div class="col-checkbox"></div>
          <div class="col-name">场景名称</div>
          <div class="col-author">作者</div>
          <div class="col-date">修改日期</div>
          <div class="col-actions"></div>
        </template>

        <template #list-item="{ item }">
          <div class="col-checkbox"></div>
          <div class="col-name">
            <div class="item-thumb">
              <img v-if="item.image?.url" :src="item.image.url" :alt="item.name" />
              <div v-else class="thumb-placeholder"><span class="material-symbols-outlined">layers</span></div>
            </div>
            <span class="item-name">{{ item.name || '—' }}</span>
            <el-button class="btn-hover-action" type="primary" @click.stop="openDetail(item)">
              {{ $t("common.open") }}
            </el-button>
          </div>
          <div class="col-author">{{ item.author?.nickname || item.author?.username || '—' }}</div>
          <div class="col-date">{{ formatItemDate(item.created_at) }}</div>
          <div class="col-actions" @click.stop>
            <el-button type="primary" size="small" @click="openDetail(item)">
              {{ $t("common.open") }}
            </el-button>
          </div>
        </template>
      </ViewContainer>

      <PagePagination :current-page="pagination.current" :total-pages="totalPages" @page-change="handlePageChange" />

      <!-- Detail Panel -->
      <DetailPanel v-model="detailVisible" title="场景详情" :name="currentVerse?.name || ''" :loading="detailLoading"
        :properties="detailProperties" placeholder-icon="landscape" width="560px" :show-delete="false"
        action-layout="stacked" :secondary-action="false" download-text="查看此示例" @download="handleGoToPage"
        @close="handlePanelClose">
        <template #preview>
          <div class="verse-preview">
            <img v-if="currentVerse?.image?.url" :src="currentVerse.image.url" :alt="currentVerse.name" />
            <div v-else class="preview-placeholder">
              <span class="material-symbols-outlined">landscape</span>
            </div>
          </div>
        </template>
        <template #info>
          <div class="verse-detail-info">
            <!-- DescriptionSection -->
            <div class="info-section">
              <div class="section-header">场景简介</div>
              <p class="description-text">{{ currentVerse?.description || '暂无简介' }}</p>
            </div>

            <!-- Tags Section -->
            <div class="info-section">
              <div class="section-header">场景标签</div>
              <div v-if="currentVerse?.tags?.length || currentVerse?.verseTags?.length" class="tag-list">
                <el-tag v-for="tag in (currentVerse.tags || currentVerse.verseTags)" :key="tag.id" class="mr-2 mb-2">
                  {{ tag.name }}
                </el-tag>
              </div>
              <div v-else class="empty-tags">暂无标签</div>
            </div>
          </div>
        </template>
      </DetailPanel>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ViewContainer, PagePagination, StandardCard, DetailPanel } from "@/components/StandardPage";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { getPublic, getVerse } from "@/api/v1/verse";
import { getTags } from "@/api/v1/tags";
import { usePageData } from "@/composables/usePageData";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import { ElMessage } from "element-plus";

const { t } = useI18n();
const router = useRouter();

const searchValue = ref("");
const categories = ref<{ id: number; name: string }[]>([
  { id: 0, name: "全部" },
]);
const currentTab = ref(0);

// 从 API 加载标签分类
onMounted(async () => {
  try {
    const res = await getTags();
    const classifyTags = res.data
      .filter((tag: any) => tag.type === "Classify")
      .map((tag: any) => ({ id: tag.id, name: tag.name }));
    categories.value = [{ id: 0, name: "全部" }, ...classifyTags];
  } catch (e) {
    console.error("Failed to load tags:", e);
  }
});

const {
  items, loading, pagination, viewMode, totalPages,
  refresh, handleSearch, handleSortChange, handlePageChange, handleViewChange, handleTagsChange,
} = usePageData({
  fetchFn: async (params) => await getPublic({
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
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

// Detail Panel Logic
const detailVisible = ref(false);
const detailLoading = ref(false);
const currentVerse = ref<any | null>(null);

const detailProperties = computed(() => {
  if (!currentVerse.value) return [];
  return [
    { label: '类型', value: '场景' },
    { label: '作者', value: currentVerse.value.author?.nickname || currentVerse.value.author?.username || '—' },
    { label: '修改时间', value: currentVerse.value.updated_at ? convertToLocalTime(currentVerse.value.updated_at) : '—' },
  ];
});

const openDetail = async (item: any) => {
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

const goToScene = (item: any) => {
  const title = encodeURIComponent(`场景【${item.name || '未命名'}】`);
  router.push({ path: "/verse/scene", query: { id: item.id, title } });
};
</script>

<style scoped lang="scss">
.hero-header {
  background: #f8fafc;
  padding: 48px 48px 0;
  margin-bottom: 32px;
  border-bottom: 1px solid #e2e8f0;

  .header-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
  }

  .hero-title {
    font-size: 36px;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 16px;
    letter-spacing: -0.02em;
  }

  .hero-subtitle {
    font-size: 16px;
    line-height: 1.6;
    color: #64748b;
    margin: 0;
    max-width: 600px;
  }

  .hero-search-box {
    position: relative;
    width: 320px;

    .search-icon {
      position: absolute;
      left: 18px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 20px;
    }

    .hero-search-input {
      width: 100%;
      height: 52px;
      padding: 0 12px 0 52px;
      border: 1.5px solid #e2e8f0;
      border-radius: 26px;
      background: #fff;
      font-size: 15px;
      color: #1e293b;
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &::placeholder {
        color: #94a3b8;
      }

      &:focus {
        border-color: #03a9f4;
        box-shadow: 0 0 0 4px rgba(3, 169, 244, 0.1);
      }
    }
  }

  .header-tabs {
    display: flex;
    gap: 40px;

    .tab-item {
      padding: 0 4px 16px;
      font-size: 16px;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;

      &:hover {
        color: #1e293b;
      }

      &.active {
        color: #03a9f4;
        font-weight: 600;

        &::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 3px;
          background: #03a9f4;
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

  .material-symbols-outlined {
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
