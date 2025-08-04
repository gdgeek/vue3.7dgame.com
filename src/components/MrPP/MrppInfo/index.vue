<template>
  <el-card class="box-card">
    <template #header>
      <b>{{ title }}</b>{{ titleSuffix }}
    </template>
    <div class="box-item">
      <el-table :data="tableData" stripe>
        <el-table-column prop="item" :label="itemLabel"></el-table-column>
        <el-table-column prop="text" :label="textLabel"></el-table-column>
      </el-table>

      <aside style="margin-top: 10px; margin-bottom: 30px">
        <el-button-group style="float: right">
          <!-- 下载按钮 -->
          <el-button v-if="showDownload" type="primary" size="small" @click="downloadAction">
            <i class="el-icon-download"></i>
            {{ downloadText }}
          </el-button>

          <!-- 重命名按钮 -->
          <el-button type="success" size="small" @click="renameAction">
            <i class="el-icon-edit"></i>
            {{ renameText }}
          </el-button>

          <!-- 删除按钮 -->
          <el-button type="danger" size="small" @click="deleteAction">
            <i class="el-icon-delete"></i>
            {{ deleteText }}
          </el-button>
        </el-button-group>
      </aside>

      <!-- 额外内容插槽 -->
      <slot name="additional-content"></slot>
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  titleSuffix: {
    type: String,
    default: ''
  },
  tableData: {
    type: Array,
    required: true
  },
  itemLabel: {
    type: String,
    required: true
  },
  textLabel: {
    type: String,
    required: true
  },
  showDownload: {
    type: Boolean,
    default: true
  },
  downloadText: {
    type: String,
    required: true
  },
  renameText: {
    type: String,
    required: true
  },
  deleteText: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['download', 'rename', 'delete']);

const downloadAction = () => {
  emit('download');
};

const renameAction = () => {
  emit('rename');
};

const deleteAction = () => {
  emit('delete');
};
</script>

<style lang="scss" scoped>
.box-card {
  width: 100%;
  margin-bottom: 20px;
}
</style>
