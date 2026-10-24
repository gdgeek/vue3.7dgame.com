import { describe, expect, it } from "vitest";
import { createMongoAbility } from "@casl/ability";
import { routerData, UpdateRoutes, useRouter } from "@/router";
import { UpdateAbility } from "@/utils/ability";

describe("all-scenes route access", () => {
  it.each(["user", "manager", "admin", "root"])(
    "filters the actual scene menu for %s without changing the existing lists",
    async (role) => {
      const ability = createMongoAbility();
      UpdateAbility(ability, [role], 7);
      await UpdateRoutes(ability);
      const scenes = routerData.value.find((route) => route.name === "Verse")!;
      const all = scenes.children!.find(
        (route) => route.path === "/verse/all"
      )!;

      expect(all.meta?.hidden).toBe(role !== "root");
      for (const path of ["/verse/index", "/verse/public"]) {
        expect(
          scenes.children!.find((route) => route.path === path)?.meta?.hidden
        ).toBe(false);
      }
    }
  );

  it("keeps the all scope and root requirement on a directly resolved URL", () => {
    const resolved = useRouter().resolve("/verse/all");
    const record = resolved.matched[resolved.matched.length - 1];

    expect(record.name).toBe("VerseAll");
    expect(record.props.default).toEqual({ scope: "all" });
    expect(resolved.meta.roles).toEqual(["root"]);
  });
});
