/**
 * Resource loading composable for ScenePlayer.
 *
 * Extracts loadModel and processEntities from index.vue.
 * Handles video, picture, audio, text, voxel (VOX), and GLTF model types.
 *
 * Uses applyComponents from useComponentHandlers for Action/Trigger/Rotate/Moved
 * component handling, eliminating ~250 lines of duplicated inline code.
 */
import * as THREE from "three";
import { convertToHttps } from "@/assets/js/helper";
import { VOXLoader, VOXMesh } from "@/assets/js/voxel/VOXLoader.js";
import { getConfiguredGLTFLoader } from "@/lib/three/loaders";
import { logger } from "@/utils/logger";
import { applyComponents } from "./useComponentHandlers";
import type {
  LoaderContext,
  EntityNode,
  TransformData,
  ResourceLike,
  SourceRecord,
  SourceVideoData,
} from "../types";

// ─── Pure utility ─────────────────────────────────────────────────────────────

/**
 * Combines a parent transform with a child transform.
 * Position is rotated and scaled by the parent before being added.
 * Rotation is summed; scale is multiplied.
 *
 * Exported as a standalone pure function so it can be unit-tested independently.
 */
export function combineTransforms(
  parentTransform: TransformData | undefined,
  childTransform: TransformData | undefined
): TransformData {
  if (!parentTransform) {
    return (
      childTransform ?? {
        position: { x: 0, y: 0, z: 0 },
        rotate: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      }
    );
  }

  if (!childTransform) {
    return parentTransform;
  }

  // Build parent rotation matrix
  const parentRotationMatrix = new THREE.Matrix4();
  const parentRotationEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(parentTransform.rotate.x),
    THREE.MathUtils.degToRad(parentTransform.rotate.y),
    THREE.MathUtils.degToRad(parentTransform.rotate.z),
    "XYZ"
  );
  parentRotationMatrix.makeRotationFromEuler(parentRotationEuler);

  // Apply parent rotation to child position
  const childPosition = new THREE.Vector3(
    childTransform.position.x,
    childTransform.position.y,
    childTransform.position.z
  );
  childPosition.applyMatrix4(parentRotationMatrix);

  // Apply parent scale to child position
  childPosition.multiply(
    new THREE.Vector3(
      parentTransform.scale.x,
      parentTransform.scale.y,
      parentTransform.scale.z
    )
  );

  return {
    position: {
      x: parentTransform.position.x + childPosition.x,
      y: parentTransform.position.y + childPosition.y,
      z: parentTransform.position.z + childPosition.z,
    },
    rotate: {
      x: parentTransform.rotate.x + childTransform.rotate.x,
      y: parentTransform.rotate.y + childTransform.rotate.y,
      z: parentTransform.rotate.z + childTransform.rotate.z,
    },
    scale: {
      x: parentTransform.scale.x * childTransform.scale.x,
      y: parentTransform.scale.y * childTransform.scale.y,
      z: parentTransform.scale.z * childTransform.scale.z,
    },
  };
}

// ─── Composable ───────────────────────────────────────────────────────────────

/**
 * Provides loadModel and processEntities functions that use the shared LoaderContext.
 *
 * @param ctx - Shared mutable context with renderer, camera, scene, sources, etc.
 */
