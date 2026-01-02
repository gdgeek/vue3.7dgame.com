<template>
  <el-dropdown trigger="click" @command="handleLanguageChange">
    <div class="lang-trigger">
      <svg-icon icon-class="language" :size="size"></svg-icon>
      <span class="lang-text">{{ currentLangLabel }}</span>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="item in langOptions"
          :key="item.value"
          :disabled="appStore.language === item.value"
          :command="item.value"
        >
          {{ item.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/store/modules/app";
import { useDomainStore } from "@/store/modules/domain";
import { LanguageEnum } from "@/enums/LanguageEnum";
import { loadLanguageAsync } from "@/lang/index";

defineProps({
  size: {
    type: String,
    required: false,
  },
});

const langOptions = [
  { label: "简体中文", value: LanguageEnum.ZH_CN, abbr: "中文" },
  { label: "English", value: LanguageEnum.EN, abbr: "EN" },
  { label: "日本語", value: LanguageEnum.JA, abbr: "日本語" },
  { label: "繁體中文", value: LanguageEnum.ZH_TW, abbr: "繁體" },
  { label: "ไทย", value: LanguageEnum.TH, abbr: "ไทย" },
];

const appStore = useAppStore();
const domainStore = useDomainStore();
const { locale, t } = useI18n();

const currentLangLabel = computed(() => {
  const currentLang = langOptions.find(
    (item) => item.value === appStore.language
  );
  return currentLang ? currentLang.abbr : "中文";
});

async function handleLanguageChange(lang: string) {
  await loadLanguageAsync(lang);
  // Refresh domain data for new language
  await domainStore.refreshFromAPI();
  ElMessage.success(t("langSelect.message.success"));
}
</script>

<style scoped>
.lang-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: inherit;
}

.lang-text {
  font-size: 15px;
  font-weight: 500;
  color: inherit;
}
</style>
