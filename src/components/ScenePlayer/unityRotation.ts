import * as THREE from "three";
import type { RotatingObject, Vector3 } from "@/types/verse";

const deltaEuler = new THREE.Euler();
const deltaQuaternion = new THREE.Quaternion();

function finiteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Applies one Unity-compatible Transform.Rotate(speed * deltaTime) step.
 *
 * Persisted Rotate speeds stay in Unity degrees/second. The project coordinate
 * adapter maps a Unity delta to Three.js as (x, -y, -z), using Unity's ZXY
 * Euler order, then post-multiplies the quaternion so rotation is local/self.
 */
export function applyUnityLocalRotationDelta(
  object: THREE.Object3D,
  speedDegreesPerSecond: Vector3,
  deltaSeconds: number
): void {
  const delta = Math.max(0, finiteNumber(deltaSeconds));
  deltaEuler.set(
    THREE.MathUtils.degToRad(finiteNumber(speedDegreesPerSecond?.x)) * delta,
    THREE.MathUtils.degToRad(-finiteNumber(speedDegreesPerSecond?.y)) * delta,
    THREE.MathUtils.degToRad(-finiteNumber(speedDegreesPerSecond?.z)) * delta,
    "ZXY"
  );
  deltaQuaternion.setFromEuler(deltaEuler);
  object.quaternion.multiply(deltaQuaternion);
}

/** Advances all currently registered rotating objects by one animation frame. */
export function advanceUnityRotations(
  rotatingObjects: RotatingObject[],
  deltaSeconds: number
): void {
  rotatingObjects.forEach((object) => {
    if (object.checkVisibility && !object.mesh.visible) return;
    applyUnityLocalRotationDelta(object.mesh, object.speed, deltaSeconds);
  });
}
