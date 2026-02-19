<template>
  <div
    class="px-[15px] flex items-center justify-center color-[var(--el-text-color-regular)]"
    @click="toggleClick"
  >
    <span class="material-symbols-outlined hamburger" style="font-size: 24px">
      {{ isActive ? "format_indent_decrease" : "format_indent_increase" }}
    </span>
  </div>
</template>
<script setup lang="ts">
defineProps({
  isActive: {
    required: true,
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggleClick"]);

function toggleClick() {
  emit("toggleClick");
}
</script>

<style scoped lang="scss">
.hamburger {
  vertical-align: middle;
  cursor: pointer;
}
</style>
