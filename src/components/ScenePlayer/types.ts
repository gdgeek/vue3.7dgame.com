/**
 * Internal type definitions for ScenePlayer.
 * These are in addition to the shared types in src/types/verse.ts.
 */
import type * as THREE from "three";
import type { Ref } from "vue";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  CollisionObject,
  RotatingObject,
  MoveableObject,
  DragState,
} from "@/types/verse";

// ─── Transform types ──────────────────────────────────────────────────────────

export type TransformAxis = { x: number; y: number; z: number };

export type TransformData = {
  position: TransformAxis;
  rotate: TransformAxis;
  scale: TransformAxis;
};

// ─── Entity component types ───────────────────────────────────────────────────

export type ComponentParameters = {
  uuid: string;
  target?: string;
  speed?: TransformAxis;
  magnetic?: boolean;
  scalable?: boolean;
  limit?: {
    x: { enable: boolean; min: number; max: number };
    y: { enable: boolean; min: number; max: number };
    z: { enable: boolean; min: number; max: number };
  };
};

export type EntityComponent = {
  type: string;
  parameters: ComponentParameters;
};

export type EntityParameters = {
  uuid: string;
  name?: string;
  title?: string;
  active?: boolean;
  play?: boolean;
  resource?: string | number;
  text?: string;
  width?: number;
  height?: number;
  loop?: boolean;
  muted?: boolean;
  volume?: number;
  color?: string;
  fontSize?: number;
  transform?: TransformData;
};

export type EntityNode = {
  type: string;
  parameters: EntityParameters;
  children?: {
    entities?: EntityNode[];
    components?: EntityComponent[];
  };
};

export type MetaData = {
  children?: {
    entities?: EntityNode[];
  };
};

export type ModuleParameters = {
  meta_id?: string | number;
  uuid: string;
  transform?: TransformData;
  play?: boolean;
  active?: boolean;
  [key: string]: unknown;
};

// ─── Source record types ──────────────────────────────────────────────────────

export type SourceModelData = {
  mesh: THREE.Object3D;
  setVisibility?: (isVisible: boolean) => void;
  cleanup?: () => void;
  updateBoundingBox?: () => void;
  setRotating?: (isRotating: boolean) => void;
};

export type SourceVideoData = {
  mesh: THREE.Object3D;
  video: HTMLVideoElement;
  texture: THREE.VideoTexture;
  cleanup: () => void;
  setVisibility: (isVisible: boolean) => void;
};

export type SourceAudioData = { url: string };

export type SourceTextData = {
  mesh: THREE.Object3D;
  setText: (text: string) => void;
  setVisibility: (isVisible: boolean) => void;
};

export type SourceEntityData = {
  transform: TransformData;
  setVisibility: () => void;
};

export type SourceRecord =
  | { type: "model"; data: SourceModelData }
  | { type: "picture"; data: SourceModelData }
  | { type: "video"; data: SourceVideoData }
  | { type: "audio"; data: SourceAudioData }
  | { type: "text"; data: SourceTextData }
  | { type: "entity"; data: SourceEntityData };

export type ResourceLike =
  | {
      type: string;
      id?: string | number;
      content?: string;
      file?: { url: string };
    }
  | {
      type: string;
      id?: string | number;
      file?: { url: string };
      [key: string]: unknown;
    };

// ─── Verse meta info type ─────────────────────────────────────────────────────

export type VerseMetaInfo = {
  id: string | number;
  data?: MetaData | string;
  events?: unknown;
};

// ─── Loader context ───────────────────────────────────────────────────────────

/**
 * Shared mutable context passed to resource loaders.
 * renderer/camera start as null and are assigned during onMounted.
 */
export type LoaderContext = {
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.PerspectiveCamera | null;
  threeScene: THREE.Scene;
  controls: Ref<OrbitControls | null>;
  mouse: THREE.Vector2;
  raycaster: THREE.Raycaster;
  sources: Map<string, SourceRecord>;
  mixers: Map<string, THREE.AnimationMixer>;
  collisionObjects: Ref<CollisionObject[]>;
  rotatingObjects: Ref<RotatingObject[]>;
  moveableObjects: Ref<MoveableObject[]>;
  dragState: DragState;
  sceneInstanceId: string;
  triggerEvent: (eventId: string) => Promise<void>;
  findResource: (id: string | number) => ResourceLike | undefined;
};
