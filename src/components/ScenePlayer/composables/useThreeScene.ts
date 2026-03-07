/**
 * Three.js scene setup composable for ScenePlayer.
 *
 * Encapsulates renderer creation, camera setup, lighting, OrbitControls,
 * Stats overlay (verse mode only), the animation loop, and ResizeObserver.
 *
 * Call useThreeScene() at component setup() level so threeScene is available
 * immediately. Then call setupScene(container, options) inside onMounted.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "stats.js";
import type { Ref } from "vue";
import { logger } from "@/utils/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Callback invoked every animation frame with the elapsed delta time in seconds. */
type AnimateCallback = (delta: number) => void;

/** Options passed to setupScene. */
type ThreeSceneOptions = {
  /** Whether the dark theme background colour should be used. */
  isDark: boolean;
  /** Rendering mode: 'meta' uses smaller camera range; 'verse' enables Stats overlay. */
  mode: "meta" | "verse";
  /**
   * External ref for OrbitControls.
   * The composable will assign the created OrbitControls instance to this ref
   * so LoaderContext and component-level watchers can access it.
   */
  controls: Ref<OrbitControls | null>;
  /** Per-frame callback for rotation, collision detection, mixer updates, etc. */
  onFrame: AnimateCallback;
};

// ─── Composable ───────────────────────────────────────────────────────────────

/**
 * Manages Three.js lifecycle: renderer, camera, lights, controls, stats, and
 * the render loop. Call at component setup() level, then setupScene() in onMounted.
 */
export function useThreeScene() {
  // Scene is created immediately so it is available during setup()
  const threeScene = new THREE.Scene();

  let renderer: THREE.WebGLRenderer | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let _controls: OrbitControls | null = null;
  let clock = new THREE.Clock();
  let resizeObserver: ResizeObserver | null = null;
  let rafId: number | null = null;
  let isDestroyed = false;

  // ─── handleResize ──────────────────────────────────────────────────────────

  /**
   * Updates camera aspect ratio and renderer size to match the container.
   * Call this whenever the container size changes (ResizeObserver, fullscreen toggle).
   */
  const handleResize = (container: HTMLDivElement): void => {
    if (!camera || !renderer) return;
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight, true);
    renderer.render(threeScene, camera);
  };

  // ─── setupScene ───────────────────────────────────────────────────────────

  /**
   * Initialises the full Three.js stack: renderer, camera, lights, OrbitControls,
   * optional Stats overlay, animation loop, and ResizeObserver.
   *
   * Must be called inside onMounted after the container element is available.
   *
   * @param container - The HTML div that will host the renderer canvas
   * @param options   - Scene configuration (theme, mode, controls ref, frame callback)
   */
  const setupScene = (container: HTMLDivElement, options: ThreeSceneOptions): void => {
    isDestroyed = false;
    const { isDark, mode, controls, onFrame } = options;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // ── Renderer ──────────────────────────────────────────────────────────────
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(isDark ? 0x242424 : 0xeeeeee, 1);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── Camera ────────────────────────────────────────────────────────────────
    // Verse mode uses a larger camera range to accommodate bigger scenes
    const maxDistance = mode === "verse" ? 1000 : 500;
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1800);
    camera.position.set(0, 7, 20);

    // ── Lights ────────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    threeScene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.castShadow = true;
    mainLight.position.set(5, 10, 5);
    threeScene.add(mainLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.05);
    fillLight.castShadow = true;
    fillLight.position.set(0, 0, 0);
    threeScene.add(fillLight);

    // ── OrbitControls ─────────────────────────────────────────────────────────
    _controls = new OrbitControls(camera, renderer.domElement);
    _controls.enableDamping = true;
    _controls.dampingFactor = 0.05;
    _controls.screenSpacePanning = true;
    _controls.minDistance = 1;
    _controls.maxDistance = maxDistance;
    // Publish the controls instance to the external ref
    controls.value = _controls;

    // ── Stats overlay (verse mode only) ───────────────────────────────────────
    let stats: Stats | null = null;
    if (mode === "verse") {
      stats = new Stats();
      stats.showPanel(0); // 0: FPS
      stats.dom.style.position = "absolute";
      stats.dom.style.top = "0px";
      stats.dom.style.left = "0px";
      container.appendChild(stats.dom);
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    const animate = () => {
      if (isDestroyed) return;
      stats?.begin();
      const delta = clock.getDelta();
      onFrame(delta);
      _controls!.update();
      renderer!.render(threeScene, camera!);
      stats?.end();
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    logger.log("[ScenePlayer] Three.js scene initialised:", { mode, maxDistance, isDark });

    // ── ResizeObserver ────────────────────────────────────────────────────────
    resizeObserver = new ResizeObserver(() => {
      handleResize(container);
    });
    resizeObserver.observe(container);
  };

  // ─── Theme update ──────────────────────────────────────────────────────────

  /**
   * Updates the renderer background colour when the theme changes.
   *
   * @param isDark - True for dark background (0x242424), false for light (0xeeeeee)
   */
  const updateTheme = (isDark: boolean): void => {
    if (renderer) {
      renderer.setClearColor(isDark ? 0x242424 : 0xeeeeee, 1);
    }
  };

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  /**
   * Stops the animation loop, disposes OrbitControls and the WebGL renderer,
   * and disconnects the ResizeObserver. Call this inside onUnmounted.
   */
  const cleanupScene = (): void => {
    isDestroyed = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    _controls?.dispose();
    _controls = null;
    resizeObserver?.disconnect();
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
    logger.log("[ScenePlayer] Three.js scene cleaned up");
  };

  // ─── Clock management ─────────────────────────────────────────────────────

  /**
   * Resets the internal clock (e.g. after a scene reload).
   */
  const resetClock = (): void => {
    clock = new THREE.Clock();
  };

  // ─── Getters ──────────────────────────────────────────────────────────────

  /** Returns the WebGLRenderer instance (null before setupScene is called). */
  const getRenderer = (): THREE.WebGLRenderer | null => renderer;

  /** Returns the PerspectiveCamera instance (null before setupScene is called). */
  const getCamera = (): THREE.PerspectiveCamera | null => camera;

  /** Returns the OrbitControls instance (null before setupScene is called). */
  const getControls = (): OrbitControls | null => _controls;

  /** Returns the Three.js Clock instance. */
  const getClock = (): THREE.Clock => clock;

  return {
    /** The Three.js Scene — available immediately (before setupScene). */
    threeScene,
    setupScene,
    handleResize,
    updateTheme,
    cleanupScene,
    resetClock,
    getRenderer,
    getCamera,
    getControls,
    getClock,
  };
}
