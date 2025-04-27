<template>


  <span class="hidden-sm-and-down">

    <el-select-v2 v-model="value" @change="handleChange" size="small" :options="options" placeholder="标签"
      style="width:240px" multiple />



  </span>
  <span class="hidden-md-and-up">
    <el-select-v2 v-model="value" @change="handleChange" size="small" :options="options" placeholder="标签"
      style="width:100px" multiple collapse-tags />
  </span>



</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { getTags } from '@/api/v1/tags'
const emit = defineEmits(['tagsChange'])
import { onMounted, Ref } from 'vue'

const value = ref([])
const lastValue = ref(JSON.stringify([]))

const handleChange = (val: any) => {
  console.log('选择完毕，选中的标签:', val)
  emit('tagsChange', val)
}

// 处理下拉框显示状态变化
const handleVisibleChange = (visible: boolean) => {
  // 当下拉框关闭且值有变化时执行
  if (!visible && JSON.stringify(value.value) !== lastValue.value) {
    console.log('选择完毕，选中的标签:', value.value)
    // 在这里添加你想要执行的代码
    // 例如调用API、更新其他数据等
    emit('tagsChange', value.value)
    // 更新上次的值
    lastValue.value = JSON.stringify(value.value)
  }
}
const options: Ref<OptionType[]> = ref([])
//vue3 初始化调用
onMounted(() => {
  getTags().then(res => {
    options.value = res.data.map((item: any) => {
      return {
        label: item.name,
        value: item.id
      }
    })

  })
})
</script>
