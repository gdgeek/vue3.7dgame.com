import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from "@casl/ability";
import env from "@/environment";

export class AbilityRouter {
  path: string;

  constructor(path: string) {
    this.path = path;
  }
}

export class AbilityEditable {
  editable: boolean;

  constructor(editable: boolean) {
    this.editable = editable;
  }
}

export class AbilityViewable {
  viewable: boolean;

  constructor(viewable: boolean) {
    this.viewable = viewable;
  }
}

export class AbilityWorks {
  id: number;

  constructor(id: number) {
    this.id = id;
  }
}

export class AbilityMessage {
  id: number;
  managed: number;

  constructor(id: number, managed: number) {
    this.id = id;
    this.managed = managed;
  }
}

export const UpdateAbility = (
  $ability: MongoAbility,
  roles: string[] | null,
  userId: number
): void => {
  const { can, rules } = new AbilityBuilder<MongoAbility>(createMongoAbility);

  roles = roles || [];
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

  if (env.canWeb()) router.push(/^\/web[\/]/);
  if (env.canBlog()) router.push(/^\/blog[\/]/);
  if (env.canSetup()) router.push(/^\/setup[\/]/);
  if (env.canManager()) router.push(/^\/setup[\/]/);

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
      "/resource/",
      /^\/polygen[\/]/,
      /^\/voxel[\/]/,
      /^\/space[\/]/,
      /^\/picture[\/]/,
      /^\/video[\/]/,
      /^\/home[\/]/,
      /^\/verse[\/]/,
      /^\/meta[\/]/,
      /^\/meta-verse[\/]/,
      /^\/settings[\/]/,
      /^\/discovery[\/]/,
      /^\/community[\/]/,
      /^\/editor[\/]/,
      /^\/audio[\/]/,
    ]);

    if (
      roles.includes("root") ||
      roles.includes("admin") ||
      roles.includes("manager")
    ) {
      can("manager", "all");
      can("editable", AbilityEditable.name, { editable: true });
      can("viewable", AbilityViewable.name, { viewable: true });
      can(["update", "delete"], AbilityWorks.name);
      can("delete", AbilityMessage.name, { managed: 0 });
      can("update", AbilityMessage.name);
      menu = menu.concat([
        "/verse-share/open",
        /^\/trades[\/]/,
        /^\/manager[\/]/,
      ]);

      if (roles.includes("root")) {
        can("root", "all");
        // menu = menu.concat([/^\/knight[\/]/])
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

  $ability.update(rules);
};
