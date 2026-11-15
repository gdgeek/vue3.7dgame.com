import { describe, expect, it } from "vitest";
import { createMongoAbility } from "@casl/ability";
import { routerData, UpdateRoutes, useRouter } from "@/router";
import { AbilityRouter, UpdateAbility } from "@/utils/ability";

describe("organization scene access", () => {
  it.each([
    { roles: ["manager"], organizations: [{ id: 3 }], allowed: true },
    {
      roles: ["manager"],
      organizations: [{ id: 3 }, { id: 7 }],
      allowed: true,
    },
    { roles: ["manager"], organizations: [], allowed: false },
    { roles: ["manager"], organizations: undefined, allowed: false },
    { roles: ["manager"], organizations: [{ id: 0 }], allowed: false },
    { roles: ["user"], organizations: [{ id: 3 }], allowed: false },
    { roles: ["admin"], organizations: [{ id: 3 }], allowed: true },
    { roles: ["admin"], organizations: [{ id: 3 }, { id: 7 }], allowed: true },
    { roles: ["admin"], organizations: [], allowed: false },
    { roles: ["admin"], organizations: undefined, allowed: false },
    { roles: ["admin"], organizations: [{ id: 0 }], allowed: false },
    { roles: ["root"], organizations: [{ id: 3 }], allowed: false },
  ])(
    "filters the scene menu for $roles / $organizations",
    async ({ roles, organizations, allowed }) => {
      const ability = createMongoAbility();
      UpdateAbility(ability, roles, 7, { organizations });
      await UpdateRoutes(ability);

      for (const action of ["open", "goto"]) {
        expect(
          ability.can(action, new AbilityRouter("/verse/organization"))
        ).toBe(allowed);
      }
      const scenes = routerData.value.find((route) => route.name === "Verse")!;
      expect(
        scenes.children!.find((route) => route.name === "VerseOrganization")
          ?.meta?.hidden
      ).toBe(!allowed);
      expect(
        scenes.children!.find((route) => route.name === "VerseAll")?.meta
          ?.hidden
      ).toBe(!roles.includes("root"));
      for (const path of ["/verse/index", "/verse/public"]) {
        expect(
          scenes.children!.find((route) => route.path === path)?.meta?.hidden
        ).toBe(false);
      }
    }
  );

  it("keeps the read-only scope and membership requirement on direct URLs", () => {
    const resolved = useRouter().resolve("/verse/organization");
    const record = resolved.matched[resolved.matched.length - 1];
    expect(record.props.default).toEqual({ scope: "organization" });
    expect(resolved.meta.roles).toEqual(["manager", "admin"]);
    expect(resolved.meta.requiresOrganization).toBe(true);
  });

  it.each(["manager", "admin"])(
    "revokes %s access after organization membership is removed",
    (role) => {
      const ability = createMongoAbility();
      UpdateAbility(ability, [role], 7, { organizations: [{ id: 3 }] });
      expect(
        ability.can("open", new AbilityRouter("/verse/organization"))
      ).toBe(true);
      UpdateAbility(ability, [role], 7, { organizations: [] });
      expect(
        ability.can("open", new AbilityRouter("/verse/organization"))
      ).toBe(false);
    }
  );
});
