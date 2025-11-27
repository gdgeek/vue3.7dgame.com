<template>
  <div class="image-selector">
    <!-- 1. 资源对话框 -->
    <resource-dialog :multiple="false" @selected="onResourceSelected" ref="resourceDialog" />

    <!-- 2. 图片展示区域 -->
    <div class="image-display" @click="showImageSelectDialog">
      <el-image fit="contain" style="width:100%;height:300px" :src="internalUrl" />
    </div>

    <!-- 3. 选择方式弹窗 -->
    <el-dialog v-model="imageSelectDialogVisible" :title="$t('imageSelector.selectImageMethod')" width="30%"
      align-center>
      <div style="display:flex;justify-content:space-around;margin:10px 0">
        <el-button-group>
          <el-button type="primary" @click="openResourceDialog">
            {{ $t('imageSelector.selectFromResource') }}
          </el-button>
          <el-button type="success">
            <el-upload action="" :auto-upload="false" :show-file-list="false" :on-change="handleLocalUpload"
              accept="image/jpeg,image/gif,image/png,image/bmp">
              {{ $t('imageSelector.uploadLocal') }}
            </el-upload>
          </el-button>
        </el-button-group>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, withDefaults, defineProps, defineEmits, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ResourceDialog from './ResourceDialog.vue'
import { useFileStore } from '@/store/modules/config'
import { postFile } from '@/api/v1/files'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadFiles } from 'element-plus'
import { CardInfo } from '@/utils/types'

const props = withDefaults(defineProps<{
  imageUrl?: string
  itemId: number
}>(), {
  imageUrl: ''
})

const emit = defineEmits<{
  (e: 'image-selected', data: { imageId: number; itemId: number; imageUrl?: string }): void
  (e: 'image-upload-success', data: { imageId: number; itemId: number; imageUrl?: string }): void
}>()

const { t } = useI18n()
const fileStore = useFileStore()
const resourceDialog = ref<InstanceType<typeof ResourceDialog> | null>(null)
const imageSelectDialogVisible = ref(false)

// 内部 URL，避免直接改写 props 引发循环更新
const internalUrl = ref('')
const defaultUrl = () => {
  const id = props.itemId % 100
  return new URL(`../../assets/images/items/${id}.webp`, import.meta.url).href
}

// 同步 props.imageUrl 到 internalUrl
watch(
  [() => props.imageUrl, () => props.itemId],
  ([newUrl]) => {
    internalUrl.value = newUrl || defaultUrl()
  },
  { immediate: true }
)

const showImageSelectDialog = () => {
  imageSelectDialogVisible.value = true
}

const openResourceDialog = () => {
  imageSelectDialogVisible.value = false
  resourceDialog.value?.openIt({ type: 'picture' })
}

const onResourceSelected = (data: CardInfo) => {
  emit('image-selected', {
    imageId: data.context.image_id,
    itemId: props.itemId,
    imageUrl: data.image?.url
  })
}

const handleLocalUpload = async (file: UploadFile) => {
  imageSelectDialogVisible.value = false
  // ... 校验 & 上传逻辑 ...
  const md5 = await fileStore.store.fileMD5(file.raw as File)
  const handler = await fileStore.store.publicHandler()
  // ... 上传完成后：
  const extension = file.name.substring(file.name.lastIndexOf('.'));
  const key = md5 + extension;
  const post = await postFile({
    md5,
    filename: file.name,
    size: file.size,
    type: file.raw?.type,
    key: key,
  })
  emit('image-upload-success', {
    imageId: post.data.id,
    itemId: props.itemId,
    imageUrl: post.data.url
  })
}
</script>

<style scoped>
.image-display {
  cursor: pointer;
  text-align: center;
  transition: opacity .3s;
}

.image-display:hover {
  opacity: .8;
}
</style>
