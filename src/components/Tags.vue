<template>

  <div v-if="list" class="flex gap-2">
    <el-tag v-for="tag in tags" :key="tag.name" closable @close="close(tag.id)">
      {{ tag.name }}
    </el-tag>
    <el-select-v2 @change="handleChange" v-model="value" size="small" :options="options" placeholder="添加标签"
      style="width:240px" />

  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

import { getTags } from '@/api/v1/tags'

import type { TagProps } from 'element-plus'
import { id } from 'element-plus/es/locale'

const list: Ref<null | []> = ref(null)
const props = defineProps({
  verseTags: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['add', 'remove'])
const value = ref()
interface TagsItem {
  name: string
  type: TagProps['type']
}
const close = (id: number) => {
  console.log('删除标签:', id)
  emit('remove', id)
}
const data = computed(() => {
  return props.verseTags.map((item: any) => {

    return item.tags_id;
  })

});
const options = computed(() => {
  // 筛选出id在props.data中的数据项
  if (list.value === null) return []

  return list.value
    .filter((item: any) => { return !data.value.includes(item.id); })
    .map((item: any) => {
      return {
        label: item.name,
        value: item.id
      }
    })
})
const tags = computed(() => {
  if (list.value === null) return []
  // 首先筛选出id在props.data中的数据项
  return list.value
    .filter((item: any) => { return data.value.includes(item.id); })
    .map((item: any) => {
      return {
        name: item.name,
        id: item.id
      }
    })
})


const handleChange = (val: any) => {

  console.log('选择完毕，选中的标签:', val)
  emit('add', val)

  value.value = null;
  //emit('tagsChange', val)
}
onMounted(() => {
  getTags().then(res => {
    list.value = res.data;


  })
})
</script>
