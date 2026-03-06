/**
 * Handles entity component registration (Action, Trigger, Rotate, Moved).
 * These component types apply to both Voxel and GLTF models.
 */
import * as THREE from "three";
import { logger } from "@/utils/logger";
import type { EntityComponent, SourceRecord, SourceModelData, LoaderContext } from "../types";

type ComponentHandlerOptions = {
  mesh: THREE.Object3D;
  uuid: string;
  components: EntityComponent[];
  ctx: LoaderContext;
};

/**
 * Applies all entity components to a mesh and returns the resulting SourceRecord.
 * Mutates ctx.sources, ctx.collisionObjects, ctx.rotatingObjects, ctx.moveableObjects.
 */
export function applyComponents(opts: ComponentHandlerOptions): SourceRecord {
  const { mesh, uuid, components, ctx } = opts;
  const {
    renderer, camera, controls, mouse, raycaster,
    sources, collisionObjects, rotatingObjects, moveableObjects, dragState, triggerEvent,
  } = ctx;

  const actionComponent = components.find((c) => c.type === "Action");
  const triggerComponent = components.find((c) => c.type === "Trigger");
  const rotateComponent = components.find((c) => c.type === "Rotate");
  const movedComponent = components.find((c) => c.type === "Moved");

  const sourceData: SourceRecord = {
    type: "model",
    data: {
      mesh,
      setVisibility: (isVisible: boolean) => { mesh.visible = isVisible; },
      cleanup: undefined,
      updateBoundingBox: undefined,
      setRotating: undefined,
    },
  };

  // ── Action component: click-to-trigger ─────────────────────────────────────
  if (actionComponent) {
    logger.log("[ScenePlayer] Found click trigger component:", actionComponent);
    let isExecuting = false;

    const handleClick = async (event: MouseEvent) => {
      if (!mesh.visible) return;
      if (!renderer || !camera) return;
      if (isExecuting) {
        logger.log("[ScenePlayer] Event is already executing, please wait...");
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(mesh, true);

      if (intersects.length > 0) {
        logger.log("[ScenePlayer] Model clicked:", uuid);
        const eventId = actionComponent.parameters.uuid;
        try {
          isExecuting = true;
          await triggerEvent(eventId);
        } catch (error) {
          logger.error("[ScenePlayer] Failed to execute event handler:", error);
        } finally {
          isExecuting = false;
        }
      }
    };

    renderer!.domElement.addEventListener("click", handleClick);
    (sourceData.data as SourceModelData).cleanup = () => {
      renderer!.domElement.removeEventListener("click", handleClick);
    };
  }

  // ── Trigger component: collision detection ─────────────────────────────────
  if (triggerComponent) {
    logger.log("[ScenePlayer] Found collision trigger component:", triggerComponent);

    const boundingBox = new THREE.Box3().setFromObject(mesh);
    const lastPosition = mesh.position.clone();

    if (triggerComponent.parameters.target) {
      collisionObjects.value.push({
        sourceUuid: uuid,
        targetUuid: triggerComponent.parameters.target,
        eventUuid: triggerComponent.parameters.uuid,
        boundingBox,
        isColliding: false,
        lastPosition,
        checkVisibility: true,
      });
    }

    (sourceData.data as SourceModelData).updateBoundingBox = () => {
      boundingBox.setFromObject(mesh);
    };

    const existingSource = sources.get(uuid);
    if (existingSource && existingSource.type === "model") {
      existingSource.data.updateBoundingBox = () => { boundingBox.setFromObject(mesh); };
    }
  }

  // ── Rotate component: auto-rotation ────────────────────────────────────────
  if (rotateComponent) {
    logger.log("[ScenePlayer] Found auto-rotate component:", rotateComponent);

    const speedValue = rotateComponent.parameters.speed;
    if (!speedValue) {
      logger.warn("[ScenePlayer] Rotate component missing speed parameter");
    } else {
      const speed = {
        x: THREE.MathUtils.degToRad(speedValue.x),
        y: THREE.MathUtils.degToRad(speedValue.y),
        z: THREE.MathUtils.degToRad(speedValue.z),
      };

      rotatingObjects.value.push({ mesh, speed, checkVisibility: true });

      (sourceData.data as SourceModelData).setRotating = (isRotating: boolean) => {
        const index = rotatingObjects.value.findIndex((obj) => obj.mesh === mesh);
        if (index !== -1 && !isRotating) {
          rotatingObjects.value.splice(index, 1);
        } else if (index === -1 && isRotating) {
          rotatingObjects.value.push({ mesh, speed, checkVisibility: true });
        }
      };
    }
  }

  // ── Moved component: draggable objects ─────────────────────────────────────
  if (movedComponent) {
    logger.log("[ScenePlayer] Found movable component:", movedComponent);

    const limit = movedComponent.parameters.limit ?? {
      x: { enable: false, min: 0, max: 0 },
      y: { enable: false, min: 0, max: 0 },
      z: { enable: false, min: 0, max: 0 },
    };

    moveableObjects.value.push({
      mesh,
      isDragging: false,
      magnetic: Boolean(movedComponent.parameters.magnetic),
      scalable: Boolean(movedComponent.parameters.scalable),
      limit,
      checkVisibility: true,
    });

    const onMouseDown = (event: MouseEvent) => {
      event.preventDefault();
      if (!renderer || !camera) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(mesh, true);

      if (intersects.length > 0) {
        logger.log("[ScenePlayer] Start dragging model:", uuid);
        dragState.isDragging = true;
        dragState.draggedObject = mesh;
        dragState.dragStartPosition.copy(mesh.position);
        dragState.mouseStartPosition.copy(mouse);
        const intersectPoint = intersects[0].point;
        dragState.dragOffset.copy(mesh.position).sub(intersectPoint);
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
        newPosition.lerpVectors(dragState.draggedObject.position, intersection, 0.5);

        if (currentMoveable?.limit) {
          if (currentMoveable.limit.x.enable) {
            newPosition.x = THREE.MathUtils.clamp(
              newPosition.x, currentMoveable.limit.x.min, currentMoveable.limit.x.max
            );
          }
          if (currentMoveable.limit.y.enable) {
            newPosition.y = THREE.MathUtils.clamp(
              newPosition.y, currentMoveable.limit.y.min, currentMoveable.limit.y.max
            );
          }
          if (currentMoveable.limit.z.enable) {
            newPosition.z = THREE.MathUtils.clamp(
              newPosition.z, currentMoveable.limit.z.min, currentMoveable.limit.z.max
            );
          }
        }

        dragState.draggedObject.position.copy(newPosition);
        dragState.lastIntersection.copy(intersection);
        logger.log("[ScenePlayer] Move to position:", newPosition);
      }
    };

    const onMouseUp = () => {
      if (dragState.isDragging) {
        logger.log("[ScenePlayer] End drag");
        dragState.isDragging = false;
        dragState.draggedObject = null;
        controls.value!.enabled = true;
      }
    };

    renderer!.domElement.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    const prevCleanup = (sourceData.data as SourceModelData).cleanup;
    (sourceData.data as SourceModelData).cleanup = () => {
      if (prevCleanup) prevCleanup();
      renderer!.domElement.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }

  return sourceData;
}
