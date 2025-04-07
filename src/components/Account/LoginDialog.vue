<template>
  <el-dialog v-model="dialogVisible" :title="title" width="500px" destroy-on-close center @closed="handleDialogClosed">
    <div>
      <el-card style="width: 100%" shadow="never">
        <span>登录账号</span>
        <br />
        <br />
        <NamePassword @login-success="handleLoginSuccess" />
      </el-card>
      <br />
      <div style="width: 100%" shadow="never" class="apple-login-container">
        <Wechat />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import NamePassword from './NamePassword.vue';
import Wechat from './Wechat.vue';

const props = defineProps({
  title: {
    type: String,
    default: '用户登录'
  }
});

const emit = defineEmits(['dialog-closed']);

const dialogVisible = ref(false);

const openDialog = () => {
  dialogVisible.value = true;
};

const closeDialog = () => {
  dialogVisible.value = false;
};

const handleLoginSuccess = () => {
  dialogVisible.value = false;
  ElMessage.success('登录成功！');
};

const handleDialogClosed = () => {
  emit('dialog-closed');
};

defineExpose({
  openDialog,
  closeDialog
});
</script>

<style scoped lang="scss">
.apple-login-container {
  justify-content: center;
  width: 100%;
}
</style>