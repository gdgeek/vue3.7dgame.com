import { computed } from "vue";
import { useDomainStore } from "@/store/modules/domain";

export const LOADING_SITE_TITLE = "载入中...";

export function getSiteTitle(siteTitle?: string | null): string {
  return siteTitle?.trim() || LOADING_SITE_TITLE;
}

export function useSiteTitle() {
  const domainStore = useDomainStore();
  return computed(() => getSiteTitle(domainStore.title));
}
