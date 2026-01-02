<template>
  <div class="news-section" :class="{ 'dark-theme': isDark }">
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <h2 class="section-title">{{ item?.label }}</h2>
        <p class="section-subtitle">{{ item?.describe }}</p>
      </div>

      <div class="news-tabs-wrapper" data-aos="fade-up">
        <el-tabs v-model="activeTabName" class="news-tabs" @tab-click="handleTabClick">

          <el-tab-pane v-for="(item, index) in items" :key="index" :label="item.label" :name="item.key">

            <div v-if="loading" class="news-loading">
              <el-skeleton :rows="3" animated />
              <el-skeleton :rows="3" animated style="margin-top: 20px" />
              <el-skeleton :rows="3" animated style="margin-top: 20px" />
            </div>
            <div v-else-if="error" class="news-error">
              <el-empty :description="$t('web.news.loadFailed')" />
            </div>
            <div v-else class="news-timeline">
              <el-timeline>
                <el-timeline-item v-for="(article, aIndex) in displayNewsData" :key="article.id"
                  :timestamp="formatDate(article.date)" :type="isNewest(article.date) ? 'primary' : 'info'"
                  :hollow="!isNewest(article.date)" placement="top" :color="getTimelineColor(article.date)"
                  :size="isNewest(article.date) ? 'large' : 'normal'">
                  <div class="timeline-card" :class="{ 'newest-article': isNewest(article.date) }" data-aos="fade-up"
                    :data-aos-delay="aIndex * 50" @click="openArticleDetails(article)">
                    <div class="card-content" :class="{ 'with-image': article.jetpack_featured_media_url }">
                      <div class="article-meta">
                        <el-tag size="small" effect="plain" class="category-tag">
                          {{ item?.label }}
                        </el-tag>
                        <span class="article-date">{{ formatRelativeTime(article.date) }}</span>
                        <el-tag v-if="isNewest(article.date, aIndex)" size="small" type="success" effect="plain"
                          class="newest-tag" style="margin-left: 12px;">
                          {{ $t('web.news.newest') }}
                        </el-tag>
                      </div>
                      <h3 class="article-title" :innerHTML="sanitizeHtml(article.title.rendered)"></h3>
                      <div class="article-excerpt" :innerHTML="sanitizeHtml(article.excerpt.rendered)"></div>

                      <div class="article-actions">
                        <span class="read-more">{{ $t('web.news.readMore') }} <el-icon>
                            <ArrowRight />
                          </el-icon></span>
                      </div>
                    </div>
                    <div v-if="article.jetpack_featured_media_url" class="card-image">
                      <img :src="article.jetpack_featured_media_url" :alt="sanitizeText(article.title.rendered)" />
                    </div>
                  </div>
                </el-timeline-item>
              </el-timeline>

              <div class="news-pagination" v-if="pagination.count > 1 && !showAllNews">
                <el-pagination v-model:current-page="pagination.current" :page-size="pagination.size"
                  :total="pagination.total" layout="prev, pager, next" background @current-change="handlePageChange" />
              </div>

              <div class="news-more" v-if="newsData.length > 2 && !showAllNews" data-aos="fade-up">
                <el-button type="primary" @click="showAllContent" class="expand-button" round>
                  {{ $t('web.news.expandAll') }}{{ item?.label }}
                  <el-icon class="el-icon--right">
                    <ArrowDown />
                  </el-icon>
                </el-button>
              </div>

              <div class="news-more" v-if="showAllNews" data-aos="fade-up">
                <el-button type="primary" @click="hideAllContent" class="expand-button" round>
                  {{ $t('web.news.collapseAll') }}{{ item?.label }}
                  <el-icon class="el-icon--right">
                    <ArrowUp />
                  </el-icon>
                </el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 文章详情弹窗 -->
    <el-dialog v-model="dialogVisible"
      :title="selectedArticle?.title?.rendered ? sanitizeText(selectedArticle.title.rendered) : $t('web.news.articleDetail')"
      width="800px" top="50px" destroy-on-close fullscreen :class="{ 'dark-theme': isDark }">
      <div v-if="articleLoading" class="article-loading">
        <el-skeleton :rows="10" animated />
      </div>
      <div v-else-if="articleError" class="article-error">
        <el-result icon="error" :title="$t('web.news.loadArticleFailed')"
          :sub-title="$t('web.news.loadArticleFailedDesc')"></el-result>
      </div>
      <div v-else-if="articleContent" class="article-detail">
        <div class="article-meta-detail">
          <div class="article-tags">
            <el-tag v-for="(tag, index) in articleTerms" :key="index" size="small" effect="plain" class="article-tag">
              {{ tag.name }}
            </el-tag>
          </div>
          <div class="article-date-detail">
            {{ formatDate(articleContent.date) }}
          </div>
        </div>

        <div class="article-content" :innerHTML="sanitizeHtml(articleContent.content.rendered)"></div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">{{ $t('web.news.close') }}</el-button>
          <el-button v-if="articleContent" type="primary" @click="shareArticle">{{ $t('web.news.share') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "@/store/modules/settings";
import { Posts, Article, getCategory } from "@/api/home/wordpress";
import DOMPurify from "dompurify";
import { dayjs, formatDate as formatDateUtil } from "@/utils/dayjs";
import { ElMessage } from 'element-plus';
import AOS from 'aos';
import 'aos/dist/aos.css';

const { t } = useI18n();

// 获取主题设置
const settingsStore = useSettingsStore();
const isDark = computed(() => settingsStore.theme === 'dark');

const route = useRoute();
const router = useRouter();

// 分类标签
const items = computed(() => [
  { label: t('web.news.newsCategory'), type: "category", id: 74, key: "news", describe: t('web.news.relatedContent') },
  { label: t('web.news.tutorialCategory'), type: "category", id: 79, key: "tutorial", describe: t('web.news.videoTutorial') },
]);


//activeTabName属性，默认为news
const props = defineProps({
  activeTabName: {
    type: String,
    default: "news"
  }
});
// 激活的标签
const activeTabName = ref(props.activeTabName);


const item = computed(() => {
  return items.value.find(item => item.key === activeTabName.value);
})
// 新闻数据
const newsData = ref<any[]>([]);
const loading = ref(false);
const error = ref(false);

// 文章详情
const dialogVisible = ref(false);
const selectedArticle = ref<any>(null);
const articleContent = ref<any>(null);
const articleTerms = ref<any[]>([]);
const articleLoading = ref(false);
const articleError = ref(false);

// 分页信息
const pagination = ref({
  current: 1,
  count: 0,
  size: 5,
  total: 0
});

// 是否显示全部内容
const showAllNews = ref(false);

// 用于显示的新闻数据
const displayNewsData = computed(() => {
  if (showAllNews.value) {
    return newsData.value;
  } else {
    // 默认展示前2条
    return newsData.value.slice(0, 2);
  }
});

// 初始化并加载数据
onMounted(() => {
  // 初始化AOS动画
  AOS.init({
    duration: 800,
    once: false
  });

  /*
  // 从URL查询参数中确定活跃标签
  const tabParam = route.query.tab;
  if (tabParam === 'tutorial') {
    activeTabName.value = '1';
  }*/

  // 加载初始数据
  loadNewsData();
});

// 监视标签变化，重新加载数据
watch(() => activeTabName.value, () => {
  pagination.value.current = 1;
  showAllNews.value = false;
  loadNewsData();
});

// 安全处理HTML内容
const sanitizeHtml = (html: string) => {
  return html ? DOMPurify.sanitize(html) : '';
};

// 清除HTML标签，仅保留文本
const sanitizeText = (html: string) => {
  const temp = document.createElement('div');
  temp.innerHTML = sanitizeHtml(html);
  return temp.textContent || temp.innerText || '';
};


// 加载新闻数据
const loadNewsData = async () => {
  loading.value = true;
  error.value = false;

  try {

    const categoryId = item.value!.id;
    const response = await Posts(
      categoryId,
      pagination.value.size,
      pagination.value.current
    );

    newsData.value = response.data;

    // 更新分页信息
    pagination.value = {
      current: pagination.value.current,
      count: parseInt(response.headers["x-wp-totalpages"] || '0'),
      size: pagination.value.size,
      total: parseInt(response.headers["x-wp-total"] || '0')
    };
  } catch (err) {
    console.error('加载新闻数据失败:', err);
    error.value = true;
  } finally {
    loading.value = false;
  }
};

// 处理标签点击
const handleTabClick = () => {

  // 标签切换时重置分页
  pagination.value.current = 1;

};

// 处理页码变化
const handlePageChange = (page: number) => {
  pagination.value.current = page;
  loadNewsData();

  // 滚动到新闻区域顶部
  const newsSection = document.querySelector('.news-section');
  if (newsSection) {
    newsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// 格式化日期
const formatDate = (dateString: string) => {
  return formatDateUtil(dateString);
};

// 格式化相对时间
const formatRelativeTime = (dateString: string) => {
  const date = dayjs(dateString);
  const now = dayjs();
  const diffDays = now.diff(date, 'day');

  if (diffDays < 1) {
    return t('web.news.today');
  } else if (diffDays < 2) {
    return t('web.news.yesterday');
  } else if (diffDays < 7) {
    return t('web.news.daysAgo', { n: diffDays });
  } else if (diffDays < 30) {
    return t('web.news.weeksAgo', { n: Math.floor(diffDays / 7) });
  } else {
    return date.format('YYYY-MM-DD');
  }
};

// 判断是否是最新的文章
const isNewest = (dateString: string, index?: number) => {
  // 如果提供了索引，判断是否是第一篇文章
  if (index !== undefined) {
    return index === 0; // 第一篇文章认为是最新的
  }

  // 向后兼容：如果没有提供索引，仍然使用日期判断
  const articleDate = dayjs(dateString);
  const now = dayjs();
  return now.diff(articleDate, 'day') < 7; // 7天内发布的认为是最新
};

// 获取时间线颜色
const getTimelineColor = (dateString: string) => {
  if (isNewest(dateString)) {
    // 最新文章使用主色调
    return '#00dbde';
  }
  // 使用渐变灰色来表示时间流逝
  const articleDate = dayjs(dateString);
  const now = dayjs();
  const diffDays = now.diff(articleDate, 'day');

  if (diffDays < 30) {
    return '#409EFF';
  } else if (diffDays < 90) {
    return '#67C23A';
  } else if (diffDays < 180) {
    return '#E6A23C';
  } else {
    return '#909399';
  }
};

// 打开文章详情弹窗
const openArticleDetails = async (article: any) => {
  // 如果文章已经被选中，则直接打开弹窗

  router.push("/web/document?id=" + article.id);

  return;
  /*
  selectedArticle.value = article;
  dialogVisible.value = true;
  articleLoading.value = true;
  articleError.value = false;
  articleContent.value = null;

  try {
    const response = await Article(article.id);
    articleContent.value = response.data;

    // 提取文章分类标签
    if (response.data._embedded && response.data._embedded['wp:term'] && response.data._embedded['wp:term'][0]) {
      articleTerms.value = response.data._embedded['wp:term'][0];
    } else {
      articleTerms.value = [];
    }
  } catch (err) {
    console.error('加载文章详情失败:', err);
    articleError.value = true;
  } finally {
    articleLoading.value = false;
  }*/
};

// 分享文章
const shareArticle = () => {
  if (selectedArticle.value) {
    // 分享功能
    ElMessage.info(t('web.news.shareInProgress'));
  }
};

// 显示全部内容
const showAllContent = async () => {
  // 如果数据不足，先加载全部数据
  if (newsData.value.length < pagination.value.total) {
    loading.value = true;
    try {
      const categoryId = item.value!.id;

      // 加载全部数据
      const response = await Posts(
        categoryId,
        pagination.value.total, // 请求全部数据
        1
      );

      newsData.value = response.data;
    } catch (err) {
      console.error('加载全部新闻数据失败:', err);
      ElMessage.error('加载全部内容失败，请稍后再试');
    } finally {
      loading.value = false;
    }
  }

  // 设置为显示全部
  showAllNews.value = true;

  // 滚动到底部
  setTimeout(() => {
    const newsMore = document.querySelector('.news-more');
    if (newsMore) {
      newsMore.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, 100);
};

// 隐藏全部内容
const hideAllContent = () => {
  showAllNews.value = false;

  // 滚动到顶部
  const newsSection = document.querySelector('.news-section');
  if (newsSection) {
    newsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// 在组件卸载时
onUnmounted(() => {
  // 任何需要清理的内容
});

// 组件选项
defineOptions({
  name: "News",
});
</script>

<style lang="scss" scoped>
.news-section {
  padding: 100px 0;
  background-color: #f9fafb;
  position: relative;
  overflow: hidden;

  &.dark-theme {
    background-color: #121212;
    color: #f9fafb;

    .section-title {
      color: #f3f4f6;

      &:after {
        background: linear-gradient(90deg, #00dbde, #9e9e9e);
      }
    }

    .section-subtitle {
      color: #9ca3af;
    }

    .news-tabs {
      :deep(.el-tabs__nav-wrap::after) {
        background-color: rgba(255, 255, 255, 0.1);
      }

      :deep(.el-tabs__item) {
        color: #9ca3af;

        &.is-active {
          color: #00dbde;
        }

        &:hover {
          color: #00dbde;
        }
      }
    }

    .timeline-card {
      background-color: #1e1e1e;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);

      &:hover {
        background-color: #2d2d2d;
      }

      &.newest-article {
        background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);

        &:before {
          background: linear-gradient(90deg, #00dbde, #b2b2b2);
        }
      }

      .article-title {
        color: #f3f4f6;
      }

      .article-excerpt {
        color: #9ca3af;
      }

      .read-more {
        color: #3894ff;
      }
    }
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;

  .section-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 16px;
    color: #1f2937;
    position: relative;
    display: inline-block;

    &:after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 4px;
      //background: linear-gradient(90deg, #00dbde, #adadad);
      background: linear-gradient(90deg, #7367f0, #00cfe8);
      border-radius: 2px;
    }
  }

  .section-subtitle {
    font-size: 1.1rem;
    color: #6b7280;
    max-width: 700px;
    margin: 0 auto;
  }
}

.news-tabs-wrapper {
  max-width: 900px;
  margin: 0 auto;
}

.news-tabs {
  margin-bottom: 40px;

  :deep(.el-tabs__header) {
    margin-bottom: 30px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
  }

  :deep(.el-tabs__item) {
    font-size: 1.1rem;
    font-weight: 500;
    padding: 0 20px 20px;
    height: 40px;
    line-height: 40px;
  }

  :deep(.el-tabs__active-bar) {
    height: 3px;
    border-radius: 3px;
    //background: linear-gradient(90deg, #00dbde, #bebebe);
    background: linear-gradient(90deg, #7367f0, #00cfe8);
  }
}

.news-timeline {
  position: relative;

  :deep(.el-timeline) {
    padding-left: 0;
  }

  :deep(.el-timeline-item__wrapper) {
    padding-left: 20px;
  }

  :deep(.el-timeline-item__timestamp) {
    font-size: 0.9rem;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 8px;
  }

  :deep(.el-timeline-item__node--normal) {
    left: 0;
  }

  :deep(.el-timeline-item:last-child .el-timeline-item__tail) {
    display: none;
  }
}

.timeline-card {
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  overflow: hidden;
  min-height: 160px;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);

    .read-more {
      text-decoration: underline;

      .el-icon {
        transform: translateX(4px);
      }
    }
  }
}

.card-content {
  flex: 1;

  &.with-image {
    width: 60%;
  }
}

.card-image {
  width: 38%;
  margin-left: 2%;
  overflow: hidden;
  border-radius: 8px;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  &:hover img {
    transform: scale(1.05);
  }
}

.article-meta {
  display: flex;
  align-items: center;
  margin-bottom: 16px;

  .category-tag {
    margin-right: 12px;
    border-radius: 4px;
  }

  .article-date {
    font-size: 0.85rem;
    color: #6b7280;
  }
}

.article-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1f2937;
  line-height: 1.4;
}

.article-excerpt {
  font-size: 1rem;
  color: #4b5563;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.6;

  :deep(p) {
    margin: 0;
  }
}

.article-actions {
  display: flex;
  justify-content: flex-end;

  .read-more {
    display: flex;
    align-items: center;
    color: #3894ff;
    font-size: 0.95rem;
    font-weight: 500;

    .el-icon {
      margin-left: 4px;
      transition: transform 0.3s ease;
    }
  }
}

.news-pagination {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

.news-more {
  text-align: center;

  .expand-button {
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
      opacity: 0.9;
    }

    .el-icon {
      margin-left: 8px;
      transition: transform 0.3s ease;
    }
  }
}

// 文章详情弹窗样式
.article-detail {
  padding: 20px;

  .article-meta-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;

    .article-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .article-date-detail {
      font-size: 0.9rem;
      color: #6b7280;
    }
  }

  .article-content {
    font-size: 1.1rem;
    line-height: 1.8;
    color: #374151;

    :deep(img) {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 20px 0;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
    }

    :deep(h2) {
      font-size: 1.8rem;
      margin: 30px 0 20px;
      font-weight: 600;
      color: #1f2937;
    }

    :deep(h3) {
      font-size: 1.5rem;
      margin: 25px 0 15px;
      font-weight: 600;
      color: #1f2937;
    }

    :deep(p) {
      margin: 20px 0;
    }

    :deep(ul, ol) {
      margin: 20px 0 20px 20px;
    }

    :deep(li) {
      margin-bottom: 10px;
    }

    :deep(a) {
      color: #3894ff;
      text-decoration: none;
      transition: all 0.3s ease;

      &:hover {
        color: #5dabff;
        text-decoration: underline;
      }
    }

    :deep(blockquote) {
      border-left: 4px solid #00dbde;
      padding: 15px 20px;
      background-color: #f9fafb;
      margin: 20px 0;
      font-style: italic;
      color: #4b5563;
    }

    :deep(code) {
      background-color: #f3f4f6;
      padding: 3px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
    }

    :deep(pre) {
      background-color: #1f2937;
      color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;

      code {
        background-color: transparent;
        color: inherit;
        padding: 0;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
}

// 加载和错误状态
.news-loading,
.news-error,
.article-loading,
.article-error {
  padding: 40px 0;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

// 移动端适配
@media screen and (max-width: 768px) {
  .news-section {
    padding: 60px 0;
  }

  .section-header {
    margin-bottom: 40px;

    .section-title {
      font-size: 2rem;
    }
  }

  .timeline-card {
    flex-direction: column;

    .card-content {
      width: 100% !important;
    }

    .card-image {
      width: 100%;
      margin-left: 0;
      margin-top: 20px;
      height: 180px;
    }
  }

  :deep(.el-dialog) {
    width: 90% !important;
  }

  .article-meta-detail {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

// 黑暗模式下的文章内容样式
.dark-theme {
  .article-content {
    color: #e5e7eb;

    :deep(h2),
    :deep(h3) {
      color: #f3f4f6;
    }

    :deep(blockquote) {
      background-color: #2d2d2d;
      color: #d1d5db;
    }

    :deep(code) {
      background-color: #374151;
      color: #e5e7eb;
    }

    :deep(pre) {
      background-color: #111827;
    }
  }
}
</style>
