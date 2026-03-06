<template>
  <div>
    <div
      id="scene"
      ref="scene"
      :style="{
        height: isSceneFullscreen ? '100vh' : '75vh',
        width: '100%',
        margin: '0 auto',
        position: 'relative',
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
/**
 * 通用 ScenePlayer 组件
 *
 * 同时支持 Meta 模式（单层实体树）和 Verse 模式（Modules -> Meta -> Entities 嵌套）。
 * 通过 props 传入 `meta` 或 `verse` 之一来指定数据来源。
 *
 * 暴露方法：sources, playAnimation, getAudioUrl, playQueuedAudio
 */
import { logger } from "@/utils/logger";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getConfiguredGLTFLoader } from "@/lib/three/loaders";
import Stats from "stats.js";
import { ref, onMounted, onUnmounted, watch, computed, reactive } from "vue";
import { convertToHttps } from "@/assets/js/helper";
import { VOXLoader, VOXMesh } from "@/assets/js/voxel/VOXLoader.js";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import type { MetaInfo } from "@/api/v1/types/meta";
import type { ResourceInfo } from "@/api/v1/resources/model";
import type {
  Verse,
  Entity,
  Resource,
  CollisionObject,
  RotatingObject,
  MoveableObject,
  DragState,
  Transform,
} from "@/types/verse";

// ─── Props ───────────────────────────────────────────────────────────────────

const props = defineProps<{
  /** Meta 数据来源（Meta 模式时必须提供） */
  meta?: MetaInfo;
  /** Verse 数据来源（Verse 模式时必须提供） */
  verse?: Verse;
  /** 是否全屏显示场景 */
  isSceneFullscreen?: boolean;
}>();

// ─── Mode detection ───────────────────────────────────────────────────────────

/** 当前运行模式：'meta' | 'verse' */
const mode = computed<"meta" | "verse">(() =>
  props.meta !== undefined ? "meta" : "verse"
);

// ─── 实例唯一 ID（避免多 ScenePlayer 实例共享 window.meta/verse 导致回调互相覆盖）────

const sceneInstanceId = Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Internal types ───────────────────────────────────────────────────────────

type TransformAxis = { x: number; y: number; z: number };

type TransformData = {
  position: TransformAxis;
  rotate: TransformAxis;
  scale: TransformAxis;
};

