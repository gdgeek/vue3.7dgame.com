import * as THREE from "three";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vector3;
  rotate: Vector3;
  scale: Vector3;
}

export type ResourceType =
  | "model"
  | "video"
  | "picture"
  | "audio"
  | "text"
  | "voxel"
  | string;

export interface ResourceFile {
  url: string;
  id?: string | number;
  name?: string;
  filename?: string; // From FileType
  key?: string; // From FileType
  size?: number; // From FileType
  md5?: string; // From FileType
  type?: string; // From FileType
}

export interface Resource {
  type: ResourceType;
  file?: ResourceFile; // Optional for text
  content?: string; // For text resources
  data?: any; // Runtime data (e.g. loaded texture, audio buffer)
  id?: string | number;
  name?: string; // From ResourceInfo
  uuid?: string; // From ResourceInfo
  image?: any; // From ResourceInfo
  created_at?: string; // From ResourceInfo
  info?: string; // From ResourceInfo
  author?: any; // From ResourceInfo
}

export interface EntityParameters {
  uuid: string;
  active?: boolean;
  transform?: Transform;
  meta_id?: string | number;
  resource?: string | number;
  name?: string;

  // Video/Picture/Audio
  play?: boolean; // Auto-play
  loop?: boolean;
  muted?: boolean;
  volume?: number;
  width?: number;
  height?: number;

  // Text
  text?: string;
  content?: string;
  fontSize?: number;
  font_size?: number;
  color?: string;
  spacing?: number; // Letter spacing

  // Voxel
  size?: number; // Often used for voxel size

  // Model
  animation_name?: string; // If auto-play animation
}

export interface Entity {
  type: string; // "Video", "Picture", "Model", "Text", "Voxel", "Group"
  parameters: EntityParameters;
  children?: {
    modules?: Entity[];
    entities?: Entity[];
    components?: Entity[]; // Components are also Entities
  };
}

export interface VerseData {
  children?: {
    modules?: Entity[];
  };
}

export interface Verse {
  id?: number | string;
  name?: string;
  description?: string;
  uuid?: string;
  data: VerseData | string; // Sometimes it's a JSON string that needs parsing
  metas: any[]; // Array of meta info (events etc)
  resources: Resource[];
  code?: string;
}

// Runtime Simulation Objects

export interface CollisionObject {
  sourceUuid: string;
  targetUuid: string;
  eventUuid: string;
  boundingBox: THREE.Box3;
  isColliding: boolean;
  lastPosition: THREE.Vector3;
  checkVisibility: boolean;
}

export interface RotatingObject {
  mesh: THREE.Object3D;
  speed: Vector3;
  checkVisibility: boolean;
}

export interface MoveableObjectLimit {
  enable: boolean;
  min: number;
  max: number;
}

export interface MoveableObject {
  mesh: THREE.Object3D;
  isDragging: boolean;
  magnetic: boolean;
  scalable: boolean;
  limit: {
    x: MoveableObjectLimit;
    y: MoveableObjectLimit;
    z: MoveableObjectLimit;
  };
  checkVisibility: boolean;
}

export interface DragState {
  isDragging: boolean;
  draggedObject: THREE.Object3D | null;
  dragStartPosition: THREE.Vector3;
  dragOffset: THREE.Vector3;
  mouseStartPosition: THREE.Vector2;
  lastIntersection: THREE.Vector3;
}
