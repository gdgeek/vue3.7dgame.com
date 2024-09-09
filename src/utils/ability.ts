// src/utils/ability.ts
import { defineAbility } from "@casl/ability";
import env from "@/environment";

export class AbilityRouter {
  constructor(public path: string) {}
}

export class AbilityEditable {
  constructor(public editable: boolean) {}
}


export class AbilityRole {
 
  public role: string;
  constructor(public roles: string[]) {
    this.role = roles.includes("root") ? "root" :
      roles.includes("admin") ? "admin" :
        roles.includes("manager") ? "manager" :
          roles.includes("user") ? "user" : "guest";
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

export function UpdateAbility(
  ability: any,
  roles: string[] | null,
  userId: number
) {
  const newAbility = defineAbility((can) => {
    if (!roles) {
      roles = [];
    }

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
    ]);

    if (env.canWeb()) {
      router.push(/^\/web[\/]/);
    }
    if (env.canBlog()) {
      router.push(/^\/blog[\/]/);
    }
    if (env.canSetup()) {
      router.push(/^\/setup[\/]/);
    }
    if (env.canManager()) {
      router.push(/^\/setup[\/]/);
    }

    if (
      roles.includes("root") ||
      roles.includes("manager") ||
      roles.includes("user")
    ) {
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
      ]);
      menu = menu.concat([
        "/site/logout",
        /^\/resource(\/|$)/,
        /^\/polygen(\/|$)/,
        /^\/voxel(\/|$)/,
        /^\/space(\/|$)/,
        /^\/picture(\/|$)/,
        /^\/video(\/|$)/,
        /^\/home(\/|$)/,
        /^\/verse(\/|$)/,
        /^\/meta(\/|$)/,
        /^\/meta-verse(\/|$)/,
        /^\/settings(\/|$)/,
        /^\/discovery(\/|$)/,
        /^\/community(\/|$)/,
        /^\/editor(\/|$)/,
        /^\/audio(\/|$)/,
      ]);

      if (
        roles.includes("root") ||
        roles.includes("admin") ||
        roles.includes("manager") ||
        roles.includes("user")
      ) {
        
        can("user", "all");
        can("editable", AbilityEditable.name);
        can("viewable", AbilityViewable.name);
        can(["update", "delete"], AbilityWorks.name);
        can("delete", AbilityMessage.name, { managed: 0 });
        can("update", AbilityMessage.name);

        menu = menu.concat(["/verse-share/open", /^\/trades(\/|$)/]);
        if (roles.includes("root") ||
          roles.includes("admin") ||
          roles.includes("manager")) {
          can("manager", "all");
          if (roles.includes("root") ||
            roles.includes("admin")) {
            
            can("admin", "all");
            can("people", AbilityRole.name, { role: "manager" });
            can("people", AbilityRole.name, { role: "user" });
            menu = menu.concat([/^\/game(\/|$)/]);
            menu = menu.concat([/^\/manager(\/|$)/]);

            if (roles.includes("root")) {
              can("root", "all");
              can("people", AbilityRole.name, { role: "admin" });
            }
          }
        }
      }
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

  // alert(111)
  ability.update(newAbility.rules);
}
