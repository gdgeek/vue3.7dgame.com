<template>
  <div
    class="px-[15px] flex items-center justify-center color-[var(--el-text-color-regular)]"
    @click="toggleClick"
  >
    <font-awesome-icon
      :icon="['fas', isActive ? 'outdent' : 'indent']"
      class="hamburger"
      style="font-size: 24px"
    ></font-awesome-icon>
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
