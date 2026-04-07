import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

// Helper to fix vector precision
function toFixedVector3(vec: THREE.Vector3, n: number): THREE.Vector3 {
  const result = new THREE.Vector3();
  result.x = parseFloat(vec.x.toFixed(n));
  result.y = parseFloat(vec.y.toFixed(n));
  result.z = parseFloat(vec.z.toFixed(n));
  return result;
}

export interface ProcessedModel {
  info: string;
  image: File;
}

const createRenderer = () => {
  const renderer = new THREE.WebGLRenderer({
    preserveDrawingBuffer: true,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(512, 512);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
};

const createGltfLoader = (renderer: THREE.WebGLRenderer) => {
  const gltfLoader = new GLTFLoader();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/js/three.js/libs/draco/");
  gltfLoader.setDRACOLoader(dracoLoader);

  const ktx2Loader = new KTX2Loader()
    .setTranscoderPath("/js/three.js/libs/basis/")
    .detectSupport(renderer);
  gltfLoader.setKTX2Loader(ktx2Loader);

  return { gltfLoader, dracoLoader, ktx2Loader };
};

const captureModelFromUrl = (
  url: string,
  filename: string
): Promise<ProcessedModel> => {
  return new Promise((resolve, reject) => {
    const width = 512;
    const height = 512;
    const renderer = createRenderer();
    const { gltfLoader, dracoLoader, ktx2Loader } = createGltfLoader(renderer);
    const cleanup = () => {
      renderer.dispose();
      dracoLoader.dispose();
      ktx2Loader.dispose();
    };

    gltfLoader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        const animations = gltf.animations;

        // Calculate bounding box and center
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Extract animation info
        const animationsInfo = animations.map((anim) => ({
          name: anim.name,
          length: anim.duration,
        }));

        // Calculate face count
        let faceCount = 0;

        // Enable shadows and count faces
        model.traverse((child) => {
          child.castShadow = true;
          if (child instanceof THREE.Mesh) {
            child.geometry.computeVertexNormals();
            child.receiveShadow = true;

            const geometry = child.geometry;
            if (geometry.index) {
              faceCount += geometry.index.count / 3;
            } else if (geometry.attributes.position) {
              faceCount += geometry.attributes.position.count / 3;
            }
          }
        });

        const info = JSON.stringify({
          size: toFixedVector3(size, 5),
          center: toFixedVector3(center, 5),
          anim: animationsInfo,
          faces: Math.round(faceCount),
        });

        // Setup scene for screenshot
        const scene = new THREE.Scene();

        // Lighting (copied from PolygenView)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
        mainLight.position.set(2, 1, 1);
        scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
        fillLight.position.set(-1, 0.5, -1);
        scene.add(fillLight);

        const topLight = new THREE.PointLight(0xffffff, 2);
        topLight.position.set(0, 3, 0);
        scene.add(topLight);

        scene.add(new THREE.AmbientLight(0xffffff, 1.2));

        // Position model
        const targetSize = 1.35;
        const maxDimension = Math.max(size.x, size.y, size.z, 0.0001);
        const scale = targetSize / maxDimension;
        model.position.set(
          -center.x * scale,
          -center.y * scale,
          -center.z * scale
        );
        model.scale.set(scale, scale, scale);

        scene.add(model);

        // Setup camera
        const camera = new THREE.PerspectiveCamera(
          75,
          width / height,
          0.1,
          1000
        );
        camera.position.set(0, 0, 2);
        camera.lookAt(0, 0, 0);

        // Render
        renderer.render(scene, camera);

        // Convert to blob/file
        renderer.domElement.toBlob((blob) => {
          if (blob) {
            const imageFile = new File(
              [blob],
              filename.replace(/\.[^/.]+$/, "") + ".png",
              {
                type: "image/png",
                lastModified: Date.now(),
              }
            );

            cleanup();

            resolve({
              info,
              image: imageFile,
            });
          } else {
            cleanup();
            reject(new Error("Failed to generate screenshot blob"));
          }
        }, "image/png");
      },
      undefined,
      (error) => {
        cleanup();
        reject(error);
      }
    );
  });
};

export const processModel = async (file: File): Promise<ProcessedModel> => {
  const url = URL.createObjectURL(file);
  try {
    return await captureModelFromUrl(url, file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const generateModelThumbnailFromUrl = async (
  url: string,
  filename = "model.glb"
): Promise<File> => {
  const result = await captureModelFromUrl(url, filename);
  return result.image;
};
