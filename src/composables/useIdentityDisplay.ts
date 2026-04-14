import { computed } from "vue";
import type { OrganizationInfoType } from "@/api/user/model";
import { useDomainStore } from "@/store/modules/domain";
import { useUserStore } from "@/store/modules/user";

export const DEFAULT_SITE_TITLE = "XR UGC平台（XRUGC.com）";

export type IdentityOrganization = OrganizationInfoType;

export interface IdentityDisplayState {
  siteLabel: string;
  organizations: IdentityOrganization[];
  visibleOrganizations: IdentityOrganization[];
  overflowCount: number;
  hasOrganizations: boolean;
}

const normalizeOrganizations = (
  organizations: OrganizationInfoType[] | null | undefined
): IdentityOrganization[] => {
  if (!Array.isArray(organizations)) return [];

  return organizations.filter(
    (organization): organization is IdentityOrganization =>
      Boolean(
        organization &&
          typeof organization.id === "number" &&
          typeof organization.name === "string" &&
          typeof organization.title === "string" &&
          organization.title.trim()
      )
  );
};

export function buildIdentityDisplay({
  siteTitle,
  organizations,
  maxVisibleOrganizations = 2,
}: {
  siteTitle: string | null | undefined;
  organizations: OrganizationInfoType[] | null | undefined;
  maxVisibleOrganizations?: number;
}): IdentityDisplayState {
  const siteLabel = siteTitle?.trim() || DEFAULT_SITE_TITLE;
  const normalizedOrganizations = normalizeOrganizations(organizations);
  const visibleOrganizations = normalizedOrganizations.slice(
    0,
    maxVisibleOrganizations
  );

  return {
    siteLabel,
    organizations: normalizedOrganizations,
    visibleOrganizations,
    overflowCount: Math.max(
      normalizedOrganizations.length - visibleOrganizations.length,
      0
    ),
    hasOrganizations: normalizedOrganizations.length > 0,
  };
}

export function useIdentityDisplay(maxVisibleOrganizations = 2) {
  const domainStore = useDomainStore();
  const userStore = useUserStore();

  return computed(() =>
    buildIdentityDisplay({
      siteTitle: domainStore.title,
      organizations: userStore.userInfo?.organizations,
      maxVisibleOrganizations,
    })
  );
}
