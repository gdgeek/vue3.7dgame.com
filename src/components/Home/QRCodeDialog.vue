<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      width="420px"
      align-center
      class="qrcode-dialog"
      :show-close="true"
    >
      <template #header>
        <div class="dialog-header-custom">
          <font-awesome-icon
            :icon="['fas', 'qrcode']"
            class="header-icon"
          ></font-awesome-icon>
          <span class="header-title">{{ t("login.loginCode") }}</span>
        </div>
      </template>
      <div class="qrcode-container">
        <div class="qrcode-wrapper">
          <div v-loading="code === ''" class="qrcode-box">
            <qrcode-vue
              v-if="code !== ''"
              :value="code"
              :size="260"
              level="H"
              class="qrcode-img"
            ></qrcode-vue>
          </div>
        </div>
        <p class="qrcode-tip">{{ t("login.scanTip") }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { logger } from "@/utils/logger";
import { ref, onMounted } from "vue";
import { getUserLinked } from "@/api/v1/tools";
import { useI18n } from "vue-i18n";
import QrcodeVue from "qrcode.vue";

const { t } = useI18n();
const dialogVisible = ref(false);
const code = ref<string>("");

const openDialog = () => {
  dialogVisible.value = true;
};

onMounted(async () => {
  try {
    const userLinked = await getUserLinked();
    if (userLinked?.data.key) {
      code.value = "web_" + userLinked.data.key;
    }
  } catch (error) {
    logger.error("Failed to initialize QR code:", error);
  }
});

defineExpose({
  openDialog,
});
</script>

<style lang="scss" scoped>
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 20px 48px;
}

.qrcode-box {
  padding: 10px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 8px);
}

.qrcode-tip {
  margin-top: 28px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #303133);
  text-align: center;
  letter-spacing: 0.5px;
}

.qrcode-subtip {
  margin-top: 10px;
  font-size: 14px;
  color: var(--text-secondary, #909399);
  text-align: center;
}

.dialog-header-custom {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-icon {
  font-size: 24px;
  color: var(--primary-color, #03a9f4);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #303133);
}
</style>

<style lang="scss">
.qrcode-dialog {
  overflow: hidden;
  background: var(--bg-card, #fff) !important;
  border-radius: var(--radius-xl, 24px) !important;
  box-shadow: 0 12px 32px var(--shadow-lg, rgb(0 0 0 / 20%)) !important;

  .el-dialog__header {
    padding: 20px 24px 0;
    margin: 0;
    border-bottom: none;
  }

  .el-dialog__headerbtn {
    top: 24px;
    right: 24px;
    font-size: 18px;

    .el-dialog__close {
      color: var(--text-secondary, #909399);

      &:hover {
        color: var(--text-primary, #303133);
      }
    }
  }

  .el-dialog__body {
    padding: 0;
  }
}
</style>
