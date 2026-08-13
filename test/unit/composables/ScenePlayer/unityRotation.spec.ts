import { describe, expect, it } from "vitest";
import { ref } from "vue";
import * as THREE from "three";
import { applyComponents } from "@/components/ScenePlayer/composables/useComponentHandlers";
import {
  advanceUnityRotations,
  applyUnityLocalRotationDelta,
} from "@/components/ScenePlayer/unityRotation";
import type { LoaderContext } from "@/components/ScenePlayer/types";
import type { RotatingObject } from "@/types/verse";

const degrees = THREE.MathUtils.degToRad;

function expectQuaternionClose(
  actual: THREE.Quaternion,
  expected: THREE.Quaternion
): void {
  expect(actual.angleTo(expected)).toBeLessThan(1e-7);
}

function makeRotateContext(): LoaderContext {
  return {
    rotatingObjects: ref<RotatingObject[]>([]),
    collisionObjects: ref([]),
    moveableObjects: ref([]),
    sources: new Map(),
  } as unknown as LoaderContext;
}

describe("Unity-compatible ScenePlayer rotation", () => {
  it("maps positive Unity Y rotation toward Three.js +Z", () => {
    const object = new THREE.Object3D();

    applyUnityLocalRotationDelta(object, { x: 0, y: 90, z: 0 }, 1);

    const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(
      object.quaternion
    );
    expect(direction.x).toBeCloseTo(0, 10);
    expect(direction.z).toBeCloseTo(1, 10);
  });

  it("maps negative Unity Y rotation toward Three.js -Z", () => {
    const object = new THREE.Object3D();

    applyUnityLocalRotationDelta(object, { x: 0, y: -90, z: 0 }, 1);

    const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(
      object.quaternion
    );
    expect(direction.x).toBeCloseTo(0, 10);
    expect(direction.z).toBeCloseTo(-1, 10);
  });

  it("uses ZXY conversion and local post-multiplication from a non-zero pose", () => {
    const object = new THREE.Object3D();
    const initial = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(degrees(25), degrees(-35), degrees(15), "XYZ")
    );
    object.quaternion.copy(initial);

    const delta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(degrees(10), degrees(-20), degrees(30), "ZXY")
    );
    const expected = initial.clone().multiply(delta);

    applyUnityLocalRotationDelta(object, { x: 40, y: 80, z: -120 }, 0.25);

    expectQuaternionClose(object.quaternion, expected);
    expect(
      object.quaternion.angleTo(delta.clone().multiply(initial))
    ).toBeGreaterThan(0.01);
  });

  it("preserves saved speed and advances a registered object for one frame", () => {
    const mesh = new THREE.Object3D();
    const ctx = makeRotateContext();

    applyComponents({
      mesh,
      uuid: "rotating-model",
      components: [
        {
          type: "Rotate",
          parameters: {
            uuid: "rotate-component",
            speed: { x: 0, y: 90, z: 0 },
          },
        },
      ],
      ctx,
    });

    expect(ctx.rotatingObjects.value).toHaveLength(1);
    expect(ctx.rotatingObjects.value[0].speed).toEqual({ x: 0, y: 90, z: 0 });

    advanceUnityRotations(ctx.rotatingObjects.value, 1);

    const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(
      mesh.quaternion
    );
    expect(direction.z).toBeCloseTo(1, 10);
  });

  it("does not advance an invisible object with visibility checking enabled", () => {
    const mesh = new THREE.Object3D();
    mesh.visible = false;
    const before = mesh.quaternion.clone();

    advanceUnityRotations(
      [
        {
          mesh,
          speed: { x: 10, y: 20, z: 30 },
          checkVisibility: true,
        },
      ],
      1
    );

    expectQuaternionClose(mesh.quaternion, before);
  });

  it("ignores invalid speeds and non-positive frame deltas", () => {
    const mesh = new THREE.Object3D();
    const before = mesh.quaternion.clone();

    applyUnityLocalRotationDelta(
      mesh,
      { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: 0 },
      1
    );
    applyUnityLocalRotationDelta(mesh, { x: 90, y: 90, z: 90 }, -1);
    applyUnityLocalRotationDelta(
      mesh,
      { x: 90, y: 90, z: 90 },
      Number.POSITIVE_INFINITY
    );

    expectQuaternionClose(mesh.quaternion, before);
  });
});
