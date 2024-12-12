<template>
  <div>
    <div
      id="scene"
      ref="scene"
      style="height: 70vh; width: 100%; margin: 0 auto"
    ></div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ref, onMounted, onUnmounted, watch } from "vue";
import { convertToHttps } from "@/assets/js/helper";
import { VOXLoader, VOXMesh } from "@/assets/js/voxel/VOXLoader.js";
import { ThemeEnum } from "@/enums/ThemeEnum";
import { useSettingsStore } from "@/store/modules/settings";

const settingsStore = useSettingsStore();

const props = defineProps<{
  verse: any;
}>();

const scene = ref<HTMLDivElement | null>(null);
const threeScene = new THREE.Scene();
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let mixers: Map<string, THREE.AnimationMixer> = new Map();
let sources: Map<string, any> = new Map();
let clock = new THREE.Clock();

const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

// 加载模型的主要函数
const loadModel = async (resource: any, entity: any, moduleTransform?: any) => {
  console.log("开始加载模型:", {
    entityType: entity.type,
    entityUUID: entity.parameters?.uuid,
    resourceType: resource.type,
    moduleTransform,
  });
  console.log("加载资源参数:", {
    resource,
    entity,
    resourceId: resource.id,
    parametersUUID: entity.parameters?.uuid,
  });

  // 合并Module和Entity的transform
  const combinedTransform = {
    position: {
      x:
        (moduleTransform?.position?.x || 0) +
        (entity.parameters?.transform?.position?.x || 0),
      y:
        (moduleTransform?.position?.y || 0) +
        (entity.parameters?.transform?.position?.y || 0),
      z:
        (moduleTransform?.position?.z || 0) +
        (entity.parameters?.transform?.position?.z || 0),
    },
    rotate: {
      x:
        (moduleTransform?.rotate?.x || 0) +
        (entity.parameters?.transform?.rotate?.x || 0),
      y:
        (moduleTransform?.rotate?.y || 0) +
        (entity.parameters?.transform?.rotate?.y || 0),
      z:
        (moduleTransform?.rotate?.z || 0) +
        (entity.parameters?.transform?.rotate?.z || 0),
    },
    scale: {
      x:
        (moduleTransform?.scale?.x || 1) *
        (entity.parameters?.transform?.scale?.x || 1),
      y:
        (moduleTransform?.scale?.y || 1) *
        (entity.parameters?.transform?.scale?.y || 1),
      z:
        (moduleTransform?.scale?.z || 1) *
        (entity.parameters?.transform?.scale?.z || 1),
    },
  };

  // 处理视频类型
  if (resource.type === "video" || entity.type === "Video") {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement("video");
        video.src = convertToHttps(resource.file.url);
        video.crossOrigin = "anonymous";

        // 设置视频属性
        video.loop = entity.parameters.loop || false;
        video.muted = entity.parameters.muted || false; // 是否静音
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

          // 应用变换
          if (entity.parameters?.transform) {
            mesh.position.set(
              combinedTransform.position.x,
              combinedTransform.position.y,
              combinedTransform.position.z
            );

            mesh.rotation.set(
              THREE.MathUtils.degToRad(combinedTransform.rotate.x),
              THREE.MathUtils.degToRad(combinedTransform.rotate.y),
              THREE.MathUtils.degToRad(combinedTransform.rotate.z)
            );

            const baseScale = width;
            mesh.scale.set(
              combinedTransform.scale.x * baseScale,
              combinedTransform.scale.y * baseScale * (1 / aspectRatio),
              combinedTransform.scale.z * baseScale
            );
          }

          // 添加点击事件处理
          const raycaster = new THREE.Raycaster();
          const mouse = new THREE.Vector2();

          const handleVideoClick = (event: MouseEvent) => {
            // 计算鼠标位置
            const rect = renderer!.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // 更新射线
            raycaster.setFromCamera(mouse, camera!);

            // 检查是否点击到视频平面
            const intersects = raycaster.intersectObject(mesh);
            if (intersects.length > 0) {
              if (video.paused) {
                video.play().catch((error) => {
                  console.warn("视频播放失败:", error);
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
                mesh.visible =
                  isVisible &&
                  (entity.parameters.active !== undefined
                    ? entity.parameters.active
                    : true);
              },
            },
          });

          threeScene.add(mesh);

          // 如果设置了自动播放
          if (entity.parameters.play) {
            // 添加用户交互检测
            const handleFirstInteraction = () => {
              video.play().catch((error) => {
                console.warn("视频播放失败:", error);
              });
              document.removeEventListener("click", handleFirstInteraction);
              document.removeEventListener(
                "touchstart",
                handleFirstInteraction
              );
            };

            document.addEventListener("click", handleFirstInteraction);
            document.addEventListener("touchstart", handleFirstInteraction);
          }

          resolve(mesh);
        });

        video.addEventListener("error", (error) => {
          console.error("视频加载失败:", error);
          reject(error);
        });
      } catch (error) {
        console.error("处理视频资源时出错:", error);
        reject(error);
      }
    });
  }

  // 处理图片类型
  if (resource.type === "picture" || entity.type === "Picture") {
    return new Promise((resolve, reject) => {
      const textureLoader = new THREE.TextureLoader();
      const url = convertToHttps(resource.file.url);

      textureLoader.load(
        url,
        (texture) => {
          // 优化纹理设置
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = renderer!.capabilities.getMaxAnisotropy();

          const aspectRatio = texture.image.width / texture.image.height;
          const width = entity.parameters.width || 1;
          const height = width / aspectRatio;

          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            // 确保图片显示清晰
            depthWrite: true,
            depthTest: true,
          });

          const mesh = new THREE.Mesh(geometry, material);

          // 应用变换
          if (entity.parameters?.transform) {
            mesh.position.set(
              combinedTransform.position.x,
              combinedTransform.position.y,
              combinedTransform.position.z
            );

            mesh.rotation.set(
              THREE.MathUtils.degToRad(combinedTransform.rotate.x),
              THREE.MathUtils.degToRad(combinedTransform.rotate.y),
              THREE.MathUtils.degToRad(combinedTransform.rotate.z)
            );

            const baseScale = width;
            mesh.scale.set(
              combinedTransform.scale.x * baseScale,
              combinedTransform.scale.y * baseScale * (1 / aspectRatio),
              combinedTransform.scale.z * baseScale
            );
          }

          // 确保图片始终清晰可见
          mesh.renderOrder = 1;

          const uuid = entity.parameters.uuid.toString();
          sources.set(uuid, {
            type: "picture",
            data: {
              mesh,
              setVisibility: (isVisible: boolean) => {
                mesh.visible =
                  isVisible &&
                  (entity.parameters.active !== undefined
                    ? entity.parameters.active
                    : true);
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

  // 处理音频类型
  if (resource.type === "audio" || entity.type === "Sound") {
    return new Promise((resolve) => {
      const uuid = entity.parameters.uuid.toString();
      const audioUrl = convertToHttps(resource.file.url);

      sources.set(uuid, {
        type: "audio",
        data: { url: audioUrl },
      });

      console.log("音频资源加载完成:", {
        uuid,
        url: audioUrl,
      });

      resolve(true);
    });
  }

  // 处理文本类型
  if (resource.type === "text" || entity.type === "Text") {
    return new Promise((resolve, reject) => {
      try {
        // 创建文本几何体
        const text = entity.parameters.text || resource.content || "默认文本";
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("无法创建 2D 上下文");
        }

        // 设置画布大小和文本样式
        canvas.width = 512;
        canvas.height = 128;
        context.fillStyle = entity.parameters.color || "#000000";
        context.font = `${entity.parameters.fontSize || 48}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";

        // 绘制文本
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // 创建纹理
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // 创建材质和平面
        const geometry = new THREE.PlaneGeometry(1, 0.25);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);

        // 应用变换
        if (entity.parameters?.transform) {
          mesh.position.set(
            combinedTransform.position.x,
            combinedTransform.position.y,
            combinedTransform.position.z
          );

          mesh.rotation.set(
            THREE.MathUtils.degToRad(combinedTransform.rotate.x),
            THREE.MathUtils.degToRad(combinedTransform.rotate.y),
            THREE.MathUtils.degToRad(combinedTransform.rotate.z)
          );

          mesh.scale.set(
            combinedTransform.scale.x,
            combinedTransform.scale.y,
            combinedTransform.scale.z
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
              mesh.visible =
                isVisible &&
                (entity.parameters.active !== undefined
                  ? entity.parameters.active
                  : true);
            },
          },
        });

        threeScene.add(mesh);

        resolve(mesh);
      } catch (error) {
        console.error("创建文本实体失败:", error);
        reject(error);
      }
    });
  }

  // 处理体素
  if (resource.type === "voxel" || entity.type === "Voxel") {
    const loader = new VOXLoader();
    const url = convertToHttps(resource.file.url);

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (chunks: any[]) => {
          try {
            const chunk = chunks[0];
            if (!chunk || !chunk.data || !chunk.size) {
              throw new Error("无效的VOX数据结构");
            }

            console.log("创建VOX模型:", {
              size: chunk.size,
              dataLength: chunk.data.length,
              paletteLength: chunk.palette.length,
            });

            const voxMesh = new VOXMesh(chunk, 1);

            // 应用变换
            if (entity.parameters?.transform) {
              voxMesh.position.set(
                combinedTransform.position.x,
                combinedTransform.position.y,
                combinedTransform.position.z
              );

              voxMesh.rotation.set(
                THREE.MathUtils.degToRad(combinedTransform.rotate.x),
                THREE.MathUtils.degToRad(combinedTransform.rotate.y),
                THREE.MathUtils.degToRad(combinedTransform.rotate.z)
              );

              voxMesh.scale.set(
                combinedTransform.scale.x,
                combinedTransform.scale.y,
                combinedTransform.scale.z
              );
            }

            // 启用阴影
            voxMesh.castShadow = true;
            voxMesh.receiveShadow = true;

            const uuid = entity.parameters.uuid.toString();
            sources.set(uuid, {
              type: "model",
              data: {
                mesh: voxMesh,
                setVisibility: (isVisible: boolean) => {
                  voxMesh.visible =
                    isVisible &&
                    (entity.parameters.active !== undefined
                      ? entity.parameters.active
                      : true);
                },
              },
            });
            voxMesh.uuid = uuid;

            threeScene.add(voxMesh);

            console.log("VOX模型加载完成:", {
              uuid,
              position: voxMesh.position.toArray(),
              rotation: voxMesh.rotation.toArray(),
              scale: voxMesh.scale.toArray(),
              modelSize: chunk.size,
            });

            resolve(voxMesh);
          } catch (error) {
            console.error("处理VOX数据时出错:", error);
            reject(error);
          }
        },
        undefined,
        (error: any) => {
          console.error("VOX模型加载失败:", error);
          reject(error);
        }
      );
    });
  } else {
    // 处理其他类型（如GLTF模型）
    const loader = new GLTFLoader();
    const url = convertToHttps(resource.file.url);

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          const uuid = entity.parameters.uuid.toString();
          if (!entity.parameters || !entity.parameters.uuid) {
            console.error("entity.parameters对象无效:", entity.parameters);
            return reject(new Error("Invalid entity.parameters object"));
          } else {
            model.uuid = uuid;
          }

          if (entity.parameters?.transform) {
            model.position.set(
              combinedTransform.position.x,
              combinedTransform.position.y,
              combinedTransform.position.z
            );
            model.rotation.set(
              combinedTransform.rotate.x,
              combinedTransform.rotate.y,
              combinedTransform.rotate.z
            );
            model.scale.set(
              combinedTransform.scale.x,
              combinedTransform.scale.y,
              combinedTransform.scale.z
            );
          }

          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            mixers.set(entity.parameters.uuid, mixer);
            model.userData.animations = gltf.animations;
            console.log(`模型 ${entity.parameters.uuid} 动画加载完成:`, {
              animations: gltf.animations,
              animationNames: gltf.animations.map((a) => a.name),
            });
          }

          // const uuid = entity.parameters.uuid.toString();
          sources.set(uuid, {
            type: "model",
            data: {
              mesh: model,
              setVisibility: (isVisible: boolean) => {
                model.visible =
                  isVisible &&
                  (entity.parameters.active !== undefined
                    ? entity.parameters.active
                    : true);
              },
            },
          });

          threeScene.add(model);

          resolve(model);
        },
        (progress) => {
          console.log(
            `模型加载进度: ${((progress.loaded / progress.total) * 100).toFixed(2)}%`
          );
        },
        (error) => {
          console.error("模型加载失败:", error);
          reject(error);
        }
      );
    });
  }
};

// 初始化场景
onMounted(async () => {
  if (!scene.value) return;

  const width = scene.value.clientWidth;
  const height = scene.value.clientHeight;

  // 渲染器设置
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setSize(width, height);
  renderer.setClearColor(isDark.value ? 0x242424 : 0xeeeeee, 1);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.value.appendChild(renderer.domElement);

  // 相机设置
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 5, 15); // 调整相机距离

  // 主环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  threeScene.add(ambientLight);

  // 主平行光
  const mainLight = new THREE.DirectionalLight(0xffffff, 2);
  mainLight.castShadow = true;
  mainLight.position.set(5, 10, 5);
  threeScene.add(mainLight);

  // 点光源
  const fillLight = new THREE.PointLight(0xffffff, 0.05);
  fillLight.castShadow = true;
  fillLight.position.set(0, 0, 0);
  threeScene.add(fillLight);

  // 轨道控制器设置
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.minDistance = 1;
  controls.maxDistance = 50;

  // 加载verse中的模型
  if (props.verse?.data) {
    const verseData = JSON.parse(props.verse.data);
    console.log("解析后的verseData:", verseData);
    if (verseData.children?.modules) {
      for (const module of verseData.children.modules) {
        const metaId = module.parameters.meta_id;
        const meta = props.verse.metas.find(
          (m: any) => m.id.toString() === metaId.toString()
        );

        if (meta && meta.data) {
          const metaData = JSON.parse(meta.data);
          console.error("解析后的metaData:", metaData);
          if (metaData.children?.entities) {
            for (const entity of metaData.children.entities) {
              if (entity.parameters?.resource) {
                const resource = meta.resources.find(
                  (r: any) =>
                    r.id.toString() === entity.parameters.resource.toString()
                );
                if (resource) {
                  try {
                    await loadModel(
                      resource,
                      entity,
                      module.parameters.transform
                    );
                  } catch (error) {
                    console.error(`加载模型失败:`, error);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    mixers.forEach((mixer) => mixer.update(delta));
    controls.update();
    renderer!.render(threeScene, camera!);
  };
  animate();
});

// 监听主题变化
watch(isDark, (newValue) => {
  if (renderer) {
    renderer.setClearColor(newValue ? 0x242424 : 0xeeeeee, 1);
  }
});

// 清理
onUnmounted(() => {
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }
  sources.clear();
  mixers.clear();
  clock = new THREE.Clock();
});

// 暴露方法
defineExpose({
  sources,
  threeScene,
  camera,
  renderer,
});
</script>
