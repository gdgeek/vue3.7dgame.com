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
  meta: any;
}>();

declare global {
  interface Window {
    meta: {
      [key: string]: Function;
    };
  }
}

const scene = ref<HTMLDivElement | null>(null);
const threeScene = new THREE.Scene();
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let mixers: Map<string, THREE.AnimationMixer> = new Map();
let sources: Map<string, any> = new Map();
let clock = new THREE.Clock();

const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);

const collisionObjects = ref<
  Array<{
    sourceUuid: string;
    targetUuid: string;
    eventUuid: string;
    boundingBox: THREE.Box3;
    isColliding: boolean;
    lastPosition: THREE.Vector3;
  }>
>([]);

const rotatingObjects = ref<
  Array<{
    mesh: THREE.Object3D;
    speed: { x: number; y: number; z: number };
  }>
>([]);

const moveableObjects = ref<
  Array<{
    mesh: THREE.Object3D;
    isDragging: boolean;
    magnetic: boolean;
    scalable: boolean;
    limit: {
      x: { enable: boolean; min: number; max: number };
      y: { enable: boolean; min: number; max: number };
      z: { enable: boolean; min: number; max: number };
    };
  }>
>([]);

// 添加拖拽状态管理
const dragState = reactive({
  isDragging: false,
  draggedObject: null as THREE.Object3D | null, // 拖动的对象
  dragStartPosition: new THREE.Vector3(), // 拖动开始位置
  dragOffset: new THREE.Vector3(), // 拖动偏移量
  mouseStartPosition: new THREE.Vector2(), // 鼠标开始位置
  lastIntersection: new THREE.Vector3(), // 最后一次交点
});

const controls = ref<OrbitControls | null>(null);
const mouse = new THREE.Vector2(); // 鼠标位置
const raycaster = new THREE.Raycaster(); // 射线投射器

