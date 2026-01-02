import type { metaInfo } from "@/api/v1/meta";

export interface ActionInfo {
  uuid: string;
  name: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameter: any | null;
  type: string | null;
  parentUuid?: string | null;
}

export interface EntityInfo {
  uuid: string;
  name: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animations?: any | null;
  moved?: boolean;
  rotate?: boolean;
  hasTooltips?: boolean;
}

export interface MetaResourceIndex {
  action: ActionInfo[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger: any[];
  polygen: EntityInfo[];
  picture: EntityInfo[];
  video: EntityInfo[];
  voxel: EntityInfo[];
  phototype: EntityInfo[];
  text: EntityInfo[];
  sound: EntityInfo[];
  entity: EntityInfo[];
  events: { inputs: string[]; outputs: string[] };
}

interface Node {
  type: string;
  parameters?: {
    uuid: string;
    action?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameter?: any;
    name?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    animations?: any;
  };
  children?: {
    components?: Node[];
    [key: string]: Node[] | undefined;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAction(node: any, parentUuid?: string): ActionInfo | null {
  if (
    !node ||
    !node.parameters ||
    typeof node.parameters.action === "undefined"
  )
    return null;
  return {
    uuid: node.parameters.uuid,
    name: node.parameters.action ?? null,
    parameter: node.parameters.parameter ?? null,
    type: node.type ?? null,
    ...(node.type === "Tooltip" ? { parentUuid: parentUuid ?? null } : {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePoint(node: any, typeList: string[]): EntityInfo | undefined {
  if (!node) return undefined;
  const match = typeList.find(
    (t) => node.type?.toLowerCase() === t.toLowerCase()
  );
  if (!match) return undefined;

  const animations = node.parameters?.animations ?? null;
  const isPolygen = node.type.toLowerCase() === "polygen";
  const isPicture = node.type.toLowerCase() === "picture";

  let hasMoved = false;
  let hasRotate = false;
  let hasTooltips = false;
  if ((isPolygen || isPicture) && node.children?.components) {
    const comps = node.children.components;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hasMoved = comps.some((c: any) => c.type === "Moved");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hasRotate = comps.some((c: any) => c.type === "Rotate");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hasTooltips = comps.some((c: any) => c.type === "Tooltip");
  }

  return {
    uuid: node.parameters.uuid,
    name: node.parameters.name ?? null,
    ...(isPolygen
      ? { animations, moved: hasMoved, rotate: hasRotate, hasTooltips }
      : {}),
    ...(isPicture ? { moved: hasMoved, rotate: hasRotate, hasTooltips } : {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walk(node: any, acc: MetaResourceIndex) {
  if (!node) return;
  const action = parseAction(node);
  if (action) acc.action.push(action);

  const entity = parsePoint(node, [
    "polygen",
    "entity",
    "voxel",
    "video",
    "picture",
    "text",
    "voxel",
    "phototype",
    "sound",
  ]);
  if (entity) acc.entity.push(entity);

  const polygen = parsePoint(node, ["polygen"]);
  if (polygen) acc.polygen.push(polygen);
  const video = parsePoint(node, ["video"]);
  if (video) acc.video.push(video);
  const picture = parsePoint(node, ["picture"]);
  if (picture) acc.picture.push(picture);
  const sound = parsePoint(node, ["sound"]);
  if (sound) acc.sound.push(sound);
  const text = parsePoint(node, ["text"]);
  if (text) acc.text.push(text);
  const voxel = parsePoint(node, ["voxel"]);
  if (voxel) acc.voxel.push(voxel);
  const phototype = parsePoint(node, ["phototype"]);
  if (phototype) acc.phototype.push(phototype);

  if (node.children) {
    const parentUuid = node.parameters?.uuid;
    if (node.children.components) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      node.children.components.forEach((comp: any) => {
        const compAction = parseAction(comp, parentUuid);
        if (compAction) acc.action.push(compAction);
      });
    }
    Object.keys(node.children).forEach((key) => {
      if (key === "components") return;
      const arr = node.children[key];
      if (Array.isArray(arr)) arr.forEach((child) => walk(child, acc));
    });
  }
}

export function buildMetaResourceIndex(meta: metaInfo): MetaResourceIndex {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = meta.data!;
  const index: MetaResourceIndex = {
    action: [],
    trigger: [],
    polygen: [],
    picture: [],
    video: [],
    voxel: [],
    phototype: [],
    text: [],
    sound: [],
    entity: [],
    events: meta.events! || { inputs: [], outputs: [] },
  };
  if (data) walk(data, index);
  return index;
}
