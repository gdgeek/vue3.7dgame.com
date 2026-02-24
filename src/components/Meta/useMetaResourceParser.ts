import type { metaInfo } from "@/api/v1/meta";

/** 场景节点参数（来自后端 JSON，字段可变） */
interface MetaNodeParameters {
  uuid: string;
  action?: string;
  parameter?: unknown;
  name?: string;
  animations?: unknown;
  data?: unknown;
  [key: string]: unknown;
}

/** 场景节点子节点集合 */
interface MetaNodeChildren {
  components?: MetaNode[];
  [key: string]: MetaNode[] | MetaNode | undefined;
}

/** 场景树节点 */
interface MetaNode {
  type?: string;
  parameters: MetaNodeParameters;
  children?: MetaNodeChildren;
}

export interface ActionInfo {
  uuid: string;
  name: string | null;
  parameter: unknown;
  type: string | null;
  parentUuid?: string | null;
}

export interface EntityInfo {
  uuid: string;
  name: string | null;
  animations?: unknown;
  moved?: boolean;
  rotate?: boolean;
  hasTooltips?: boolean;
}

export interface MetaResourceIndex {
  action: ActionInfo[];
  trigger: unknown[];
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

function normalizeEventNames(events: unknown): string[] {
  if (!Array.isArray(events)) return [];
  return events
    .map((event) => {
      if (typeof event === "string") return event;
      if (event && typeof event === "object" && "name" in event) {
        const name = (event as { name?: unknown }).name;
        return typeof name === "string" ? name : undefined;
      }
      return undefined;
    })
    .filter((name): name is string => Boolean(name));
}

function parseAction(node: MetaNode | undefined, parentUuid?: string): ActionInfo | null {
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

function parsePoint(node: MetaNode | undefined, typeList: string[]): EntityInfo | undefined {
  if (!node) return undefined;
  const match = typeList.find(
    (t) => node.type?.toLowerCase() === t.toLowerCase()
  );
  if (!match) return undefined;

  const animations = node.parameters?.animations ?? null;
  const isPolygen = node.type.toLowerCase() === "polygen";
  const isPicture = node.type.toLowerCase() === "picture";
  const isPhototype = node.type.toLowerCase() === "phototype";

  let hasMoved = false;
  let hasRotate = false;
  let hasTooltips = false;
  if ((isPolygen || isPicture) && node.children?.components) {
    const comps = node.children.components;
    hasMoved = comps.some((c) => c.type === "Moved");
    hasRotate = comps.some((c) => c.type === "Rotate");
    hasTooltips = comps.some((c) => c.type === "Tooltip");
  }

  return {
    uuid: node.parameters.uuid,
    name: node.parameters.name ?? null,
    ...(isPolygen
      ? { animations, moved: hasMoved, rotate: hasRotate, hasTooltips }
      : {}),
    ...(isPicture ? { moved: hasMoved, rotate: hasRotate, hasTooltips } : {}),
    ...(isPhototype ? { data: node.parameters.data ?? null } : {}),
  };
}

function walk(node: MetaNode | undefined, acc: MetaResourceIndex) {
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
      node.children.components.forEach((comp) => {
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
  const data = meta.data as unknown as MetaNode | undefined;
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
    events: meta.events
      ? {
          inputs: normalizeEventNames(meta.events.inputs),
          outputs: normalizeEventNames(meta.events.outputs),
        }
      : { inputs: [], outputs: [] },
  };
  if (data) walk(data, index);
  return index;
}
