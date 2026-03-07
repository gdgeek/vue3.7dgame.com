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
 * ScenePlayer component
 *
 * Supports Meta mode (single entity tree) and Verse mode
 * (Modules -> Meta -> Entities nesting). Pass `meta` or `verse` via props.
 *
 * Exposed API: sources, playAnimation, getAudioUrl, playQueuedAudio, sceneInstanceId
 */
import { logger } from "@/utils/logger";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ref, onMounted, onUnmounted, watch, computed, reactive } from "vue";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";
import type { MetaInfo } from "@/api/v1/types/meta";
import type {
  Verse,
  Entity,
  Resource,
  CollisionObject,
  RotatingObject,
  MoveableObject,
  DragState,
} from "@/types/verse";

// ── Composables ───────────────────────────────────────────────────────────────
import { useSceneAudio } from "./composables/useSceneAudio";
import { useSceneAnimation } from "./composables/useSceneAnimation";
import { useVerseMode } from "./composables/useVerseMode";
import { useThreeScene } from "./composables/useThreeScene";
import { useResourceLoaders } from "./composables/useResourceLoaders";

// ── Types ─────────────────────────────────────────────────────────────────────
import type {
  SourceRecord,
  ResourceLike,
  TransformData,
  LoaderContext,
} from "./types";

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  /** Meta data source (required in Meta mode) */
  meta?: MetaInfo;
  /** Verse data source (required in Verse mode) */
  verse?: Verse;
  /** Whether to display the scene in fullscreen (100vh) */
  isSceneFullscreen?: boolean;
}>();

// ─── Mode detection ───────────────────────────────────────────────────────────

const mode = computed<"meta" | "verse">(() =>
  props.meta !== undefined ? "meta" : "verse"
);

// ─── Instance ID ──────────────────────────────────────────────────────────────

/** Unique per-instance ID to namespace window.__sceneCallbacks and avoid conflicts. */
const sceneInstanceId =
  Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Store ────────────────────────────────────────────────────────────────────

const settingsStore = useSettingsStore();
const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

// ─── DOM ref ──────────────────────────────────────────────────────────────────

const scene = ref<HTMLDivElement | null>(null);

// ─── Shared Three.js state ────────────────────────────────────────────────────

const sources: Map<string, SourceRecord> = new Map();
const mixers: Map<string, THREE.AnimationMixer> = new Map();

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

/** External ref for OrbitControls — set by useThreeScene.setupScene. */
const controls = ref<OrbitControls | null>(null);
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

// ─── Three.js scene (created at setup level so threeScene is available now) ───

const sceneSetup = useThreeScene();
const { threeScene } = sceneSetup;

// ─── Helper: resource lookup ──────────────────────────────────────────────────

/**
 * Finds a resource by ID from the current mode's data source.
 * Meta mode uses props.meta.resources; Verse mode uses props.verse.resources.
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

// ─── Helper: event triggering ─────────────────────────────────────────────────

/**
 * Triggers a scene event using the instance-scoped __sceneCallbacks namespace.
 * Prevents cross-instance callback interference when multiple ScenePlayers exist.
 */
const triggerEvent = async (eventId: string): Promise<void> => {
  const callbacks = window.__sceneCallbacks?.[sceneInstanceId];
  if (!callbacks) return;
  const handler = callbacks[`@${eventId}`];
  if (typeof handler === "function") {
    await handler();
  }
};

// ─── isMetaData type guard ────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isMetaData = (value: unknown): value is { children?: { entities?: unknown[] } } =>
  isRecord(value) && ("children" in value || "entities" in value);

// ─── onMounted: full scene initialisation ─────────────────────────────────────

/** Holds the destroy() function returned by useResourceLoaders so onUnmounted can call it. */
let destroyLoaders: (() => void) | null = null;

