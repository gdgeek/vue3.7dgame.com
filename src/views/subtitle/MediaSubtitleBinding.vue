<template>
  <SubtitleBindingEditor
    v-if="
      domain.subtitleEnabled &&
      user.isUserPermissionGreater('admin') &&
      username &&
      username === resource.author?.username &&
      isMedia
    "
    :key="resource.id"
    :media-id="resource.id"
  ></SubtitleBindingEditor>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { useDomainStore } from "@/store/modules/domain";
import { useUserStore } from "@/store/modules/user";

const SubtitleBindingEditor = defineAsyncComponent(
  () => import("./SubtitleBindingEditor.vue")
);
const props = defineProps<{ resource: ResourceInfo }>();
const domain = useDomainStore();
const user = useUserStore();
const username = computed(() => user.userInfo?.userData?.username);
const isMedia = computed(() =>
  ["audio", "video"].includes(props.resource.type)
);
</script>
