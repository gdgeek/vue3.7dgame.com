<template>
  <div v-if="classify" class="flex gap-2">

    <el-tag v-for="tag in tags" :type="tag.type === 'Classify' ? 'primary' : 'success'" :key="tag.name"
      :closable="props.editable" @close="close(tag.id)">
      {{ tag.name }}
    </el-tag>
    <el-select-v2 v-if="props.editable" @change="handleChange" v-model="value" size="small" :options="classify"
      placeholder="添加标签" style="width:100px" />

    <el-switch v-if="props.editable && userStore.isUserPermissionGreater('admin')" size="small" v-model="public_"
      :loading="loading" :before-change="beforeChange" active-text="公开" inline-prompt inactive-text="私有" />

  </div>


</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useUserStore } from "@/store/modules/user";
import { getTags } from '@/api/v1/tags'
const userStore = useUserStore();



import type { TagProps } from 'element-plus'

const loading = ref(false)
const public_ = ref(false)

const beforeChange = (): Promise<boolean> => {
  loading.value = true
  return new Promise(async (resolve, reject) => {
    loading.value = false
    if (!public_.value) {
      emit('add', _public.value?.id, () => {
        resolve(true);
      }, reject)
    } else {
      emit('remove', _public.value?.id, () => {
        resolve(true);
      }, reject)
    }
  })
}

const props = defineProps({
  verseTags: {
    type: Array,
    default: () => []
  },
  editable: {
    type: Boolean,
    default: () => false
  }
})

const emit = defineEmits(['add', 'remove'])
const value = ref()
interface TagsItem {
  id: number
  name: string
  type: string
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


const _public = computed<TagsItem | null>(() => {
  if (list.value === null) return null;

  const filtered = list.value
    .filter((item: any) => { return (item.key === 'public'); })
    .map((item: any) => {
      return {
        name: item.name,
        id: item.id,
        type: item.type,
        key: item.key
      } as TagsItem
    });

  // 返回第一个元素，如果没有找到则返回 null
  return filtered.length > 0 ? filtered[0] : null;
});
const classify = computed(() => {
  if (list.value === null) return []
  return list.value
    .filter((item: any) => { return !data.value.includes(item.id) && (item.type === 'Classify'); })
    .map((item: any) => {
      return {
        label: item.name,
        value: item.id,
        key: item.key
      }
    })
})
const tags = computed(() => {
  if (list.value === null) return []

  return list.value
    .filter((item: any) => { return data.value.includes(item.id) && (item.type === 'Classify'); })
    .map((item: any) => {
      return {
        name: item.name,
        id: item.id,
        type: item.type
      }
    })
})


const handleChange = (val: any) => {

  console.log('选择完毕，选中的标签:', val)
  emit('add', val)
  value.value = null;
}


const list: Ref<null | []> = ref(null)
onMounted(async () => {
  const res = await getTags();
  list.value = res.data;
  const result = data.value.find((item: any) => {
    return item === _public.value?.id
  })
  if (result) {
    public_.value = true
  } else {
    public_.value = false
  }
})
</script>
