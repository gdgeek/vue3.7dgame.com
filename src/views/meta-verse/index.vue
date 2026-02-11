<template>
  <TransitionWrapper>
    <div class="verse-index">
      <Page ref="pageRef" @loaded="loaded" :created="true">
        <template #header-actions>
          <el-button size="small" type="success" @click="importDialogVisible = true">
            <el-icon>
              <Upload />
            </el-icon>
            &nbsp;
            <span class="hidden-sm-and-down">导入场景</span>
          </el-button>
        </template>
      </Page>

      <ImportDialog v-model="importDialogVisible" @success="handleImportSuccess" />
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Upload } from "@element-plus/icons-vue";
import Page from "@/components/MrPP/MrPPVerse/MrPPVersePage.vue";
import { getVerses } from "@/api/v1/verse";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import ImportDialog from "@/components/ScenePackage/ImportDialog.vue";

const pageRef = ref<InstanceType<typeof Page> | null>(null);
const importDialogVisible = ref(false);

const loaded = async (data: any, result: Function) => {
  try {
    const response = await getVerses({
      sort: data.sorted,
      search: data.searched,
      page: data.current,
      expand: "image,author",
      tags: data.tags,
    });

    //console.error(response.data)
    const pagination = {
      current: parseInt(response.headers["x-pagination-current-page"]),
      count: parseInt(response.headers["x-pagination-page-count"]),
      size: parseInt(response.headers["x-pagination-per-page"]),
      total: parseInt(response.headers["x-pagination-total-count"]),
    };
    result({ data: response.data, pagination: pagination });
  } catch (error) {
    console.error(error);
  }
};

const handleImportSuccess = (_verseId: number) => {
  pageRef.value?.refresh();
};
</script>

<style scoped>
.verse-index {
  padding: 20px;
}
</style>