type ComponentParameters = {
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

type EntityComponent = {
  type: string;
  parameters: ComponentParameters;
};

type EntityNode = {
  type: string;
  parameters: EntityParameters;
  children?: {
    entities?: EntityNode[];
    components?: EntityComponent[];
  };
};

type EntityParameters = {
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

type MetaData = {
  children?: {
    entities?: EntityNode[];
  };
};

/** Verse module parameters (used in Verse mode nesting) */
type ModuleParameters = {
  meta_id?: string | number;
  uuid: string;
  transform?: Transform;
  play?: boolean;
  active?: boolean;
  [key: string]: unknown;
};

type SourceModelData = {
  mesh: THREE.Object3D;
  setVisibility?: (isVisible: boolean) => void;
  cleanup?: () => void;
  updateBoundingBox?: () => void;
  setRotating?: (isRotating: boolean) => void;
};

type SourceVideoData = {
  mesh: THREE.Object3D;
  video: HTMLVideoElement;
  texture: THREE.VideoTexture;
  cleanup: () => void;
  setVisibility: (isVisible: boolean) => void;
};

type SourceAudioData = { url: string };

type SourceTextData = {
  mesh: THREE.Object3D;
  setText: (text: string) => void;
  setVisibility: (isVisible: boolean) => void;
};

type SourceEntityData = { transform: TransformData; setVisibility: () => void };

type SourceRecord =
  | { type: "model"; data: SourceModelData }
  | { type: "picture"; data: SourceModelData }
  | { type: "video"; data: SourceVideoData }
  | { type: "audio"; data: SourceAudioData }
  | { type: "text"; data: SourceTextData }
  | { type: "entity"; data: SourceEntityData };

type ResourceLike =
  | ResourceInfo
  | {
      type: string;
      id?: string | number;
      content?: string;
      file?: { url: string };
    };

// ─── Stores ───────────────────────────────────────────────────────────────────

const settingsStore = useSettingsStore();
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

// ─── Three.js state ───────────────────────────────────────────────────────────

const scene = ref<HTMLDivElement | null>(null);
const threeScene = new THREE.Scene();
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let mixers: Map<string, THREE.AnimationMixer> = new Map();
let sources: Map<string, SourceRecord> = new Map();
let clock = new THREE.Clock();

// ─── Runtime simulation state ─────────────────────────────────────────────────

const collisionObjects = ref<CollisionObject[]>([]);
const rotatingObjects = ref<RotatingObject[]>([]);
const moveableObjects = ref<MoveableObject[]>([]);

const dragState = reactive<DragState>({
  isDragging: false,
  draggedObject: null,
  dragStartPosition: new THREE.Vector3(),
  dragOffset: new THREE.Vector3(),
  mouseStartPosition: new THREE.Vector2(),
  lastIntersection: new THREE.Vector3(),
});

const controls = ref<OrbitControls | null>(null);
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

// ─── Verse-mode only: event container ────────────────────────────────────────

const eventContainer = ref<Record<string, unknown>>({});

// ─── Utility helpers ──────────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isMetaData = (value: unknown): value is MetaData =>
  isRecord(value) && ("children" in value || "entities" in value);

const getResourceContent = (resource: ResourceLike): string | undefined =>
  "content" in resource ? resource.content : undefined;

/**
 * 查找资源：优先从当前模式的数据源中查找。
 * Meta 模式使用 props.meta.resources；Verse 模式使用 props.verse.resources。
 */
const findResource = (resourceId: string | number): ResourceLike | undefined => {
  if (mode.value === "meta" && props.meta) {
    return props.meta.resources.find(
      (r) => r.id.toString() === resourceId.toString()
    );
  }
  if (mode.value === "verse" && props.verse) {
    return props.verse.resources.find(
      (r: Resource) => r.id?.toString() === resourceId.toString()
    );
  }
  return undefined;
};

/**
 * 合并父子变换，处理父子相对位置。
 */
const combineTransforms = (
  parentTransform: TransformData | undefined,
  childTransform: TransformData | undefined
): TransformData => {
  if (!parentTransform) {
    return (
      childTransform || {
        position: { x: 0, y: 0, z: 0 },
        rotate: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      }
    );
  }

  if (!childTransform) {
    return parentTransform;
  }

  // 创建父对象的旋转矩阵
  const parentRotationMatrix = new THREE.Matrix4();
  const parentRotationEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(parentTransform.rotate.x),
    THREE.MathUtils.degToRad(parentTransform.rotate.y),
    THREE.MathUtils.degToRad(parentTransform.rotate.z),
    "XYZ"
  );
  parentRotationMatrix.makeRotationFromEuler(parentRotationEuler);

  // 创建子对象的位置向量
  const childPosition = new THREE.Vector3(
    childTransform.position.x,
    childTransform.position.y,
    childTransform.position.z
  );

  // 应用父对象的旋转到子对象的位置
  childPosition.applyMatrix4(parentRotationMatrix);

  // 应用父对象的缩放到子对象的位置
  childPosition.multiply(
    new THREE.Vector3(
      parentTransform.scale.x,
      parentTransform.scale.y,
      parentTransform.scale.z
    )
  );

  // 最终位置是父对象位置加上变换后的子对象位置
  const finalPosition = {
    x: parentTransform.position.x + childPosition.x,
    y: parentTransform.position.y + childPosition.y,
    z: parentTransform.position.z + childPosition.z,
  };

  // 旋转角度简单相加
  const finalRotation = {
    x: parentTransform.rotate.x + childTransform.rotate.x,
    y: parentTransform.rotate.y + childTransform.rotate.y,
    z: parentTransform.rotate.z + childTransform.rotate.z,
  };

  // 缩放值相乘
  const finalScale = {
    x: parentTransform.scale.x * childTransform.scale.x,
    y: parentTransform.scale.y * childTransform.scale.y,
    z: parentTransform.scale.z * childTransform.scale.z,
  };

  return {
    position: finalPosition,
    rotate: finalRotation,
    scale: finalScale,
  };
};

// ─── Model loading ────────────────────────────────────────────────────────────

/**
 * 触发事件：通过实例专属的 __sceneCallbacks[sceneInstanceId] 命名空间调用事件函数，
 * 避免多实例时互相覆盖。
 */
const triggerEvent = async (eventId: string) => {
  const callbacks = window.__sceneCallbacks?.[sceneInstanceId];
  if (!callbacks) return;
  const handler = callbacks[`@${eventId}`];
  if (typeof handler === "function") {
    await handler();
  }
};

/**
 * 加载单个模型/资源并添加到场景中。
 * 支持类型：video, picture, audio, text, voxel, gltf model。
 */
const loadModel = async (
  resource: ResourceLike,
  entity: EntityNode,
  parentActive: boolean = true
): Promise<THREE.Object3D | boolean | undefined> => {
  logger.log("开始加载模型:", {
    entityType: entity.type,
    entityUUID: entity.parameters?.uuid,
    resourceType: resource.type,
    isActive: entity.parameters.active,
    parentActive,
  });

  // 计算当前实体的可见性状态，需要考虑父级的可见性
  const currentActive =
    (entity.parameters?.active !== undefined
      ? entity.parameters.active
      : true) && parentActive;

  // 初始化可见性
  const setInitialVisibility = (mesh: THREE.Object3D) => {
    mesh.visible = currentActive;
    logger.log(
      `设置模型 ${entity.parameters.uuid} 的初始可见性:`,
      mesh.visible,
      `(parentActive: ${parentActive}, entityActive: ${entity.parameters.active})`
    );
    return currentActive;
  };

  // ── 处理视频类型 ──────────────────────────────────────────────────────────

  if (resource.type === "video" || entity.type === "Video") {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement("video");
        const videoUrl =
          "file" in resource && resource.file?.url ? resource.file.url : "";
        video.src = convertToHttps(videoUrl);
        video.crossOrigin = "anonymous";

        video.loop = entity.parameters.loop || false;
        video.muted = entity.parameters.muted || false;
        video.playsInline = true;
        video.volume = entity.parameters.volume || 1.0;

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;

        video.addEventListener("loadedmetadata", () => {
          const aspectRatio = video.videoWidth / video.videoHeight;
          const width = entity.parameters.width || 1;

          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
          });

          const mesh = new THREE.Mesh(geometry, material);
          setInitialVisibility(mesh);

          if (entity.parameters?.transform) {
            mesh.position.set(
              entity.parameters.transform.position.x,
              entity.parameters.transform.position.y,
              entity.parameters.transform.position.z
            );
            mesh.rotation.set(
              THREE.MathUtils.degToRad(entity.parameters.transform.rotate.x),
              THREE.MathUtils.degToRad(entity.parameters.transform.rotate.y),
              THREE.MathUtils.degToRad(entity.parameters.transform.rotate.z)
            );
            const baseScale = width;
            mesh.scale.set(
              entity.parameters.transform.scale.x * baseScale,
              entity.parameters.transform.scale.y *
                baseScale *
                (1 / aspectRatio),
              entity.parameters.transform.scale.z * baseScale
            );
          }

          const handleVideoClick = (event: MouseEvent) => {
            if (!renderer || !camera) return;
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(mesh);
            if (intersects.length > 0) {
              if (video.paused) {
                video.play().catch((error) => {
                  logger.warn("视频播放失败:", error);
                });
              } else {
                video.pause();
              }
            }
          };

          renderer!.domElement.addEventListener("click", handleVideoClick);

          const uuid = entity.parameters.uuid.toString();
          sources.set(uuid, {
            type: "video",
            data: {
              mesh,
              video,
              texture,
              cleanup: () => {
                renderer!.domElement.removeEventListener(
                  "click",
                  handleVideoClick
                );
              },
              setVisibility: (isVisible: boolean) => {
                mesh.visible = isVisible;
              },
            },
          });

          threeScene.add(mesh);

          if (entity.parameters.play) {
            const handleFirstInteraction = () => {
              video.play().catch((error) => {
                logger.warn("视频播放失败:", error);
              });
              document.removeEventListener("click", handleFirstInteraction);
              document.removeEventListener("touchstart", handleFirstInteraction);
            };
            document.addEventListener("click", handleFirstInteraction);
            document.addEventListener("touchstart", handleFirstInteraction);
          }

          resolve(mesh);
        });

        video.addEventListener("error", (error) => {
          logger.error("视频加载失败:", error);
          reject(error);
        });
      } catch (error) {
        logger.error("处理视频资源时出错:", error);
        reject(error);
      }
    });
  }

  // ── 处理图片类型 ──────────────────────────────────────────────────────────

  if (resource.type === "picture" || entity.type === "Picture") {
    return new Promise((resolve, reject) => {
      const textureLoader = new THREE.TextureLoader();
      const url =
        "file" in resource && resource.file?.url
          ? convertToHttps(resource.file.url)
          : "";

      textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          if (renderer) {
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          }

          const aspectRatio = texture.image.width / texture.image.height;
          const width = entity.parameters.width || 1;

          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: true,
            depthTest: true,
          });

          const mesh = new THREE.Mesh(geometry, material);
          setInitialVisibility(mesh);

          if (entity.parameters?.transform) {
            mesh.position.set(
              entity.parameters.transform.position.x,
              entity.parameters.transform.position.y,
              entity.parameters.transform.position.z
            );
            mesh.rotation.set(
              THREE.MathUtils.degToRad(entity.parameters.transform.rotate.x),
              THREE.MathUtils.degToRad(entity.parameters.transform.rotate.y),
              THREE.MathUtils.degToRad(entity.parameters.transform.rotate.z)
            );
            const baseScale = width;
            mesh.scale.set(
              entity.parameters.transform.scale.x * baseScale,
              entity.parameters.transform.scale.y *
                baseScale *
                (1 / aspectRatio),
              entity.parameters.transform.scale.z * baseScale
            );
          }

          mesh.renderOrder = 1;

          const uuid = entity.parameters.uuid.toString();
          sources.set(uuid, {
            type: "picture",
            data: {
              mesh,
              setVisibility: (isVisible: boolean) => {
                mesh.visible = isVisible;
              },
            },
          });

          threeScene.add(mesh);
          resolve(mesh);
        },
        undefined,
        reject
      );
    });
  }

  // ── 处理音频类型 ──────────────────────────────────────────────────────────

  if (resource.type === "audio" || entity.type === "Sound") {
    return new Promise((resolve) => {
      const uuid = entity.parameters.uuid.toString();
      const audioUrl =
        "file" in resource && resource.file?.url
          ? convertToHttps(resource.file.url)
          : "";

      sources.set(uuid, {
        type: "audio",
        data: { url: audioUrl },
      });

      logger.log("音频资源加载完成:", { uuid, url: audioUrl });
      resolve(true);
    });
  }

  // ── 处理文本类型 ──────────────────────────────────────────────────────────

  if (resource.type === "text" || entity.type === "Text") {
    return new Promise((resolve, reject) => {
      try {
        const text =
          entity.parameters.text || getResourceContent(resource) || "默认文本";
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("无法创建 2D 上下文");
        }

        canvas.width = 512;
        canvas.height = 128;
        context.fillStyle = entity.parameters.color || "#000000";
        context.font = `${entity.parameters.fontSize || 48}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const geometry = new THREE.PlaneGeometry(1, 0.25);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        setInitialVisibility(mesh);

        if (entity.parameters?.transform) {
          mesh.position.set(
            entity.parameters.transform.position.x,
            entity.parameters.transform.position.y,
            entity.parameters.transform.position.z
          );
          mesh.rotation.set(
            THREE.MathUtils.degToRad(entity.parameters.transform.rotate.x),
            THREE.MathUtils.degToRad(entity.parameters.transform.rotate.y),
            THREE.MathUtils.degToRad(entity.parameters.transform.rotate.z)
          );
          mesh.scale.set(
            entity.parameters.transform.scale.x,
            entity.parameters.transform.scale.y,
            entity.parameters.transform.scale.z
          );
        }

        const uuid = entity.parameters.uuid.toString();
        sources.set(uuid, {
          type: "text",
          data: {
            mesh,
            setText: (newText: string) => {
              context.clearRect(0, 0, canvas.width, canvas.height);
              context.fillStyle = entity.parameters.color || "#000000";
              context.font = `${entity.parameters.fontSize || 48}px Arial`;
              context.textAlign = "center";
              context.textBaseline = "middle";
              context.fillText(newText, canvas.width / 2, canvas.height / 2);
              texture.needsUpdate = true;
            },
            setVisibility: (isVisible: boolean) => {
              mesh.visible = isVisible;
            },
          },
        });

        threeScene.add(mesh);
        resolve(mesh);
      } catch (error) {
        logger.error("创建文本实体失败:", error);
        reject(error);
      }
    });
  }

  // ── 处理体素类型 ──────────────────────────────────────────────────────────

  if (resource.type === "voxel" || entity.type === "Voxel") {
    const loader = new VOXLoader();
    const url =
      "file" in resource && resource.file?.url
        ? convertToHttps(resource.file.url)
        : "";

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        async (chunks: unknown[]) => {
          try {
            const chunk = chunks[0] as {
              data: unknown[];
              size: TransformAxis;
              palette: unknown[];
            };
            if (!chunk || !chunk.data || !chunk.size) {
              throw new Error("无效的VOX数据结构");
            }

            logger.log("创建VOX模型:", {
              size: chunk.size,
              dataLength: chunk.data.length,
              paletteLength: chunk.palette.length,
            });

            const voxMesh = new VOXMesh(chunk, 1);
            setInitialVisibility(voxMesh);

            if (entity.parameters?.transform) {
              voxMesh.position.set(
                entity.parameters.transform.position.x,
                entity.parameters.transform.position.y,
                entity.parameters.transform.position.z
              );
              voxMesh.rotation.set(
                THREE.MathUtils.degToRad(entity.parameters.transform.rotate.x),
                THREE.MathUtils.degToRad(entity.parameters.transform.rotate.y),
                THREE.MathUtils.degToRad(entity.parameters.transform.rotate.z)
              );
              voxMesh.scale.set(
                entity.parameters.transform.scale.x,
                entity.parameters.transform.scale.y,
                entity.parameters.transform.scale.z
              );
            }

            const uuid = entity.parameters.uuid.toString();
            voxMesh.uuid = uuid;

            // 处理子实体
            if (entity.children?.entities) {
              const childMeshes = await Promise.all(
                entity.children.entities.map((childEntity: EntityNode) => {
                  const resourceId = childEntity.parameters?.resource;
                  if (resourceId) {
                    const childResource = findResource(resourceId);
                    if (childResource) {
                      return loadModel(
                        childResource,
                        childEntity,
                        currentActive && voxMesh.visible
                      );
                    }
                  } else if (childEntity.type === "Text") {
                    const textResource: ResourceLike = {
                      type: "text",
                      content: childEntity.parameters.text || "DEFAULT TEXT",
                      id: childEntity.parameters.uuid || crypto.randomUUID(),
                    };
                    return loadModel(
                      textResource,
                      childEntity,
                      currentActive && voxMesh.visible
                    );
                  }
                  return null;
                })
              );

              childMeshes.forEach((childMesh) => {
                if (childMesh instanceof THREE.Object3D) {
                  voxMesh.add(childMesh);
                }
              });
            }

            voxMesh.castShadow = true;
            voxMesh.receiveShadow = true;

            if (entity.children?.components) {
              const actionComponent = entity.children.components.find(
                (comp) => comp.type === "Action"
              );
              const triggerComponent = entity.children.components.find(
                (comp) => comp.type === "Trigger"
              );
              const rotateComponent = entity.children.components.find(
                (comp) => comp.type === "Rotate"
              );
              const movedComponent = entity.children.components.find(
                (comp) => comp.type === "Moved"
              );

              const sourceData: SourceRecord = {
                type: "model",
                data: {
                  mesh: voxMesh,
                  setVisibility: (isVisible: boolean) => {
                    voxMesh.visible = isVisible;
                  },
                  cleanup: undefined as (() => void) | undefined,
                  updateBoundingBox: undefined as (() => void) | undefined,
                  setRotating: undefined as
                    | ((isRotating: boolean) => void)
                    | undefined,
                },
              };

              // 处理点击事件
              if (actionComponent) {
                logger.log("发现点击触发组件:", actionComponent);
                let isExecuting = false;

                const handleClick = async (event: MouseEvent) => {
                  if (!voxMesh.visible) return;
                  if (!renderer || !camera) return;
                  if (isExecuting) {
                    logger.log("事件正在执行中，请等待完成...");
                    return;
                  }

                  const rect = renderer.domElement.getBoundingClientRect();
                  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                  mouse.y =
                    -((event.clientY - rect.top) / rect.height) * 2 + 1;

                  raycaster.setFromCamera(mouse, camera);
                  const intersects = raycaster.intersectObject(voxMesh, true);

                  if (intersects.length > 0) {
                    logger.log("体素模型被点击:", uuid);
                    const eventId = actionComponent.parameters.uuid;
                    try {
                      isExecuting = true;
                      await triggerEvent(eventId);
                    } catch (error) {
                      logger.error("执行事件处理函数失败:", error);
                    } finally {
                      isExecuting = false;
                    }
                  }
                };

                renderer!.domElement.addEventListener("click", handleClick);
                sourceData.data.cleanup = () => {
                  renderer!.domElement.removeEventListener(
                    "click",
                    handleClick
                  );
                };
              }

              // 处理碰撞检测
              if (triggerComponent) {
                logger.log("发现碰撞触发组件:", triggerComponent);
                const boundingBox = new THREE.Box3();
                boundingBox.setFromObject(voxMesh);
                const lastPosition = voxMesh.position.clone();

                if (triggerComponent.parameters.target) {
                  collisionObjects.value.push({
                    sourceUuid: uuid,
                    targetUuid: triggerComponent.parameters.target,
                    eventUuid: triggerComponent.parameters.uuid,
                    boundingBox: boundingBox,
                    isColliding: false,
                    lastPosition: lastPosition,
                    checkVisibility: true,
                  });
                }

                if (sourceData.type === "model") {
                  sourceData.data.updateBoundingBox = () => {
                    boundingBox.setFromObject(voxMesh);
                  };
                }
              }

              // 处理自旋转
              if (rotateComponent) {
                logger.log("发现自旋转组件:", rotateComponent);
                const speedValue = rotateComponent.parameters.speed;
                if (!speedValue) {
                  logger.warn("旋转组件缺少速度参数");
                  return;
                }
                const speed = {
                  x: THREE.MathUtils.degToRad(speedValue.x),
                  y: THREE.MathUtils.degToRad(speedValue.y),
                  z: THREE.MathUtils.degToRad(speedValue.z),
                };

                rotatingObjects.value.push({
                  mesh: voxMesh,
                  speed: speed,
                  checkVisibility: true,
                });

                sourceData.data.setRotating = (isRotating: boolean) => {
                  const index = rotatingObjects.value.findIndex(
                    (obj) => obj.mesh === voxMesh
                  );
                  if (index !== -1 && !isRotating) {
                    rotatingObjects.value.splice(index, 1);
                  } else if (index === -1 && isRotating) {
                    rotatingObjects.value.push({
                      mesh: voxMesh,
                      speed: speed,
                      checkVisibility: true,
                    });
                  }
                };
              }

              // 处理可移动
              if (movedComponent) {
                logger.log("发现可移动组件:", movedComponent);

                const limit = movedComponent.parameters.limit ?? {
                  x: { enable: false, min: 0, max: 0 },
                  y: { enable: false, min: 0, max: 0 },
                  z: { enable: false, min: 0, max: 0 },
                };
                const moveableObject = {
                  mesh: voxMesh,
                  isDragging: false,
                  magnetic: Boolean(movedComponent.parameters.magnetic),
                  scalable: Boolean(movedComponent.parameters.scalable),
                  limit,
                  checkVisibility: true,
                };

                moveableObjects.value.push(moveableObject);

                const onMouseDown = (event: MouseEvent) => {
                  event.preventDefault();
                  if (!renderer || !camera) return;
                  const rect = renderer.domElement.getBoundingClientRect();
                  mouse.x =
                    ((event.clientX - rect.left) / rect.width) * 2 - 1;
                  mouse.y =
                    -((event.clientY - rect.top) / rect.height) * 2 + 1;

                  raycaster.setFromCamera(mouse, camera);
                  const intersects = raycaster.intersectObject(voxMesh, true);

                  if (intersects.length > 0) {
                    logger.log("开始拖拽体素模型:", entity.parameters.uuid);
                    dragState.isDragging = true;
                    dragState.draggedObject = voxMesh;
                    dragState.dragStartPosition.copy(voxMesh.position);
                    dragState.mouseStartPosition.copy(mouse);
                    const intersectPoint = intersects[0].point;
                    dragState.dragOffset
                      .copy(voxMesh.position)
                      .sub(intersectPoint);
                    dragState.lastIntersection.copy(intersectPoint);
                    controls.value!.enabled = false;
                  }
                };

                const onMouseMove = (event: MouseEvent) => {
                  if (!dragState.isDragging || !dragState.draggedObject) return;
                  if (!renderer || !camera) return;

                  const rect = renderer.domElement.getBoundingClientRect();
                  const mouseCurrent = new THREE.Vector2(
                    ((event.clientX - rect.left) / rect.width) * 2 - 1,
                    -((event.clientY - rect.top) / rect.height) * 2 + 1
                  );

                  raycaster.setFromCamera(mouseCurrent, camera);

                  const cameraNormal = new THREE.Vector3(0, 0, -1);
                  cameraNormal.applyQuaternion(camera.quaternion);
                  const dragPlane = new THREE.Plane(
                    cameraNormal,
                    -dragState.dragStartPosition.dot(cameraNormal)
                  );

                  const intersection = new THREE.Vector3();

                  if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
                    intersection.add(dragState.dragOffset);

                    const currentMoveable = moveableObjects.value.find(
                      (obj) => obj.mesh === dragState.draggedObject
                    );

                    const newPosition = new THREE.Vector3();
                    newPosition.lerpVectors(
                      dragState.draggedObject.position,
                      intersection,
                      0.5
                    );

                    if (currentMoveable?.limit) {
                      if (currentMoveable.limit.x.enable) {
                        newPosition.x = THREE.MathUtils.clamp(
                          newPosition.x,
                          currentMoveable.limit.x.min,
                          currentMoveable.limit.x.max
                        );
                      }
                      if (currentMoveable.limit.y.enable) {
                        newPosition.y = THREE.MathUtils.clamp(
                          newPosition.y,
                          currentMoveable.limit.y.min,
                          currentMoveable.limit.y.max
                        );
                      }
                      if (currentMoveable.limit.z.enable) {
                        newPosition.z = THREE.MathUtils.clamp(
                          newPosition.z,
                          currentMoveable.limit.z.min,
                          currentMoveable.limit.z.max
                        );
                      }
                    }

                    dragState.draggedObject.position.copy(newPosition);
                    dragState.lastIntersection.copy(intersection);
                    logger.log("移动体素到位置:", newPosition);
                  }
                };

                const onMouseUp = () => {
                  if (dragState.isDragging) {
                    logger.log("结束拖拽体素");
                    dragState.isDragging = false;
                    dragState.draggedObject = null;
                    controls.value!.enabled = true;
                  }
                };

                renderer!.domElement.addEventListener("mousedown", onMouseDown);
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);

                const prevCleanup = sourceData.data.cleanup;
                sourceData.data.cleanup = () => {
                  if (prevCleanup) prevCleanup();
                  renderer!.domElement.removeEventListener(
                    "mousedown",
                    onMouseDown
                  );
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                };
              }

              logger.log("VOX模型加载完成:", {
                uuid,
                position: voxMesh.position.toArray(),
                rotation: voxMesh.rotation.toArray(),
                scale: voxMesh.scale.toArray(),
                modelSize: chunk.size,
              });

              sources.set(uuid, sourceData);
            } else {
              sources.set(uuid, {
                type: "model",
                data: {
                  mesh: voxMesh,
                  setVisibility: (isVisible: boolean) => {
                    voxMesh.visible = isVisible;
                  },
                },
              });
            }

            threeScene.add(voxMesh);
            resolve(voxMesh);
          } catch (error) {
            logger.error("处理VOX数据时出错:", error);
            reject(error);
          }
        },
        undefined,
        (error: unknown) => {
          logger.error("VOX模型加载失败:", error);
          reject(error);
        }
      );
    });
  }

  // ── 处理 GLTF 模型 ────────────────────────────────────────────────────────

  {
    const loader = getConfiguredGLTFLoader();
    const url =
      "file" in resource && resource.file?.url
        ? convertToHttps(resource.file.url)
        : "";
    if (!url) {
      return Promise.reject(new Error("资源缺少文件地址"));
    }

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        async (gltf) => {
          const model = gltf.scene;
          setInitialVisibility(model);
          const uuid = entity.parameters.uuid.toString();

          if (!entity.parameters || !entity.parameters.uuid) {
            logger.error("entity.parameters对象无效:", entity.parameters);
            return reject(new Error("Invalid entity.parameters object"));
          }

          model.uuid = uuid;

          if (entity.parameters?.transform) {
            model.position.set(
              entity.parameters.transform.position.x,
              entity.parameters.transform.position.y,
              entity.parameters.transform.position.z
            );
            model.rotation.set(
              entity.parameters.transform.rotate.x,
              entity.parameters.transform.rotate.y,
              entity.parameters.transform.rotate.z
            );
            model.scale.set(
              entity.parameters.transform.scale.x,
              entity.parameters.transform.scale.y,
              entity.parameters.transform.scale.z
            );
          }

          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            mixers.set(entity.parameters.uuid, mixer);
            model.userData.animations = gltf.animations;
            logger.log(`模型 ${entity.parameters.uuid} 动画加载完成:`, {
              animations: gltf.animations,
              animationNames: gltf.animations.map((a) => a.name),
            });
          }

          // 处理子实体
          if (entity.children?.entities) {
            const childMeshes = await Promise.all(
              entity.children.entities.map((childEntity: EntityNode) => {
                const resourceId = childEntity.parameters?.resource;
                if (resourceId) {
                  const childResource = findResource(resourceId);
                  if (childResource) {
                    return loadModel(
                      childResource,
                      childEntity,
                      currentActive && model.visible
                    );
                  }
                } else if (childEntity.type === "Text") {
                  const textResource: ResourceLike = {
                    type: "text",
                    content: childEntity.parameters.text || "DEFAULT TEXT",
                    id: childEntity.parameters.uuid || crypto.randomUUID(),
                  };
                  return loadModel(
                    textResource,
                    childEntity,
                    currentActive && model.visible
                  );
                }
                return null;
              })
            );

            childMeshes.forEach((childMesh) => {
              if (childMesh instanceof THREE.Object3D) {
                model.add(childMesh);
              }
            });
          }

          if (entity.children?.components) {
            const actionComponent = entity.children.components.find(
              (comp) => comp.type === "Action"
            );
            const triggerComponent = entity.children.components.find(
              (comp) => comp.type === "Trigger"
            );
            const rotateComponent = entity.children.components.find(
              (comp) => comp.type === "Rotate"
            );
            const movedComponent = entity.children.components.find(
              (comp) => comp.type === "Moved"
            );

            if (actionComponent) {
              logger.log("发现点击触发组件:", actionComponent);
              let isExecuting = false;

              const handleClick = async (event: MouseEvent) => {
                if (!model.visible) return;
                if (!renderer || !camera) return;
                if (isExecuting) {
                  logger.log("事件正在执行中，请等待完成...");
                  return;
                }

                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObject(model, true);

                if (intersects.length > 0) {
                  logger.log("模型被点击:", entity.parameters.uuid);
                  const eventId = actionComponent.parameters.uuid;
                  try {
                    isExecuting = true;
                    await triggerEvent(eventId);
                  } catch (error) {
                    logger.error("执行事件处理函数失败:", error);
                  } finally {
                    isExecuting = false;
                  }
                }
              };

              renderer!.domElement.addEventListener("click", handleClick);

              const sourceData: SourceRecord = {
                type: "model",
                data: {
                  mesh: model,
                  setVisibility: (isVisible: boolean) => {
                    model.visible = isVisible;
                  },
                  cleanup: () => {
                    renderer!.domElement.removeEventListener(
                      "click",
                      handleClick
                    );
                  },
                },
              };
              sources.set(uuid, sourceData);
            }

            if (triggerComponent) {
              logger.log("发现碰撞触发组件:", triggerComponent);

              const boundingBox = new THREE.Box3();
              boundingBox.setFromObject(model);
              const lastPosition = model.position.clone();

              if (triggerComponent.parameters.target) {
                collisionObjects.value.push({
                  sourceUuid: entity.parameters.uuid,
                  targetUuid: triggerComponent.parameters.target,
                  eventUuid: triggerComponent.parameters.uuid,
                  boundingBox: boundingBox,
                  isColliding: false,
                  lastPosition: lastPosition,
                  checkVisibility: true,
                });
              }

              const updateBoundingBox = () => {
                boundingBox.setFromObject(model);
              };

              const sourceData = sources.get(uuid);
              if (sourceData && sourceData.type === "model") {
                sourceData.data.updateBoundingBox = updateBoundingBox;
              }
            }

            if (rotateComponent) {
              logger.log("发现自旋转组件:", rotateComponent);

              const speedValue = rotateComponent.parameters.speed;
              if (!speedValue) {
                logger.warn("旋转组件缺少速度参数");
                return;
              }
              const speed = {
                x: THREE.MathUtils.degToRad(speedValue.x),
                y: THREE.MathUtils.degToRad(speedValue.y),
                z: THREE.MathUtils.degToRad(speedValue.z),
              };

              rotatingObjects.value.push({
                mesh: model,
                speed: speed,
                checkVisibility: true,
              });

              const sourceData: SourceRecord = {
                type: "model",
                data: {
                  mesh: model,
                  setVisibility: (isVisible: boolean) => {
                    model.visible = isVisible;
                  },
                  setRotating: (isRotating: boolean) => {
                    const index = rotatingObjects.value.findIndex(
                      (obj) => obj.mesh === model
                    );
                    if (index !== -1 && !isRotating) {
                      rotatingObjects.value.splice(index, 1);
                    } else if (index === -1 && isRotating) {
                      rotatingObjects.value.push({
                        mesh: model,
                        speed: speed,
                        checkVisibility: true,
                      });
                    }
                  },
                },
              };
              sources.set(uuid, sourceData);
            }

            if (movedComponent) {
              logger.log("发现可移动组件:", movedComponent);

              const limit = movedComponent.parameters.limit ?? {
                x: { enable: false, min: 0, max: 0 },
                y: { enable: false, min: 0, max: 0 },
                z: { enable: false, min: 0, max: 0 },
              };
              const moveableObject = {
                mesh: model,
                isDragging: false,
                magnetic: Boolean(movedComponent.parameters.magnetic),
                scalable: Boolean(movedComponent.parameters.scalable),
                limit,
                checkVisibility: true,
              };

              moveableObjects.value.push(moveableObject);

              const onMouseDown = (event: MouseEvent) => {
                event.preventDefault();
                if (!renderer || !camera) return;
                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x =
                  ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y =
                  -((event.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObject(model, true);

                if (intersects.length > 0) {
                  logger.log("开始拖拽模型:", entity.parameters.uuid);
                  dragState.isDragging = true;
                  dragState.draggedObject = model;
                  dragState.dragStartPosition.copy(model.position);
                  dragState.mouseStartPosition.copy(mouse);
                  const intersectPoint = intersects[0].point;
                  dragState.dragOffset
                    .copy(model.position)
                    .sub(intersectPoint);
                  dragState.lastIntersection.copy(intersectPoint);
                  controls.value!.enabled = false;
                }
              };

              const onMouseMove = (event: MouseEvent) => {
                if (!dragState.isDragging || !dragState.draggedObject) return;
                if (!renderer || !camera) return;

                const rect = renderer.domElement.getBoundingClientRect();
                const mouseCurrent = new THREE.Vector2(
                  ((event.clientX - rect.left) / rect.width) * 2 - 1,
                  -((event.clientY - rect.top) / rect.height) * 2 + 1
                );

                raycaster.setFromCamera(mouseCurrent, camera);

                const cameraNormal = new THREE.Vector3(0, 0, -1);
                cameraNormal.applyQuaternion(camera.quaternion);
                const dragPlane = new THREE.Plane(
                  cameraNormal,
                  -dragState.dragStartPosition.dot(cameraNormal)
                );

                const intersection = new THREE.Vector3();

                if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
                  intersection.add(dragState.dragOffset);

                  const currentMoveable = moveableObjects.value.find(
                    (obj) => obj.mesh === dragState.draggedObject
                  );

                  const newPosition = new THREE.Vector3();
                  newPosition.lerpVectors(
                    dragState.draggedObject.position,
                    intersection,
                    0.5
                  );

                  if (currentMoveable?.limit) {
                    if (currentMoveable.limit.x.enable) {
                      newPosition.x = THREE.MathUtils.clamp(
                        newPosition.x,
                        currentMoveable.limit.x.min,
                        currentMoveable.limit.x.max
                      );
                    }
                    if (currentMoveable.limit.y.enable) {
                      newPosition.y = THREE.MathUtils.clamp(
                        newPosition.y,
                        currentMoveable.limit.y.min,
                        currentMoveable.limit.y.max
                      );
                    }
                    if (currentMoveable.limit.z.enable) {
                      newPosition.z = THREE.MathUtils.clamp(
                        newPosition.z,
                        currentMoveable.limit.z.min,
                        currentMoveable.limit.z.max
                      );
                    }
                  }

                  dragState.draggedObject.position.copy(newPosition);
                  dragState.lastIntersection.copy(intersection);
                  logger.log("移动到位置:", newPosition);
                }
              };

              const onMouseUp = () => {
                if (dragState.isDragging) {
                  logger.log("结束拖拽");
                  dragState.isDragging = false;
                  dragState.draggedObject = null;
                  controls.value!.enabled = true;
                }
              };

              renderer!.domElement.addEventListener("mousedown", onMouseDown);
              document.addEventListener("mousemove", onMouseMove);
              document.addEventListener("mouseup", onMouseUp);

              const sourceData: SourceRecord = {
                type: "model",
                data: {
                  mesh: model,
                  setVisibility: (isVisible: boolean) => {
                    model.visible = isVisible;
                  },
                  cleanup: () => {
                    renderer!.domElement.removeEventListener(
                      "mousedown",
                      onMouseDown
                    );
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                  },
                },
              };
              sources.set(uuid, sourceData);
            } else {
              sources.set(uuid, {
                type: "model",
                data: {
                  mesh: model,
                  setVisibility: (isVisible: boolean) => {
                    model.visible = isVisible;
                  },
                },
              });
            }
          } else {
            sources.set(uuid, {
              type: "model",
              data: {
                mesh: model,
                setVisibility: (isVisible: boolean) => {
                  model.visible = isVisible;
                },
              },
            });
          }

          threeScene.add(model);
          resolve(model);
        },
        (progress) => {
          logger.log(
            `模型加载进度: ${((progress.loaded / progress.total) * 100).toFixed(2)}%`
          );
        },
        (error) => {
          logger.error("模型加载失败:", error);
          reject(error);
        }
      );
    });
  }
};

// ─── Entity processing ────────────────────────────────────────────────────────

/**
 * 递归处理实体列表，支持多级嵌套。
 */
const processEntities = async (
  entities: EntityNode[],
  parentTransform?: TransformData,
  level: number = 0,
  parentActive: boolean = true
) => {
  for (const entity of entities) {
    const entityTransform = combineTransforms(
      parentTransform,
      entity.parameters?.transform
    );

    const currentActive =
      (entity.parameters?.active !== undefined
        ? entity.parameters.active
        : true) && parentActive;

    logger.log(`处理实体 [Level ${level}]:`, {
      type: entity.type,
      name: entity.parameters?.name,
      uuid: entity.parameters?.uuid,
      originalTransform: entity.parameters?.transform,
      parentTransform,
      combinedTransform: entityTransform,
      isActive: currentActive,
      parentActive,
    });

    if (entity.type === "Text") {
      try {
        const textResource: ResourceLike = {
          type: "text",
          content: entity.parameters.text || "DEFAULT TEXT",
          id: entity.parameters.uuid || crypto.randomUUID(),
        };
        await loadModel(
          textResource,
          {
            ...entity,
            parameters: {
              ...entity.parameters,
              transform: entityTransform,
              active: currentActive,
            },
          },
          currentActive
        );
      } catch (error) {
        logger.error("处理文本实体失败:", error);
      }
    } else if (entity.type === "Entity") {
      logger.log("处理Entity类型容器:", entity.parameters.uuid);
      const entityData: SourceRecord = {
        type: "entity",
        data: {
          transform: entityTransform,
          setVisibility: () => {
            logger.log("Entity不支持直接设置可见性");
          },
        },
      };
      sources.set(entity.parameters.uuid, entityData);
    } else if (entity.parameters?.resource) {
      const resourceId = entity.parameters.resource;
      const resource = findResource(resourceId);
      if (resource) {
        try {
          await loadModel(
            resource,
            {
              ...entity,
              parameters: {
                ...entity.parameters,
                transform: entityTransform,
                active: currentActive,
              },
            },
            currentActive
          );
        } catch (error) {
          logger.error(`加载模型失败:`, error);
        }
      }
    }

    // 递归处理子实体
    if (entity.children?.entities) {
      await processEntities(
        entity.children.entities,
        entityTransform,
        level + 1,
        currentActive
      );
    }
  }
};

// ─── Verse-mode helpers ───────────────────────────────────────────────────────

type VerseMetaInfo = {
  id: string | number;
  data?: MetaData | string;
  events?: unknown;
};

const isVerseMetaInfo = (value: unknown): value is VerseMetaInfo =>
  isRecord(value) && ("id" in value || "data" in value || "events" in value);

/**
 * Verse 模式：解析 verse.data 字符串为对象。
 */
const parseVerseData = () => {
  if (!props.verse?.data) return null;
  if (typeof props.verse.data === "string") {
    try {
      return JSON.parse(props.verse.data) as { children?: { modules?: Entity[] } };
    } catch (error) {
      logger.error("解析verse数据失败:", error);
      return null;
    }
  }
  return props.verse.data as { children?: { modules?: Entity[] } };
};

/**
 * Verse 模式：初始化事件容器，从 metas 中收集事件定义。
 */
const initEventContainer = () => {
  const verseData = parseVerseData();
  if (!verseData?.children?.modules) return;

  verseData.children.modules.forEach((module) => {
    const moduleParams = module.parameters as ModuleParameters | undefined;
    if (!moduleParams?.meta_id || !moduleParams.uuid) return;

    const meta = props.verse!.metas.find(
      (candidate): candidate is VerseMetaInfo =>
        isVerseMetaInfo(candidate) &&
        String((candidate as VerseMetaInfo).id) === String(moduleParams.meta_id)
    );

    if (meta?.events) {
      try {
        eventContainer.value[moduleParams.uuid] = meta.events;
        logger.log(`Module ${moduleParams.uuid} 的事件已加载:`, meta.events);
      } catch (error) {
        logger.error(`解析Module ${moduleParams.uuid} 的事件失败:`, error);
      }
    }
  });
};

// ─── Audio API ────────────────────────────────────────────────────────────────

/** 获取音频 URL */
const getAudioUrl = (uuid: string): string | undefined => {
  const source = sources.get(uuid.toString());
  if (!source || source.type !== "audio") {
    logger.error(`找不到UUID为 ${uuid} 的音频资源`);
    return undefined;
  }
  return (source.data as SourceAudioData).url;
};

/** 音频播放处理 */
const handleAudioPlay = (audio: HTMLAudioElement): Promise<void> => {
  logger.log("开始处理音频播放:", {
    src: audio.src,
    duration: audio.duration,
    currentTime: audio.currentTime,
  });

  return new Promise<void>((resolve) => {
    audio.currentTime = 0;

    audio.onended = () => {
      logger.log("音频播放完成:", { src: audio.src, duration: audio.duration });
      resolve();
    };

    audio.onerror = () => {
      logger.error("音频播放出错:", { src: audio.src, error: audio.error });
      resolve();
    };

    audio.play().catch((error) => {
      logger.error("播放音频失败:", { src: audio.src, error });
      resolve();
    });
  });
};

const audioPlaybackQueue: { audio: HTMLAudioElement; resolve: (value: void | PromiseLike<void>) => void }[] = [];
let isPlaying = false;

/** 处理音频队列 */
const processAudioQueue = async () => {
  logger.log("处理音频队列:", {
    isPlaying,
    queueLength: audioPlaybackQueue.length,
  });

  if (isPlaying || audioPlaybackQueue.length === 0) return;

  isPlaying = true;

  while (audioPlaybackQueue.length > 0) {
    const current = audioPlaybackQueue[0];
    logger.log("播放队列中的音频:", {
      src: current.audio.src,
      queueLength: audioPlaybackQueue.length,
    });
    await handleAudioPlay(current.audio);
    current.resolve();
    audioPlaybackQueue.shift();
  }

  isPlaying = false;
  logger.log("音频队列处理完成");
};

/** 将音频加入播放队列，或跳过队列直接播放 */
const playQueuedAudio = async (
  audio: HTMLAudioElement,
  skipQueue: boolean = false
): Promise<void> => {
  logger.log("添加音频到播放队列:", {
    src: audio.src,
    skipQueue,
    currentQueueLength: audioPlaybackQueue.length,
  });

  if (skipQueue) {
    return handleAudioPlay(audio);
  }

  return new Promise<void>((resolve) => {
    audioPlaybackQueue.push({ audio, resolve });
    processAudioQueue();
  });
};

// ─── Animation API ────────────────────────────────────────────────────────────

/** 播放指定模型的指定动画 */
const playAnimation = (uuid: string, animationName: string) => {
  const source = sources.get(uuid.toString());
  if (!source || source.type !== "model") {
    logger.error(`找不到UUID为 ${uuid} 的模型资源`);
    return;
  }

  const model = (source.data as SourceModelData).mesh;
  const mixer = mixers.get(uuid);

  if (!model) {
    logger.error(
      `找不到UUID为 ${uuid} 的模型，可用模型:`,
      Array.from(sources.keys())
    );
    return;
  }

  if (!mixer) {
    logger.error(`找不到UUID为 ${uuid} 的动画混合器`);
    return;
  }

  const animations = model.userData?.animations;
  if (!animations || animations.length === 0) {
    logger.error(`模型 ${uuid} 没有动画数据`);
    return;
  }

  const clip = animations.find(
    (anim: THREE.AnimationClip) => anim.name === animationName
  );
  if (!clip) {
    logger.error(
      `找不到动画 "${animationName}"，可用动画:`,
      animations.map((a: THREE.AnimationClip) => a.name)
    );
    return;
  }

  mixer.stopAllAction();
  const action = mixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.fadeIn(0.5);
  action.play();
};

// ─── Scene initialization ─────────────────────────────────────────────────────

onMounted(async () => {
  if (!scene.value) return;

  const width = scene.value.clientWidth;
  const height = scene.value.clientHeight;

  // 渲染器设置
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setClearColor(isDark.value ? 0x242424 : 0xeeeeee, 1);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.value.appendChild(renderer.domElement);

  // 相机设置
  // Verse 模式使用更大的相机范围（maxDistance=1000），Meta 模式使用 500
  const maxDistance = mode.value === "verse" ? 1000 : 500;
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1800);
  camera.position.set(0, 7, 20);

  // 主环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  threeScene.add(ambientLight);

  // 主平行光
  const mainLight = new THREE.DirectionalLight(0xffffff, 2);
  mainLight.castShadow = true;
  mainLight.position.set(5, 10, 5);
  threeScene.add(mainLight);

  // 补光
  const fillLight = new THREE.PointLight(0xffffff, 0.05);
  fillLight.castShadow = true;
  fillLight.position.set(0, 0, 0);
  threeScene.add(fillLight);

  // 轨道控制器设置
  controls.value = new OrbitControls(camera, renderer.domElement);
  controls.value.enableDamping = true;
  controls.value.dampingFactor = 0.05;
  controls.value.screenSpacePanning = true;
  controls.value.minDistance = 1;
  controls.value.maxDistance = maxDistance;

  // ── 加载场景数据 ────────────────────────────────────────────────────────

  if (mode.value === "meta" && props.meta) {
    // Meta 模式：直接从 meta.data 加载实体
    const metaData = props.meta.data;
    logger.log("解析后的metaData:", metaData);

    if (isMetaData(metaData) && metaData.children?.entities) {
      await processEntities(metaData.children.entities);
    } else {
      logger.error("metaData格式错误:", metaData);
    }
  } else if (mode.value === "verse" && props.verse) {
    // Verse 模式：遍历 modules -> metas -> entities 三层结构
    const verseData = parseVerseData();
    logger.log("解析后的verse全部数据:", props.verse);

    if (verseData?.children?.modules) {
      for (const module of verseData.children.modules) {
        const moduleParams = module.parameters as ModuleParameters | undefined;
        if (!moduleParams?.meta_id) continue;

        const metaId = moduleParams.meta_id;
        const meta = props.verse.metas.find(
          (candidate): candidate is VerseMetaInfo =>
            isVerseMetaInfo(candidate) &&
            String((candidate as VerseMetaInfo).id) === String(metaId)
        );

        if (meta && meta.data) {
          const metaData =
            typeof meta.data === "string"
              ? (JSON.parse(meta.data) as MetaData)
              : meta.data;

          logger.log("解析后的metaData:", metaData);

          if (metaData.children?.entities) {
            await processEntities(
              metaData.children.entities,
              moduleParams.transform as TransformData | undefined
            );
          }
        }
      }
    }

    initEventContainer();
    logger.log("事件容器:", eventContainer.value);
  }

  // ── 性能监控（Verse 模式启用 Stats）────────────────────────────────────

  let stats: Stats | null = null;
  if (mode.value === "verse") {
    stats = new Stats();
    stats.showPanel(0); // 0: fps
    stats.dom.style.position = "absolute";
    stats.dom.style.top = "0px";
    stats.dom.style.left = "0px";
    if (scene.value) {
      scene.value.appendChild(stats.dom);
    }
  }

  // ── 动画循环 ────────────────────────────────────────────────────────────

  const animate = () => {
    stats?.begin();
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    mixers.forEach((mixer) => mixer.update(delta));

    // 更新旋转
    rotatingObjects.value.forEach((obj) => {
      if (obj.checkVisibility && !obj.mesh.visible) return;
      obj.mesh.rotation.x += obj.speed.x * delta;
      obj.mesh.rotation.y += obj.speed.y * delta;
      obj.mesh.rotation.z += obj.speed.z * delta;
    });

    // 碰撞检测
    if (collisionObjects.value.length > 0) {
      for (const collisionObj of collisionObjects.value) {
        const source = sources.get(collisionObj.sourceUuid);
        const target = sources.get(collisionObj.targetUuid);
        const sourceModel =
          source && source.type === "model"
            ? (source.data as SourceModelData).mesh
            : undefined;
        const targetModel =
          target && target.type === "model"
            ? (target.data as SourceModelData).mesh
            : undefined;

        if (!sourceModel || !targetModel) continue;

        if (
          collisionObj.checkVisibility &&
          (!sourceModel.visible || !targetModel.visible)
        ) {
          continue;
        }

        if (!sourceModel.position.equals(collisionObj.lastPosition)) {
          collisionObj.boundingBox.setFromObject(sourceModel);
          const targetBoundingBox = new THREE.Box3().setFromObject(targetModel);
          const isColliding =
            collisionObj.boundingBox.intersectsBox(targetBoundingBox);

          if (isColliding && !collisionObj.isColliding) {
            collisionObj.isColliding = true;
            logger.log("检测到碰撞:", {
              source: collisionObj.sourceUuid,
              target: collisionObj.targetUuid,
            });
            // 使用统一的事件触发（根据模式调用 window.meta 或 window.verse）
            triggerEvent(collisionObj.eventUuid).catch((error) => {
              logger.error("执行碰撞事件处理函数失败:", error);
            });
          } else if (!isColliding && collisionObj.isColliding) {
            collisionObj.isColliding = false;
          }

          collisionObj.lastPosition.copy(sourceModel.position);
        }
      }
    }

    controls.value!.update();
    renderer!.render(threeScene, camera!);
    stats?.end();
  };
  animate();

  // ── 窗口大小响应 ─────────────────────────────────────────────────────────

  const handleResize = () => {
    if (!scene.value || !camera || !renderer) return;
    const newWidth = scene.value.clientWidth;
    const newHeight = scene.value.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight, true);
    renderer.render(threeScene, camera);
  };

  const resizeObserver = new ResizeObserver(() => {
    handleResize();
  });
  if (scene.value) {
    resizeObserver.observe(scene.value);
  }

  // 监听全屏状态变化
  watch(
    () => props.isSceneFullscreen,
    () => {
      setTimeout(() => handleResize(), 50);
      setTimeout(() => handleResize(), 100);
    }
  );

  onUnmounted(() => {
    resizeObserver.disconnect();
    window.removeEventListener("resize", handleResize);
  });
});

// ─── Watchers ─────────────────────────────────────────────────────────────────

// 监听主题变化
watch(isDark, (newValue) => {
  if (renderer) {
    renderer.setClearColor(newValue ? 0x242424 : 0xeeeeee, 1);
  }
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────

onUnmounted(() => {
  sources.forEach((source) => {
    if (source.type === "video") {
      const videoData = source.data as SourceVideoData;
      videoData.video.pause();
      videoData.video.src = "";
      videoData.video.load();
      if (videoData.cleanup) {
        videoData.cleanup();
      }
    } else if (source.type === "audio") {
      while (audioPlaybackQueue.length > 0) {
        const queueItem = audioPlaybackQueue.shift();
        if (queueItem) {
          queueItem.audio.pause();
          queueItem.audio.src = "";
          queueItem.audio.load();
          queueItem.resolve();
        }
      }
    }
  });

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }

  isPlaying = false;
  sources.clear();
  mixers.clear();
  clock = new THREE.Clock();

  collisionObjects.value = [];
  rotatingObjects.value = [];
  moveableObjects.value = [];
  dragState.isDragging = false;
  dragState.draggedObject = null;
});

// ─── Exposed API ──────────────────────────────────────────────────────────────

defineExpose({
  sources,
  playAnimation,
  getAudioUrl,
  playQueuedAudio,
  sceneInstanceId,
});
</script>

<style scoped>
#scene {
  transition: height 0.3s ease;
}
</style>
