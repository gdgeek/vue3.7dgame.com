<template>
  <TransitionWrapper>
    <CardListPage ref="cardListPageRef" :fetch-data="fetchPrefabs" wrapper-class="root" @refresh="handleRefresh">
      <template #header-actions>
        <el-button-group :inline="true">
          <el-button v-if="isRoot" size="small" type="primary" @click="addPrefab">
            <font-awesome-icon icon="plus"></font-awesome-icon>
            <span class="hidden-sm-and-down">{{ $t("meta.title") }}</span>
          </el-button>
        </el-button-group>
      </template>

      <template #card="{ item }">
        <el-card style="width: 320px" class="box-card">
          <template #header>
            <div>
              <el-card shadow="hover" :body-style="{ padding: '0px' }">
                <template #header>
                  <span class="mrpp-title">
                    <b class="card-title" nowrap>{{ item.name }}</b>
                  </span>
                </template>
                <router-link :to="url(item.id)">
                  <Id2Image :image="item.image ? item.image.url : null" :id="item.id" />
                </router-link>
              </el-card>
            </div>
          </template>
          <div class="clearfix">
            <el-button-group v-if="isRoot" style="float: right" :inline="true">
              <el-button @click="editor(item.id)" size="small" type="success" icon="Edit">
                {{ $t("meta.edit") }}
              </el-button>
              <el-button @click="del(item.id)" size="small" type="danger" icon="Delete">
                {{ $t("meta.delete") }}
              </el-button>
            </el-button-group>
          </div>
          <div class="bottom clearfix"></div>
        </el-card>
        <br />
      </template>
    </CardListPage>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import CardListPage from '@/components/MrPP/CardListPage/index.vue';
import Id2Image from '@/components/Id2Image.vue';
import TransitionWrapper from '@/components/TransitionWrapper.vue';
import { getPrefabs, deletePrefab } from '@/api/v1/prefab';
import { useUserStore } from '@/store/modules/user';
import type { FetchParams, FetchResponse } from '@/components/MrPP/CardListPage/types';

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const cardListPageRef = ref<InstanceType<typeof CardListPage> | null>(null);

const isRoot = computed(() => userStore.getRole() === userStore.RoleEnum.Root);

const fetchPrefabs = async (params: FetchParams): Promise<FetchResponse> => {
  return await getPrefabs(params.sort, params.search, params.page);
};

const handleRefresh = (data: any[]) => { };

const refreshList = () => {
  cardListPageRef.value?.refresh();
};

const url = (id: number) => {
  return `/meta-verse/prefab?id=${id}`;
};

const addPrefab = () => {
  router.push('/meta-verse/prefab');
};

const editor = (id: number) => {
  router.push({ path: '/meta-verse/prefab', query: { id } });
};

const del = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      t('meta.confirm.message1'),
      t('meta.confirm.message2'),
      {
        confirmButtonText: t('meta.confirm.confirm'),
        cancelButtonText: t('meta.confirm.cancel'),
        closeOnClickModal: false,
        type: 'warning',
      }
    );
    await deletePrefab(id);
    refreshList();
    ElMessage.success(t('meta.confirm.success'));
  } catch {
    ElMessage.info(t('meta.confirm.info'));
  }
};
</script>

<style scoped>
.root {
  padding: 20px;
}

.mrpp-title {
  font-size: 15px;
  padding: 0px 0px 0px 0px;
}

.card-title {
  white-space: nowrap;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
}

.clearfix {
  display: flex;
  justify-content: flex-end;
}
</style>