const loadModel = async (resource: any, entity: any) => {
  console.log("开始加载模型:", {
    entityType: entity.type,
    entityUUID: entity.parameters?.uuid,
    resourceType: resource.type,
    isActive: entity.parameters.active,
  });

  // 初始化可见性
  const setInitialVisibility = (mesh: THREE.Object3D) => {
    mesh.visible =
      entity.parameters.active !== undefined ? entity.parameters.active : true;
    console.error(
      `设置模型 ${entity.parameters.uuid} 的初始可见性:`,
      mesh.visible
    );
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
          setInitialVisibility(mesh);

          // 应用变换
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
                mesh.visible = isVisible;
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
          setInitialVisibility(mesh);

          // 应用变换
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

          // 确保图片始终清晰可见
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
        setInitialVisibility(mesh);

        // 应用变换
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
            setInitialVisibility(voxMesh);

            // 应用变换
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

            // 启用阴影
            voxMesh.castShadow = true;
            voxMesh.receiveShadow = true;

            const uuid = entity.parameters.uuid.toString();
            sources.set(uuid, {
              type: "model",
              data: {
                mesh: voxMesh,
                setVisibility: (isVisible: boolean) => {
                  voxMesh.visible = isVisible;
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
    // 处理gltf模型
    const loader = new GLTFLoader();
    const url = convertToHttps(resource.file.url);

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          setInitialVisibility(model);
          const uuid = entity.parameters.uuid.toString();
          if (!entity.parameters || !entity.parameters.uuid) {
            console.error("entity.parameters对象无效:", entity.parameters);
            return reject(new Error("Invalid entity.parameters object"));
          } else {
            model.uuid = uuid;
          }

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
            console.log(`模型 ${entity.parameters.uuid} 动画加载完成:`, {
              animations: gltf.animations,
              animationNames: gltf.animations.map((a) => a.name),
            });
          }

          if (entity.children?.components) {
            // 点击触发
            const actionComponent = entity.children.components.find(
              (comp: any) => comp.type === "Action"
            );
            // 碰撞触发
            const triggerComponent = entity.children.components.find(
              (comp: any) => comp.type === "Trigger"
            );
            // 自旋转
            const rotateComponent = entity.children.components.find(
              (comp: any) => comp.type === "Rotate"
            );
            // 可移动
            const movedComponent = entity.children.components.find(
              (comp: any) => comp.type === "Moved"
            );

            if (actionComponent) {
              console.log("发现点击触发组件:", actionComponent);

              let isExecuting = false;

              // 添加点击事件处理
              const handleClick = async (event: MouseEvent) => {
                if (isExecuting) {
                  console.log("事件正在执行中，请等待完成...");
                  return;
                }

                // 计算鼠标位置
                const rect = renderer!.domElement.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                // 更新射线
                raycaster.setFromCamera(mouse, camera!);

                // 检查是否点击到模型
                const intersects = raycaster.intersectObject(model, true);
                if (intersects.length > 0) {
                  console.log("模型被点击:", entity.parameters.uuid);

                  // 查找并执行对应的事件处理函数
                  const eventId = actionComponent.parameters.uuid;
                  if (
                    window.meta &&
                    typeof window.meta[`@${eventId}`] === "function"
                  ) {
                    try {
                      isExecuting = true;
                      await window.meta[`@${eventId}`]();
                    } catch (error) {
                      console.error("执行事件处理函数失败:", error);
                    } finally {
                      isExecuting = false;
                    }
                  }
                }
              };

              // 添加点击事件监听器
              renderer!.domElement.addEventListener("click", handleClick);

              // 在sources中存储模型数据时包含cleanup函数
              const sourceData = {
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
              console.log("发现碰撞触发组件:", triggerComponent);

              // 创建包围盒
              const boundingBox = new THREE.Box3();
              boundingBox.setFromObject(model);

              // 记录上一帧的位置
              let lastPosition = model.position.clone();

              // 添加到动画循环中检查的碰撞对象列表
              const collisionData = {
                sourceUuid: entity.parameters.uuid,
                targetUuid: triggerComponent.parameters.target,
                eventUuid: triggerComponent.parameters.uuid,
                boundingBox: boundingBox,
                isColliding: false, // 防止重复触发
                lastPosition: lastPosition,
              };

              // 将碰撞数据添加到碰撞检测列表
              collisionObjects.value.push(collisionData);

              // 更新包围盒的函数
              const updateBoundingBox = () => {
                boundingBox.setFromObject(model);
              };

              // 在 sources 中保存更新函数
              const sourceData = sources.get(uuid);

              if (sourceData) {
                sourceData.data.updateBoundingBox = updateBoundingBox;
              }
            }
            if (rotateComponent) {
              console.log("发现自旋转组件:", rotateComponent);

              // 将速度从度/秒转换为弧度/秒
              const speed = {
                x: THREE.MathUtils.degToRad(rotateComponent.parameters.speed.x),
                y: THREE.MathUtils.degToRad(rotateComponent.parameters.speed.y),
                z: THREE.MathUtils.degToRad(rotateComponent.parameters.speed.z),
              };

              // 添加到旋转对象列表
              rotatingObjects.value.push({
                mesh: model,
                speed: speed,
              });

              // 在 sourceData 中添加控制旋转的方法
              const sourceData = {
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
                      });
                    }
                  },
                },
              };

              sources.set(uuid, sourceData);
            }
            if (movedComponent) {
              console.log("发现可移动组件:", movedComponent);

              const moveableObject = {
                mesh: model,
                isDragging: false,
                magnetic: movedComponent.parameters.magnetic,
                scalable: movedComponent.parameters.scalable,
                limit: movedComponent.parameters.limit,
              };

              moveableObjects.value.push(moveableObject);

              // 创建平面用于拖拽
              const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0)); // 拖动平面
              const intersection = new THREE.Vector3(); // 拖动交点

              // 添加鼠标事件处理
              const onMouseDown = (event: MouseEvent) => {
                event.preventDefault();
                const rect = renderer!.domElement.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, camera!);
                const intersects = raycaster.intersectObject(model, true);

                if (intersects.length > 0) {
                  console.log("开始拖拽模型:", entity.parameters.uuid);
                  dragState.isDragging = true;
                  dragState.draggedObject = model;
                  dragState.dragStartPosition.copy(model.position);
                  dragState.mouseStartPosition.copy(mouse);

                  // 计算点击点与物体中心的偏移
                  const intersectPoint = intersects[0].point;
                  dragState.dragOffset.copy(model.position).sub(intersectPoint);
                  dragState.lastIntersection.copy(intersectPoint);

                  controls.value!.enabled = false;
                }
              };

              const onMouseMove = (event: MouseEvent) => {
                if (!dragState.isDragging || !dragState.draggedObject) return;

                const rect = renderer!.domElement.getBoundingClientRect();
                const mouse = new THREE.Vector2(
                  ((event.clientX - rect.left) / rect.width) * 2 - 1,
                  -((event.clientY - rect.top) / rect.height) * 2 + 1
                );

                raycaster.setFromCamera(mouse, camera!);

                // 创建一个与相机视角垂直的平面
                const cameraNormal = new THREE.Vector3(0, 0, -1);
                cameraNormal.applyQuaternion(camera!.quaternion);
                const dragPlane = new THREE.Plane(
                  cameraNormal,
                  -dragState.dragStartPosition.dot(cameraNormal)
                );

                const intersection = new THREE.Vector3();

                if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
                  // 应用偏移
                  intersection.add(dragState.dragOffset);

                  // 找到当前正在拖动的物体对应的moveableObject
                  const moveableObject = moveableObjects.value.find(
                    (obj) => obj.mesh === dragState.draggedObject
                  );

                  // 计算新位置
                  const newPosition = new THREE.Vector3();
                  newPosition.lerpVectors(
                    dragState.draggedObject.position,
                    intersection,
                    0.5
                  );

                  // 只有当moveableObject存在且有限制设置时才应用限制
                  if (moveableObject?.limit) {
                    if (moveableObject.limit.x.enable) {
                      newPosition.x = THREE.MathUtils.clamp(
                        newPosition.x,
                        moveableObject.limit.x.min,
                        moveableObject.limit.x.max
                      );
                    }

                    if (moveableObject.limit.y.enable) {
                      newPosition.y = THREE.MathUtils.clamp(
                        newPosition.y,
                        moveableObject.limit.y.min,
                        moveableObject.limit.y.max
                      );
                    }

                    if (moveableObject.limit.z.enable) {
                      newPosition.z = THREE.MathUtils.clamp(
                        newPosition.z,
                        moveableObject.limit.z.min,
                        moveableObject.limit.z.max
                      );
                    }
                  }

                  // 应用新位置
                  dragState.draggedObject.position.copy(newPosition);
                  dragState.lastIntersection.copy(intersection);
                  console.log("移动到位置:", newPosition);
                }
              };

              const onMouseUp = () => {
                if (dragState.isDragging) {
                  console.log("结束拖拽");
                  dragState.isDragging = false;
                  dragState.draggedObject = null;
                  controls.value!.enabled = true;
                }
              };

              // 添加事件监听器
              renderer!.domElement.addEventListener("mousedown", onMouseDown);
              document.addEventListener("mousemove", onMouseMove);
              document.addEventListener("mouseup", onMouseUp);

              // 更新 sourceData
              const sourceData = {
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

// 获取音频URL
const getAudioUrl = (uuid: string): string | undefined => {
  const source = sources.get(uuid.toString());
  if (!source || source.type !== "audio") {
    console.error(`找不到UUID为 ${uuid} 的音频资源`);
    return undefined;
  }
  return (source.data as { url: string }).url;
};

// 播放动画
const playAnimation = (uuid: string, animationName: string) => {
  const source = sources.get(uuid.toString());
  if (!source || source.type !== "model") {
    console.error(`找不到UUID为 ${uuid} 的模型资源`);
    return;
  }

  const model = source.data.mesh as THREE.Object3D;
  const mixer = mixers.get(uuid);

  if (!model) {
    console.error(
      `找不到UUID为 ${uuid} 的模型，可用模型:`,
      Array.from(sources.keys())
    );
    return;
  }

  if (!mixer) {
    console.error(`找不到UUID为 ${uuid} 的动��混合器`);
    return;
  }

  const animations = model.userData?.animations;
  if (!animations || animations.length === 0) {
    console.error(`模型 ${uuid} 没有动画数据`);
    return;
  }

  const clip = animations.find(
    (anim: THREE.AnimationClip) => anim.name === animationName
  );
  if (!clip) {
    console.error(
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

// 音频播放处理
const handleAudioPlay = (audio: HTMLAudioElement) => {
  console.log("开始处理音频播放:", {
    src: audio.src,
    duration: audio.duration,
    currentTime: audio.currentTime,
  });

  return new Promise<void>((resolve) => {
    // 重置音频到开始位置
    audio.currentTime = 0;

    // 当音频播放结束时调用 resolve
    audio.onended = () => {
      console.log("音频播放完成:", {
        src: audio.src,
        duration: audio.duration,
      });
      resolve();
    };

    // 处理音频播放错误
    audio.onerror = () => {
      console.error("音频播放出错:", {
        src: audio.src,
        error: audio.error,
      });
      resolve();
    };

    // 开始播放
    audio.play().catch((error) => {
      console.error("播放音频失败:", {
        src: audio.src,
        error: error,
      });
      resolve();
    });
  });
};

// 音频播放队列管理
const audioPlaybackQueue: { audio: HTMLAudioElement; resolve: Function }[] = [];
let isPlaying = false;

// 处理音频队列
const processAudioQueue = async () => {
  console.log("处理音频队列:", {
    isPlaying,
    queueLength: audioPlaybackQueue.length,
  });

  if (isPlaying || audioPlaybackQueue.length === 0) return;

  isPlaying = true;

  while (audioPlaybackQueue.length > 0) {
    const current = audioPlaybackQueue[0];
    console.log("播放队列中的音频:", {
      src: current.audio.src,
      queueLength: audioPlaybackQueue.length,
    });

    await handleAudioPlay(current.audio);
    current.resolve();
    audioPlaybackQueue.shift();
  }

  isPlaying = false;
  console.log("音频队列处理完成");
};

// 音频播放
const playQueuedAudio = async (audio: HTMLAudioElement) => {
  console.log("添加音频到播放队列:", {
    src: audio.src,
    currentQueueLength: audioPlaybackQueue.length,
  });

  return new Promise<void>((resolve) => {
    audioPlaybackQueue.push({ audio, resolve });
    processAudioQueue();
  });
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
  controls.value = new OrbitControls(camera, renderer.domElement);
  controls.value.enableDamping = true;
  controls.value.dampingFactor = 0.05;
  controls.value.screenSpacePanning = true;
  controls.value.minDistance = 1;
  controls.value.maxDistance = 50;

  // 加载所有模型
  const metaData = JSON.parse(props.meta.data);
  console.log("解析后的metaData:", metaData);

  if (metaData.children?.entities) {
    for (const entity of metaData.children.entities) {
      console.log("处理实体:", entity);

      // 处理文本类型实体
      if (entity.type === "Text") {
        try {
          // 创建一个文本资源对象
          const textResource = {
            type: "text",
            content: entity.parameters.text || "DEFAULT TEXT",
            id: entity.parameters.uuid || crypto.randomUUID(),
          };

          await loadModel(textResource, entity);
          continue; // 跳过后续处理
        } catch (error) {
          console.error("处理文本实体失败:", error);
          continue;
        }
      }

      // 处理其他类型实体
      if (!entity.parameters?.resource) {
        console.warn("实体缺少resource参数:", entity);
        continue;
      }

      const resource = props.meta.resources.find(
        (r: any) => r.id.toString() === entity.parameters.resource.toString()
      );

      if (resource) {
        try {
          await loadModel(resource, entity);
        } catch (error) {
          console.error(
            `加载模型失败 (resource ${entity.parameters.resource}):`,
            error
          );
        }
      } else {
        console.warn(`未找到资源 ID ${entity.parameters.resource}`);
      }
    }
  } else {
    console.error("metaData格式错误:", metaData);
  }

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    mixers.forEach((mixer) => mixer.update(delta));

    // 更新旋转
    rotatingObjects.value.forEach((obj) => {
      obj.mesh.rotation.x += obj.speed.x * delta;
      obj.mesh.rotation.y += obj.speed.y * delta;
      obj.mesh.rotation.z += obj.speed.z * delta;
    });

    // 碰撞检测
    if (collisionObjects.value.length > 0) {
      for (const collisionObj of collisionObjects.value) {
        // 更新当前物体的包围盒
        const sourceModel = sources.get(collisionObj.sourceUuid)?.data.mesh;
        const targetModel = sources.get(collisionObj.targetUuid)?.data.mesh;

        if (sourceModel && targetModel) {
          // 检查物体是否移动
          if (!sourceModel.position.equals(collisionObj.lastPosition)) {
            // 更新包围盒
            collisionObj.boundingBox.setFromObject(sourceModel);

            // 创建目标物体的包围盒
            const targetBoundingBox = new THREE.Box3().setFromObject(
              targetModel
            );

            // 检测碰撞
            const isColliding =
              collisionObj.boundingBox.intersectsBox(targetBoundingBox);

            // 如果发生碰撞且之前未处于碰撞状态
            if (isColliding && !collisionObj.isColliding) {
              collisionObj.isColliding = true;
              console.log("检测到碰撞:", {
                source: collisionObj.sourceUuid,
                target: collisionObj.targetUuid,
              });

              // 执行碰撞事件
              if (
                window.meta &&
                typeof window.meta[`@${collisionObj.eventUuid}`] === "function"
              ) {
                try {
                  window.meta[`@${collisionObj.eventUuid}`]();
                } catch (error) {
                  console.error("执行碰撞事件处理函数失败:", error);
                }
              }
            }
            // 如果不再碰撞，重置碰撞状态
            else if (!isColliding && collisionObj.isColliding) {
              collisionObj.isColliding = false;
            }

            // 更新上一帧位置
            collisionObj.lastPosition.copy(sourceModel.position);
          }
        }
      }
    }

    controls.value!.update();
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

// 在组件卸载时清理资源
onUnmounted(() => {
  sources.forEach((source) => {
    if (source.type === "video") {
      const video = source.data.video;
      video.pause();
      video.src = "";
      video.load();

      // 清理事件监听器
      if (source.data.cleanup) {
        source.data.cleanup();
      }
    } else if (source.type === "audio") {
      // 清理音频队列
      while (audioPlaybackQueue.length > 0) {
        const queueItem = audioPlaybackQueue.shift();
        if (queueItem) {
          const audio = queueItem.audio;
          audio.pause();
          audio.src = "";
          audio.load();
          queueItem.resolve(); // 解决所有待处理的Promise
        }
      }
    }
  });

  // 清理渲染器和场景
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }

  // 重置状态
  isPlaying = false;
  sources.clear();
  mixers.clear();
  clock = new THREE.Clock();

  // 清理碰撞检测数据
  collisionObjects.value = [];
  // 清理旋转对象
  rotatingObjects.value = [];
  // 清理可移动对象
  moveableObjects.value = [];
  // 清理拖拽状态
  dragState.isDragging = false;
  // 清理拖拽对象
  dragState.draggedObject = null;
});

// 暴露方法
defineExpose({
  sources,
  playAnimation,
  getAudioUrl,
  playQueuedAudio,
});
</script>
