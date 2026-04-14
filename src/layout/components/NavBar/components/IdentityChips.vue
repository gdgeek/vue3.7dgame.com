<template>
  <div
    class="identity-chips"
    aria-label="Current site and organization context"
  >
    <span class="identity-chip identity-chip--site" :title="siteLabel">
      {{ siteLabel }}
    </span>

    <span
      v-for="organization in visibleOrganizations"
      :key="organization.id"
      class="identity-chip identity-chip--org"
      :title="organization.title"
    >
      {{ organization.title }}
    </span>

    <span
      v-if="overflowCount > 0"
      class="identity-chip identity-chip--overflow"
      :title="`还有 ${overflowCount} 个组织`"
    >
      +{{ overflowCount }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { IdentityOrganization } from "@/composables/useIdentityDisplay";

defineProps<{
  siteLabel: string;
  visibleOrganizations: IdentityOrganization[];
  overflowCount: number;
}>();
</script>

<style lang="scss" scoped>
.identity-chips {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  max-width: min(36vw, 420px);
  min-width: 0;
  overflow: hidden;
}

.identity-chip {
  min-width: 0;
  max-width: 180px;
  padding: 4px 10px;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 999px;
}

.identity-chip--site {
  color: var(--ar-text);
  background: color-mix(in srgb, var(--ar-bg-elevated) 84%, white);
  border: 1px solid var(--ar-divider);
}

.identity-chip--org {
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, white);
  border: 1px solid color-mix(in srgb, var(--primary-color) 24%, white);
}

.identity-chip--overflow {
  color: var(--ar-text-muted);
  background: transparent;
  border: 1px dashed var(--ar-divider);
}
</style>
