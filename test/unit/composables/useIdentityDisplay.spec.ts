import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_TITLE,
  buildIdentityDisplay,
  type IdentityOrganization,
} from "@/composables/useIdentityDisplay";

describe("useIdentityDisplay", () => {
  it("falls back to the default site label when the domain title is empty", () => {
    expect(
      buildIdentityDisplay({
        siteTitle: "",
        organizations: undefined,
      })
    ).toEqual({
      siteLabel: DEFAULT_SITE_TITLE,
      organizations: [],
      visibleOrganizations: [],
      overflowCount: 0,
      hasOrganizations: false,
    });
  });

  it("keeps the first two organizations visible and folds the rest into overflowCount", () => {
    const organizations: IdentityOrganization[] = [
      { id: 1, name: "north-campus", title: "North Campus" },
      { id: 2, name: "research-lab", title: "Research Lab" },
      { id: 3, name: "teachers-team", title: "Teachers Team" },
    ];

    expect(
      buildIdentityDisplay({
        siteTitle: "Rokid AR Studio",
        organizations,
      })
    ).toEqual({
      siteLabel: "Rokid AR Studio",
      organizations,
      visibleOrganizations: organizations.slice(0, 2),
      overflowCount: 1,
      hasOrganizations: true,
    });
  });

  it("filters out malformed organizations that do not provide a printable title", () => {
    const result = buildIdentityDisplay({
      siteTitle: "XR UGC平台（XRUGC.com）",
      organizations: [
        { id: 1, name: "north-campus", title: "North Campus" },
        { id: 2, name: "broken", title: "" as never },
        null as never,
      ],
    });

    expect(result.organizations).toEqual([
      { id: 1, name: "north-campus", title: "North Campus" },
    ]);
    expect(result.visibleOrganizations).toEqual([
      { id: 1, name: "north-campus", title: "North Campus" },
    ]);
    expect(result.overflowCount).toBe(0);
  });
});