onMounted(async () => {
  if (!scene.value) return;

  // ── Build LoaderContext ────────────────────────────────────────────────────

  // renderer and camera are not yet available; they will be populated below
  // after setupScene is called. LoaderContext holds plain references that
  // useResourceLoaders reads at call time, so late assignment is safe.
  const ctx: LoaderContext = {
    renderer: null,
    camera: null,
    threeScene,
    controls,
    mouse,
    raycaster,
    sources,
    mixers,
    collisionObjects,
    rotatingObjects,
    moveableObjects,
    dragState,
    sceneInstanceId,
    triggerEvent,
    findResource,
  };

  // ── Frame callback (used inside animation loop) ───────────────────────────

  const onFrame = (delta: number) => {
    mixers.forEach((mixer) => mixer.update(delta));

    // Rotate objects
    rotatingObjects.value.forEach((obj) => {
      if (obj.checkVisibility && !obj.mesh.visible) return;
      obj.mesh.rotation.x += obj.speed.x * delta;
      obj.mesh.rotation.y += obj.speed.y * delta;
      obj.mesh.rotation.z += obj.speed.z * delta;
    });

    // Collision detection
    if (collisionObjects.value.length > 0) {
      for (const collisionObj of collisionObjects.value) {
        const source = sources.get(collisionObj.sourceUuid);
        const target = sources.get(collisionObj.targetUuid);
        const sourceModel =
          source?.type === "model" ? source.data.mesh : undefined;
        const targetModel =
          target?.type === "model" ? target.data.mesh : undefined;

        if (!sourceModel || !targetModel) continue;
        if (
          collisionObj.checkVisibility &&
          (!sourceModel.visible || !targetModel.visible)
        ) {
          continue;
        }

        if (!sourceModel.position.equals(collisionObj.lastPosition)) {
          collisionObj.boundingBox.setFromObject(sourceModel);
          const targetBox = new THREE.Box3().setFromObject(targetModel);
          const isColliding = collisionObj.boundingBox.intersectsBox(targetBox);

          if (isColliding && !collisionObj.isColliding) {
            collisionObj.isColliding = true;
            logger.log("[ScenePlayer] Collision detected:", {
              source: collisionObj.sourceUuid,
              target: collisionObj.targetUuid,
            });
            triggerEvent(collisionObj.eventUuid).catch((error) => {
              logger.error("[ScenePlayer] Collision event handler failed:", error);
            });
          } else if (!isColliding && collisionObj.isColliding) {
            collisionObj.isColliding = false;
          }

          collisionObj.lastPosition.copy(sourceModel.position);
        }
      }
    }
  };

  // ── Initialise Three.js scene ─────────────────────────────────────────────

  sceneSetup.setupScene(scene.value, {
    isDark: isDark.value,
    mode: mode.value,
    controls,
    onFrame,
  });

  // Populate ctx with renderer and camera now that setupScene has run
  ctx.renderer = sceneSetup.getRenderer();
  ctx.camera = sceneSetup.getCamera();

  // ── Initialise resource loaders ───────────────────────────────────────────

  const { processEntities, destroy } = useResourceLoaders(ctx);
  destroyLoaders = destroy;

  // ── Load scene data ───────────────────────────────────────────────────────

  if (mode.value === "meta" && props.meta) {
    const metaData = props.meta.data;
    logger.log("[ScenePlayer] Parsed metaData:", metaData);

    if (isMetaData(metaData) && metaData.children?.entities) {
      await processEntities(metaData.children.entities as import("./types").EntityNode[]);
    } else {
      logger.error("[ScenePlayer] Invalid metaData format:", metaData);
    }
  } else if (mode.value === "verse" && props.verse) {
    const { parseVerseData, isVerseMetaInfo, initEventContainer, eventContainer } =
      useVerseMode(props.verse);

    const verseData = parseVerseData();
    logger.log("[ScenePlayer] Parsed verse data:", props.verse);

    if (verseData?.children?.modules) {
      for (const module of verseData.children.modules as Entity[]) {
        const moduleParams = module.parameters as {
          meta_id?: string | number;
          uuid: string;
          transform?: TransformData;
          [key: string]: unknown;
        } | undefined;

        if (!moduleParams?.meta_id) continue;

        const metaId = moduleParams.meta_id;
        const meta = props.verse.metas.find(
          (candidate): candidate is import("./types").VerseMetaInfo =>
            isVerseMetaInfo(candidate) &&
            String((candidate as import("./types").VerseMetaInfo).id) === String(metaId)
        );

        if (meta?.data) {
          let metaData: { children?: { entities?: import("./types").EntityNode[] } } | null = null;
          if (typeof meta.data === "string") {
            try {
              metaData = JSON.parse(meta.data) as { children?: { entities?: import("./types").EntityNode[] } };
            } catch (e) {
              logger.warn("[ScenePlayer] Failed to parse meta.data JSON, skipping module:", e);
              continue;
            }
          } else {
            metaData = meta.data as { children?: { entities?: import("./types").EntityNode[] } };
          }

          logger.log("[ScenePlayer] Parsed metaData:", metaData);

          if (metaData?.children?.entities) {
            await processEntities(metaData.children.entities, moduleParams.transform);
          }
        }
      }
    }

    initEventContainer();
    logger.log("[ScenePlayer] Event container:", eventContainer.value);
  }

  // ── ResizeObserver / fullscreen watcher ───────────────────────────────────

  watch(
    () => props.isSceneFullscreen,
    () => {
      if (!scene.value) return;
      setTimeout(() => sceneSetup.handleResize(scene.value!), 50);
      setTimeout(() => sceneSetup.handleResize(scene.value!), 100);
    }
  );
});

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(isDark, (newValue) => {
  sceneSetup.updateTheme(newValue);
});

// ─── Composable-backed public API ─────────────────────────────────────────────

const { playAnimation } = useSceneAnimation(sources, mixers);
const { getAudioUrl, playQueuedAudio, cleanup: cleanupAudio } = useSceneAudio(sources);

// ─── Cleanup ──────────────────────────────────────────────────────────────────

onUnmounted(() => {
  // Mark async loaders as destroyed so any in-flight callbacks become no-ops
  destroyLoaders?.();

  // Clean up all sources: stop video elements and call any registered cleanup functions
  sources.forEach((source) => {
    if (source.type === "video") {
      const videoData = source.data as import("./types").SourceVideoData;
      videoData.video.pause();
      videoData.video.src = "";
      videoData.video.load();
    }
    // Call cleanup for any source type that provides one (video, model, picture, etc.)
    (source.data as { cleanup?: () => void }).cleanup?.();
  });

  // Drain audio queue
  cleanupAudio();

  // Dispose Three.js renderer
  sceneSetup.cleanupScene();

  // Reset runtime state
  sceneSetup.resetClock();
  sources.clear();
  mixers.clear();

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
