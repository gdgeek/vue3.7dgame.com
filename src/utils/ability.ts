// src/utils/ability.ts
import { defineAbility } from "@casl/ability";

export class AbilityRouter {
  constructor(public path: string) {}
}

export class AbilityEditable {
  constructor(public editable: boolean) {}
}

export class AbilityRole {
  public role: string;
  constructor(public roles: string[]) {
    this.role = roles.includes("root")
      ? "root"
      : roles.includes("admin")
        ? "admin"
        : roles.includes("manager")
          ? "manager"
          : roles.includes("user")
            ? "user"
            : "guest";
  }
}

export class AbilityViewable {
  constructor(public viewable: boolean) {}
}

export class AbilityWorks {
  constructor(public id: number) {}
}

export class AbilityMessage {
  constructor(
    public id: number,
    public managed: number
  ) {}
}
const user = ["user", "manager", "admin", "root"];
const manager = ["manager", "admin", "root"];
const admin = ["admin", "root"];
const root = ["root"];
export function UpdateAbility(
  ability: any,
  roles: string[] | null,
  userId: number
) {
  const newAbility = defineAbility((can) => {
    if (!roles) {
      roles = [];
    }

    //alert(JSON.stringify(roles))
    let router: (string | RegExp)[] = [];
    let menu: (string | RegExp)[] = [];

    router = router.concat([
      "/site",
      "/site/logout",
      "/site/index",
      "/site/download",
      "/site/wechat-signup",
      "/site/binded-email",
      "/404",
      "/test",
      /^\/test[\/]/,
    ]); //基础权限 先给到

    if (roles.some((role) => user.includes(role))) {
      can("user", "all");
      can("editable", AbilityEditable.name, { editable: true });
      can("viewable", AbilityViewable.name, { viewable: true });

      can(["update", "delete"], AbilityWorks.name, { id: userId });
      can("delete", AbilityMessage.name, { id: userId, managed: 0 });
      can("update", AbilityMessage.name, { id: userId });

      router = router.concat([
        "/verse/rete-verse",
        "/verse/verse-script",
        "/verse/script",
        "/meta/rete-meta",
        "/meta/script",
        /^\/settings(\/|$)/,
      ]);

      menu = menu.concat([
        "/site/logout",
        "/resource",
        /^\/home(\/|$)/,
        /^\/verse(\/|$)/,
        /^\/meta(\/|$)/,
        /^\/resource\/polygen(\/|$)/,
        /^\/resource\/audio(\/|$)/,
        /^\/resource\/picture(\/|$)/,
        /^\/resource\/video(\/|$)/,
        // /^\/resource\/particle(\/|$)/,
      ]);
      menu.concat(["/verse-share/open", /^\/trades(\/|$)/]);
    }

    if (roles.some((role) => manager.includes(role))) {
      can("manager", "all");
    }

    if (roles.some((role) => admin.includes(role))) {
      can("admin", "all");
      can("people", AbilityRole.name, { role: "manager" }); //管理员可以管理用户
      can("people", AbilityRole.name, { role: "user" }); //管理员可以管理用户

      menu = menu.concat([/^\/game(\/|$)/]);
      menu = menu.concat([/^\/manager(\/|$)/]);

      menu = menu.concat([
        /^\/resource\/voxel(\/|$)/,
        /^\/resource\/picture(\/|$)/,
        /^\/resource\/video(\/|$)/,
        /^\/ai(\/|$)/,
      ]);
    }

    if (roles.some((role) => root.includes(role))) {
      can("root", "all");
      can("people", AbilityRole.name, { role: "admin" }); //超级管理员可以管理管理员
    }

    menu.forEach((item) => {
      if (typeof item === "string") {
        can(["open", "goto"], AbilityRouter.name, { path: item });
      } else {
        can(["open", "goto"], AbilityRouter.name, { path: { $regex: item } });
      }
    });

    router.forEach((item) => {
      if (typeof item === "string") {
        can("goto", AbilityRouter.name, { path: item });
      } else {
        can("goto", AbilityRouter.name, { path: { $regex: item } });
      }
    });
  });

  ability.update(newAbility.rules);
}
