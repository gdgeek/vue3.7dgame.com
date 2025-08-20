// Shared GLTF loader factory with DRACO + KTX2 support.
// Ensures KTX2Loader.detectSupport() is called only once and re-used.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

let sharedKTX2: KTX2Loader | null = null;

/**
 * Create a GLTFLoader pre-configured with DRACO + (once) KTX2 support.
 * Returns a fresh GLTFLoader each call (with new DRACOLoader) while caching
 * the heavier KTX2Loader instance.
 */
export function getConfiguredGLTFLoader(): GLTFLoader {
  const loader = new GLTFLoader();

  // DRACO each time (lightweight)
  const draco = new DRACOLoader();
  draco.setDecoderPath("/js/three.js/libs/draco/");
  loader.setDRACOLoader(draco);

  // KTX2 once
  if (!sharedKTX2) {
    try {
      const tmpRenderer = new THREE.WebGLRenderer();
      sharedKTX2 = new KTX2Loader()
        .setTranscoderPath("/js/three.js/libs/basis/")
        .detectSupport(tmpRenderer);
      tmpRenderer.dispose();
      // @ts-ignore optional in some browsers
      if (typeof (tmpRenderer as any).forceContextLoss === "function")
        (tmpRenderer as any).forceContextLoss();
    } catch (e) {
      console.warn("KTX2Loader 初始化失败 (shared)", e);
    }
  }
  if (sharedKTX2) loader.setKTX2Loader(sharedKTX2);
  return loader;
}

/** Dispose cached KTX2 resources (optional, typically at app shutdown). */
export function disposeKTX2Loader() {
  if (sharedKTX2) {
    try {
      sharedKTX2.dispose();
    } catch (e) {
      // ignore
    }
    sharedKTX2 = null;
  }
}
