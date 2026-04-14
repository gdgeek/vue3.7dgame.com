<template>
  <div class="home-identity-strip">
    <span
      class="home-identity-chip home-identity-chip--site"
      :title="siteLabel"
    >
      {{ siteLabel }}
    </span>

    <span
      v-for="organization in organizations"
      :key="organization.id"
      class="home-identity-chip home-identity-chip--org"
      :title="organization.title"
    >
      {{ organization.title }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { IdentityOrganization } from "@/composables/useIdentityDisplay";

defineProps<{
  siteLabel: string;
  organizations: IdentityOrganization[];
}>();
</script>

<style lang="scss" scoped>
.home-identity-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 16px;
}

.home-identity-chip {
  max-width: 100%;
  padding: 6px 12px;
  overflow: hidden;
  font-size: 13px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 999px;
}

.home-identity-chip--site {
  color: var(--text-primary);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
}

.home-identity-chip--org {
  color: var(--primary-color, #03a9f4);
  background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, white);
  border: 1px solid color-mix(in srgb, var(--primary-color, #03a9f4) 22%, white);
}
</style>
