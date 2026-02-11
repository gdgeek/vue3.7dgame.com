<template>
  <div :class="['password-strength', { 'dark-theme': isDark }]">
    <!-- 规则列表 -->
    <ul class="password-strength__rules">
      <li v-for="rule in validationResult.rules" :key="rule.key"
        :class="['password-strength__rule', { passed: rule.passed }]">
        <span class="password-strength__icon">{{ rule.passed ? "✓" : "✗" }}</span>
        <span class="password-strength__text">{{ $t(rule.message) }}</span>
      </li>
    </ul>

    <!-- 强度条 -->
    <div class="password-strength__bar-wrapper">
      <div class="password-strength__bar" :class="[`password-strength__bar--${validationResult.strength}`]"
        :style="{ width: strengthBarWidth }" />
    </div>

    <!-- 强度文字 -->
    <span v-if="password.length > 0" class="password-strength__label"
      :class="[`password-strength__label--${validationResult.strength}`]">
      {{ $t(`passwordPolicy.strength.${validationResult.strength}`) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { validatePassword } from "@/utils/password-validator";

const props = defineProps<{
  password: string;
}>();

const settingsStore = useSettingsStore();
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

const validationResult = computed(() => validatePassword(props.password));

const strengthBarWidth = computed(() => {
  if (props.password.length === 0) return "0%";
  switch (validationResult.value.strength) {
    case "weak":
      return "33%";
    case "medium":
      return "66%";
    case "strong":
      return "100%";
    default:
      return "0%";
  }
});
</script>

<style scoped lang="scss">
.password-strength {
  margin-top: 8px;
  font-size: 13px;

  &__rules {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__rule {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    color: #f56c6c;
    transition: color 0.3s ease;

    &.passed {
      color: #67c23a;
    }
  }

  &__icon {
    font-size: 12px;
    width: 14px;
    text-align: center;
  }

  &__text {
    font-size: 12px;
  }

  &__bar-wrapper {
    margin-top: 8px;
    height: 6px;
    background-color: #e4e7ed;
    border-radius: 3px;
    overflow: hidden;
    transition: background-color 0.3s ease;
  }

  &__bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease, background-color 0.3s ease;

    &--weak {
      background-color: #f56c6c;
    }

    &--medium {
      background-color: #e6a23c;
    }

    &--strong {
      background-color: #67c23a;
    }
  }

  &__label {
    display: inline-block;
    margin-top: 4px;
    font-size: 12px;
    font-weight: 500;

    &--weak {
      color: #f56c6c;
    }

    &--medium {
      color: #e6a23c;
    }

    &--strong {
      color: #67c23a;
    }
  }

  // 暗色主题
  &.dark-theme {
    .password-strength__rule {
      color: #f89898;

      &.passed {
        color: #85ce61;
      }
    }

    .password-strength__bar-wrapper {
      background-color: #4c4d4f;
    }

    .password-strength__label {
      &--weak {
        color: #f89898;
      }

      &--medium {
        color: #ebb563;
      }

      &--strong {
        color: #85ce61;
      }
    }
  }
}
</style>