export function useResourceLoaders(ctx: LoaderContext) {
  const { threeScene, sources, mixers, findResource } = ctx;

  /** Set to true on destroy() to prevent post-unmount async callbacks from mutating scene state. */
  let _destroyed = false;
  const destroy = () => { _destroyed = true; };

  /**
   * Returns the file URL from a ResourceLike, or an empty string if unavailable.
   */
  const getFileUrl = (resource: ResourceLike): string =>
    "file" in resource && resource.file?.url ? resource.file.url : "";

  /**
   * Returns the text content from a ResourceLike, or undefined.
   */
  const getResourceContent = (resource: ResourceLike): string | undefined => {
    if ("content" in resource && typeof (resource as { content?: unknown }).content === "string") {
      return (resource as { content: string }).content;
    }
    return undefined;
  };

  /**
   * Applies standard transform data (position/rotation/scale) to a Three.js object.
   */
  const applyTransform = (mesh: THREE.Object3D, transform: TransformData, useRadians = false) => {
    mesh.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z
    );
    if (useRadians) {
      mesh.rotation.set(
        transform.rotate.x,
        transform.rotate.y,
        transform.rotate.z
      );
    } else {
      mesh.rotation.set(
        THREE.MathUtils.degToRad(transform.rotate.x),
        THREE.MathUtils.degToRad(transform.rotate.y),
        THREE.MathUtils.degToRad(transform.rotate.z)
      );
    }
    mesh.scale.set(
      transform.scale.x,
      transform.scale.y,
      transform.scale.z
    );
  };

  // ─── loadModel ──────────────────────────────────────────────────────────────

  /**
   * Loads a single resource and adds it to the Three.js scene.
   * Supports: video, picture, audio, text, voxel (VOX), and GLTF model types.
   *
   * @param resource     - Resource descriptor (type, file url, content, etc.)
   * @param entity       - Entity node with parameters (uuid, transform, active, etc.)
   * @param parentActive - Visibility state inherited from the parent entity
   * @returns The loaded Object3D, `true` for non-mesh types (audio), or undefined
   */
  const loadModel = async (
    resource: ResourceLike,
    entity: EntityNode,
    parentActive: boolean = true
  ): Promise<THREE.Object3D | boolean | undefined> => {
    logger.log("[ScenePlayer] Loading model:", {
      entityType: entity.type,
      entityUUID: entity.parameters?.uuid,
      resourceType: resource.type,
      isActive: entity.parameters.active,
      parentActive,
    });

    // Effective visibility combines entity active flag with parent visibility
    const currentActive =
      (entity.parameters?.active !== undefined ? entity.parameters.active : true) && parentActive;

    const setInitialVisibility = (mesh: THREE.Object3D): boolean => {
      mesh.visible = currentActive;
      logger.log(
        `[ScenePlayer] Setting initial visibility for ${entity.parameters.uuid}:`,
        mesh.visible,
        `(parentActive: ${parentActive}, entityActive: ${entity.parameters.active})`
      );
      return currentActive;
    };

    // ── Video ────────────────────────────────────────────────────────────────

    if (resource.type === "video" || entity.type === "Video") {
      return new Promise((resolve, reject) => {
        try {
          const video = document.createElement("video");
          const videoUrl = getFileUrl(resource);
          video.src = convertToHttps(videoUrl);
          video.crossOrigin = "anonymous";
          video.loop = entity.parameters.loop ?? false;
          video.muted = entity.parameters.muted ?? false;
          video.playsInline = true;
          video.volume = entity.parameters.volume ?? 1.0;

          const texture = new THREE.VideoTexture(video);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.format = THREE.RGBAFormat;

          video.addEventListener("loadedmetadata", () => {
            if (_destroyed) return;
            const aspectRatio = video.videoWidth / video.videoHeight;
            const width = entity.parameters.width ?? 1;

            const geometry = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({
              map: texture,
              side: THREE.DoubleSide,
              transparent: true,
            });

            const mesh = new THREE.Mesh(geometry, material);
            setInitialVisibility(mesh);

            if (entity.parameters?.transform) {
              const t = entity.parameters.transform;
              mesh.position.set(t.position.x, t.position.y, t.position.z);
              mesh.rotation.set(
                THREE.MathUtils.degToRad(t.rotate.x),
                THREE.MathUtils.degToRad(t.rotate.y),
                THREE.MathUtils.degToRad(t.rotate.z)
              );
              const baseScale = width;
              mesh.scale.set(
                t.scale.x * baseScale,
                t.scale.y * baseScale * (1 / aspectRatio),
                t.scale.z * baseScale
              );
            }

            const handleVideoClick = (event: MouseEvent) => {
              const { renderer, camera, mouse, raycaster } = ctx;
              if (!renderer || !camera) return;
              const rect = renderer.domElement.getBoundingClientRect();
              mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
              raycaster.setFromCamera(mouse, camera);
              const intersects = raycaster.intersectObject(mesh);
              if (intersects.length > 0) {
                if (video.paused) {
                  video.play().catch((error) => {
                    logger.warn("[ScenePlayer] Video playback failed:", error);
                  });
                } else {
                  video.pause();
                }
              }
            };

            ctx.renderer!.domElement.addEventListener("click", handleVideoClick);

            // Mutable reference so cleanup can remove the listener even if the
            // first interaction never fires before the component unmounts.
            let handleFirstInteraction: (() => void) | null = null;

            const uuid = entity.parameters.uuid.toString();
            const sourceData: SourceRecord = {
              type: "video",
              data: {
                mesh,
                video,
                texture,
                cleanup: () => {
                  ctx.renderer!.domElement.removeEventListener("click", handleVideoClick);
                  if (handleFirstInteraction) {
                    document.removeEventListener("click", handleFirstInteraction);
                    document.removeEventListener("touchstart", handleFirstInteraction);
                    handleFirstInteraction = null;
                  }
                },
                setVisibility: (isVisible: boolean) => { mesh.visible = isVisible; },
              } as SourceVideoData,
            };
            sources.set(uuid, sourceData);
            threeScene.add(mesh);

            if (entity.parameters.play) {
              handleFirstInteraction = () => {
                video.play().catch((error) => {
                  logger.warn("[ScenePlayer] Video auto-play failed:", error);
                });
                document.removeEventListener("click", handleFirstInteraction!);
                document.removeEventListener("touchstart", handleFirstInteraction!);
                handleFirstInteraction = null;
              };
              document.addEventListener("click", handleFirstInteraction);
              document.addEventListener("touchstart", handleFirstInteraction);
            }

            resolve(mesh);
          });

          video.addEventListener("error", (error) => {
            logger.error("[ScenePlayer] Video load failed:", error);
            reject(error);
          });
        } catch (error) {
          logger.error("[ScenePlayer] Error processing video resource:", error);
          reject(error);
        }
      });
    }

    // ── Picture ──────────────────────────────────────────────────────────────

    if (resource.type === "picture" || entity.type === "Picture") {
      return new Promise((resolve, reject) => {
        const textureLoader = new THREE.TextureLoader();
        const url = getFileUrl(resource) ? convertToHttps(getFileUrl(resource)) : "";

        textureLoader.load(
          url,
          (texture) => {
            if (_destroyed) return;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            if (ctx.renderer) {
              texture.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
            }

            const aspectRatio = texture.image.width / texture.image.height;
            const width = entity.parameters.width ?? 1;

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
              const t = entity.parameters.transform;
              mesh.position.set(t.position.x, t.position.y, t.position.z);
              mesh.rotation.set(
                THREE.MathUtils.degToRad(t.rotate.x),
                THREE.MathUtils.degToRad(t.rotate.y),
                THREE.MathUtils.degToRad(t.rotate.z)
              );
              const baseScale = width;
              mesh.scale.set(
                t.scale.x * baseScale,
                t.scale.y * baseScale * (1 / aspectRatio),
                t.scale.z * baseScale
              );
            }

            mesh.renderOrder = 1;

            const uuid = entity.parameters.uuid.toString();
            sources.set(uuid, {
              type: "picture",
              data: {
                mesh,
                setVisibility: (isVisible: boolean) => { mesh.visible = isVisible; },
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

    // ── Audio ────────────────────────────────────────────────────────────────

    if (resource.type === "audio" || entity.type === "Sound") {
      return new Promise((resolve) => {
        const uuid = entity.parameters.uuid.toString();
        const audioUrl = getFileUrl(resource) ? convertToHttps(getFileUrl(resource)) : "";

        sources.set(uuid, { type: "audio", data: { url: audioUrl } });
        logger.log("[ScenePlayer] Audio resource loaded:", { uuid, url: audioUrl });
        resolve(true);
      });
    }

    // ── Text ─────────────────────────────────────────────────────────────────

    if (resource.type === "text" || entity.type === "Text") {
      return new Promise((resolve, reject) => {
        try {
          const text =
            entity.parameters.text ?? getResourceContent(resource) ?? "Default Text";
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Failed to create 2D canvas context");
          }

          canvas.width = 512;
          canvas.height = 128;
          context.fillStyle = entity.parameters.color ?? "#000000";
          context.font = `${entity.parameters.fontSize ?? 48}px Arial`;
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
            applyTransform(mesh, entity.parameters.transform);
          }

          const uuid = entity.parameters.uuid.toString();
          sources.set(uuid, {
            type: "text",
            data: {
              mesh,
              setText: (newText: string) => {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = entity.parameters.color ?? "#000000";
                context.font = `${entity.parameters.fontSize ?? 48}px Arial`;
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.fillText(newText, canvas.width / 2, canvas.height / 2);
                texture.needsUpdate = true;
              },
              setVisibility: (isVisible: boolean) => { mesh.visible = isVisible; },
            },
          });

          threeScene.add(mesh);
          resolve(mesh);
        } catch (error) {
          logger.error("[ScenePlayer] Failed to create text entity:", error);
          reject(error);
        }
      });
    }

    // ── Voxel ────────────────────────────────────────────────────────────────

    if (resource.type === "voxel" || entity.type === "Voxel") {
      const loader = new VOXLoader();
      const url = getFileUrl(resource) ? convertToHttps(getFileUrl(resource)) : "";

      return new Promise((resolve, reject) => {
        loader.load(
          url,
          async (chunks: unknown[]) => {
            if (_destroyed) return;
            try {
              const chunk = chunks[0] as {
                data: unknown[];
                size: { x: number; y: number; z: number };
                palette: unknown[];
              };
              if (!chunk || !chunk.data || !chunk.size) {
                throw new Error("Invalid VOX data structure");
              }

              logger.log("[ScenePlayer] Creating VOX model:", {
                size: chunk.size,
                dataLength: chunk.data.length,
                paletteLength: chunk.palette.length,
              });

              const voxMesh = new VOXMesh(chunk, 1);
              setInitialVisibility(voxMesh);

              if (entity.parameters?.transform) {
                applyTransform(voxMesh, entity.parameters.transform);
              }

              const uuid = entity.parameters.uuid.toString();
              voxMesh.uuid = uuid;

              // Child entities are handled exclusively by processEntities to avoid
              // double-loading. loadModel only processes the current node.

              voxMesh.castShadow = true;
              voxMesh.receiveShadow = true;

              // Apply entity components via applyComponents (replaces ~250 lines of inline code)
              if (entity.children?.components && entity.children.components.length > 0) {
                const sourceData = applyComponents({
                  mesh: voxMesh,
                  uuid,
                  components: entity.children.components,
                  ctx,
                });

                logger.log("[ScenePlayer] VOX model loaded:", {
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
                    setVisibility: (isVisible: boolean) => { voxMesh.visible = isVisible; },
                  },
                });
              }

              threeScene.add(voxMesh);
              resolve(voxMesh);
            } catch (error) {
              logger.error("[ScenePlayer] Error processing VOX data:", error);
              reject(error);
            }
          },
          undefined,
          (error: unknown) => {
            logger.error("[ScenePlayer] VOX model load failed:", error);
            reject(error);
          }
        );
      });
    }

    // ── GLTF (default) ───────────────────────────────────────────────────────

    {
      const loader = getConfiguredGLTFLoader();
      const url = getFileUrl(resource) ? convertToHttps(getFileUrl(resource)) : "";

      if (!url) {
        return Promise.reject(new Error("Resource is missing a file URL"));
      }

      return new Promise((resolve, reject) => {
        loader.load(
          url,
          async (gltf) => {
            if (_destroyed) return;
            const model = gltf.scene;
            setInitialVisibility(model);
            const uuid = entity.parameters.uuid.toString();

            if (!entity.parameters?.uuid) {
              logger.error("[ScenePlayer] Invalid entity.parameters object:", entity.parameters);
              return reject(new Error("Invalid entity.parameters object"));
            }

            model.uuid = uuid;

            // GLTF rotation is already in radians from the format
            if (entity.parameters?.transform) {
              applyTransform(model, entity.parameters.transform, /* useRadians= */ true);
            }

            // Set up animation mixer if the model has animations
            if (gltf.animations && gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              mixers.set(entity.parameters.uuid, mixer);
              model.userData.animations = gltf.animations;
              logger.log(`[ScenePlayer] Model ${entity.parameters.uuid} animations loaded:`, {
                animations: gltf.animations,
                animationNames: gltf.animations.map((a) => a.name),
              });
            }

            // Child entities are handled exclusively by processEntities to avoid
            // double-loading. loadModel only processes the current node.

            // Apply entity components via applyComponents (replaces ~250 lines of inline code)
            if (entity.children?.components && entity.children.components.length > 0) {
              const sourceData = applyComponents({
                mesh: model,
                uuid,
                components: entity.children.components,
                ctx,
              });
              sources.set(uuid, sourceData);
            } else {
              sources.set(uuid, {
                type: "model",
                data: {
                  mesh: model,
                  setVisibility: (isVisible: boolean) => { model.visible = isVisible; },
                },
              });
            }

            threeScene.add(model);
            resolve(model);
          },
          (progress) => {
            logger.log(
              `[ScenePlayer] Model loading progress: ${((progress.loaded / progress.total) * 100).toFixed(2)}%`
            );
          },
          (error) => {
            logger.error("[ScenePlayer] Model load failed:", error);
            reject(error);
          }
        );
      });
    }
  };

  // ─── processEntities ────────────────────────────────────────────────────────

  /**
   * Recursively processes an entity list, loading each entity's resource.
   * Supports nested entities (multi-level hierarchy).
   *
   * @param entities        - List of entity nodes to process
   * @param parentTransform - Combined transform from parent entity (optional)
   * @param level           - Current recursion depth (for logging)
   * @param parentActive    - Inherited visibility state from parent
   */
  const processEntities = async (
    entities: EntityNode[],
    parentTransform?: TransformData,
    level: number = 0,
    parentActive: boolean = true
  ): Promise<void> => {
    for (const entity of entities) {
      const entityTransform = combineTransforms(
        parentTransform,
        entity.parameters?.transform
      );

      const currentActive =
        (entity.parameters?.active !== undefined ? entity.parameters.active : true) && parentActive;

      logger.log(`[ScenePlayer] Processing entity [Level ${level}]:`, {
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
            content: entity.parameters.text ?? "Default Text",
            id: entity.parameters.uuid ?? crypto.randomUUID(),
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
          logger.error("[ScenePlayer] Failed to process text entity:", error);
        }
      } else if (entity.type === "Entity") {
        logger.log("[ScenePlayer] Processing Entity container:", entity.parameters.uuid);
        const entityData: import("../types").SourceRecord = {
          type: "entity",
          data: {
            transform: entityTransform,
            setVisibility: () => {
              logger.log("[ScenePlayer] Entity container does not support direct visibility");
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
            logger.error("[ScenePlayer] Failed to load model:", error);
          }
        }
      }

      // Recurse into child entities
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

  return { loadModel, processEntities, destroy };
}
