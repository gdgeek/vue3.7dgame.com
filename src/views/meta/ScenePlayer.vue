<template>
  <div>
    <div
      id="scene"
      ref="scene"
      style="height: 600px; width: 100%; margin: 0 auto"
    ></div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VOXLoader } from "three/examples/jsm/loaders/VOXLoader";
import { ref, onMounted, onUnmounted } from "vue";
import { convertToHttps } from "@/assets/js/helper";

// 将VOXMesh类移到这里
class VOXMesh extends THREE.Mesh {
  constructor(chunk: any, cell = 1) {
    const data = chunk.data;
    const size = chunk.size;
    const palette = chunk.palette;

    const vertices: number[] = [];
    const colors: number[] = [];

    // 定义六个面的顶点
    const nx = [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1];
    const px = [1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0];
    const py = [0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1];
    const ny = [0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0];
    const nz = [0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0];
    const pz = [0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1];

    const color = new THREE.Color();

    // 添加面的函数，调整缩放
    function add(
      tile: number[],
      x: number,
      y: number,
      z: number,
      r: number,
      g: number,
      b: number
    ) {
      // 调整中心点偏移计算
      x -= size.x / 2;
      y -= size.z / 2;
      z += size.y / 2;

      const scale = cell; // 使用传入的cell值作为基础缩放

      for (let i = 0; i < 18; i += 3) {
        vertices.push(
          (tile[i + 0] + x) * scale,
          (tile[i + 1] + y) * scale,
          (tile[i + 2] + z - 1) * scale
        );
        colors.push(r, g, b);
      }
    }

    // 计算偏移量
    const offsety = size.x;
    const offsetz = size.x * size.y;

    // 创建体素数组
    const array = new Uint8Array(size.x * size.y * size.z);
    for (let j = 0; j < data.length; j += 4) {
      const x = data[j + 0];
      const y = data[j + 1];
      const z = data[j + 2];
      const index = x + y * offsety + z * offsetz;
      array[index] = 255;
    }

    // 构建几何体
    let hasColors = false;
    for (let j = 0; j < data.length; j += 4) {
      const x = data[j + 0];
      const y = data[j + 1];
      const z = data[j + 2];
      const c = data[j + 3];

      const hex = palette[c];
      const r = ((hex >> 0) & 0xff) / 0xff;
      const g = ((hex >> 8) & 0xff) / 0xff;
      const b = ((hex >> 16) & 0xff) / 0xff;

      if (r > 0 || g > 0 || b > 0) hasColors = true;

      const index = x + y * offsety + z * offsetz;

      if (array[index + 1] === 0 || x === size.x - 1)
        add(px, x, z, -y, r, g, b);
      if (array[index - 1] === 0 || x === 0) add(nx, x, z, -y, r, g, b);
      if (array[index + offsety] === 0 || y === size.y - 1)
        add(ny, x, z, -y, r, g, b);
      if (array[index - offsety] === 0 || y === 0) add(py, x, z, -y, r, g, b);
      if (array[index + offsetz] === 0 || z === size.z - 1)
        add(pz, x, z, -y, r, g, b);
      if (array[index - offsetz] === 0 || z === 0) add(nz, x, z, -y, r, g, b);
    }

    // 创建几何体
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.computeVertexNormals();

    // 创建材质
    const material = new THREE.MeshStandardMaterial({
      flatShading: true,
      roughness: 0.8,
      metalness: 0.2,
      // 添加环境光遮蔽
      aoMapIntensity: 1.0,
      // 添加一些微弱的发光
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.1,
    });

    if (hasColors) {
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      material.vertexColors = true;
    }

    super(geometry, material);
  }
}

const props = defineProps<{
  meta: any;
}>();

const scene = ref<HTMLDivElement | null>(null);
const threeScene = new THREE.Scene();
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let mixers: Map<string, THREE.AnimationMixer> = new Map();
let sources: Map<string, any> = new Map();
let clock = new THREE.Clock();

// 自定义VOX加载器
class CustomVOXLoader extends VOXLoader {
  parse(buffer: ArrayBuffer) {
    const array = new Uint8Array(buffer);
    const magic = String.fromCharCode(...array.slice(0, 4));
    const version =
      array[4] | (array[5] << 8) | (array[6] << 16) | (array[7] << 24);

    console.log("VOX文件信息:", { magic, version });

    // 添加默认调色板
    const DEFAULT_PALETTE = [
      0x00000000, 0xffffffff, 0xffccffff, 0xff99ffff, 0xff66ffff, 0xff33ffff,
      0xff00ffff, 0xffffccff, 0xffccccff, 0xff99ccff, 0xff66ccff, 0xff33ccff,
      0xff00ccff, 0xffff99ff, 0xffcc99ff, 0xff9999ff, 0xff6699ff, 0xff3399ff,
      0xff0099ff, 0xffff66ff, 0xffcc66ff, 0xff9966ff, 0xff6666ff, 0xff3366ff,
      0xff0066ff, 0xffff33ff, 0xffcc33ff, 0xff9933ff, 0xff6633ff, 0xff3333ff,
      0xff0033ff, 0xffff00ff, 0xffcc00ff, 0xff9900ff, 0xff6600ff, 0xff3300ff,
      0xff0000ff, 0xffffffcc, 0xffccffcc, 0xff99ffcc, 0xff66ffcc, 0xff33ffcc,
      0xff00ffcc, 0xffffcccc, 0xffcccccc, 0xff99cccc, 0xff66cccc, 0xff33cccc,
      0xff00cccc, 0xffff99cc, 0xffcc99cc, 0xff9999cc, 0xff6699cc, 0xff3399cc,
      0xff0099cc, 0xffff66cc, 0xffcc66cc, 0xff9966cc, 0xff6666cc, 0xff3366cc,
      0xff0066cc, 0xffff33cc, 0xffcc33cc, 0xff9933cc, 0xff6633cc, 0xff3333cc,
      0xff0033cc, 0xffff00cc, 0xffcc00cc, 0xff9900cc, 0xff6600cc, 0xff3300cc,
      0xff0000cc, 0xffffff99, 0xffccff99, 0xff99ff99, 0xff66ff99, 0xff33ff99,
      0xff00ff99, 0xffffcc99, 0xffcccc99, 0xff99cc99, 0xff66cc99, 0xff33cc99,
      0xff00cc99, 0xffff9999, 0xffcc9999, 0xff999999, 0xff669999, 0xff339999,
      0xff009999, 0xffff6699, 0xffcc6699, 0xff996699, 0xff666699, 0xff336699,
      0xff006699, 0xffff3399, 0xffcc3399, 0xff993399, 0xff663399, 0xff333399,
      0xff003399, 0xffff0099, 0xffcc0099, 0xff990099, 0xff660099, 0xff330099,
      0xff000099, 0xffffff66, 0xffccff66, 0xff99ff66, 0xff66ff66, 0xff33ff66,
      0xff00ff66, 0xffffcc66, 0xffcccc66, 0xff99cc66, 0xff66cc66, 0xff33cc66,
      0xff00cc66, 0xffff9966, 0xffcc9966, 0xff999966, 0xff669966, 0xff339966,
      0xff009966, 0xffff6666, 0xffcc6666, 0xff996666, 0xff666666, 0xff336666,
      0xff006666, 0xffff3366, 0xffcc3366, 0xff993366, 0xff663366, 0xff333366,
      0xff003366, 0xffff0066, 0xffcc0066, 0xff990066, 0xff660066, 0xff330066,
      0xff000066, 0xffffff33, 0xffccff33, 0xff99ff33, 0xff66ff33, 0xff33ff33,
      0xff00ff33, 0xffffcc33, 0xffcccc33, 0xff99cc33, 0xff66cc33, 0xff33cc33,
      0xff00cc33, 0xffff9933, 0xffcc9933, 0xff999933, 0xff669933, 0xff339933,
      0xff009933, 0xffff6633, 0xffcc6633, 0xff996633, 0xff666633, 0xff336633,
      0xff006633, 0xffff3333, 0xffcc3333, 0xff993333, 0xff663333, 0xff333333,
      0xff003333, 0xffff0033, 0xffcc0033, 0xff990033, 0xff660033, 0xff330033,
      0xff000033, 0xffffff00, 0xffccff00, 0xff99ff00, 0xff66ff00, 0xff33ff00,
      0xff00ff00, 0xffffcc00, 0xffcccc00, 0xff99cc00, 0xff66cc00, 0xff33cc00,
      0xff00cc00, 0xffff9900, 0xffcc9900, 0xff999900, 0xff669900, 0xff339900,
      0xff009900, 0xffff6600, 0xffcc6600, 0xff996600, 0xff666600, 0xff336600,
      0xff006600, 0xffff3300, 0xffcc3300, 0xff993300, 0xff663300, 0xff333300,
      0xff003300, 0xffff0000, 0xffcc0000, 0xff990000, 0xff660000, 0xff330000,
      0xff0000ee, 0xff0000dd, 0xff0000bb, 0xff0000aa, 0xff000088, 0xff000077,
      0xff000055, 0xff000044, 0xff000022, 0xff000011, 0xff00ee00, 0xff00dd00,
      0xff00bb00, 0xff00aa00, 0xff008800, 0xff007700, 0xff005500, 0xff004400,
      0xff002200, 0xff001100, 0xffee0000, 0xffdd0000, 0xffbb0000, 0xffaa0000,
      0xff880000, 0xff770000, 0xff550000, 0xff440000, 0xff220000, 0xff110000,
      0xffeeeeee, 0xffdddddd, 0xffbbbbbb, 0xffaaaaaa, 0xff888888, 0xff777777,
      0xff555555, 0xff444444, 0xff222222, 0xff111111,
    ];

    const chunk = {
      palette: DEFAULT_PALETTE,
      size: { x: 0, y: 0, z: 0 },
      data: null as Uint8Array | null,
    };

    let i = 8;
    let mainSize =
      array[12] | (array[13] << 8) | (array[14] << 16) | (array[15] << 24);
    let mainChildrenSize =
      array[16] | (array[17] << 8) | (array[18] << 16) | (array[19] << 24);

    i += 12; // 跳过MAIN块头

    // 读取所有块
    while (i < array.length) {
      const chunkId = String.fromCharCode(...array.slice(i, i + 4));
      const chunkSize =
        array[i + 4] |
        (array[i + 5] << 8) |
        (array[i + 6] << 16) |
        (array[i + 7] << 24);
      const childrenSize =
        array[i + 8] |
        (array[i + 9] << 8) |
        (array[i + 10] << 16) |
        (array[i + 11] << 24);

      i += 12;

      console.log("处理块:", { chunkId, chunkSize, childrenSize });

      switch (chunkId) {
        case "SIZE":
          chunk.size = {
            x:
              array[i] |
              (array[i + 1] << 8) |
              (array[i + 2] << 16) |
              (array[i + 3] << 24),
            y:
              array[i + 4] |
              (array[i + 5] << 8) |
              (array[i + 6] << 16) |
              (array[i + 7] << 24),
            z:
              array[i + 8] |
              (array[i + 9] << 8) |
              (array[i + 10] << 16) |
              (array[i + 11] << 24),
          };
          console.log("模型尺寸:", chunk.size);
          break;

        case "XYZI":
          const numVoxels =
            array[i] |
            (array[i + 1] << 8) |
            (array[i + 2] << 16) |
            (array[i + 3] << 24);
          console.log("体素数量:", numVoxels);
          i += 4;
          chunk.data = new Uint8Array(buffer, i, numVoxels * 4);
          break;

        case "RGBA":
          const palette = [0];
          for (let j = 0; j < 256; j++) {
            palette[j + 1] =
              array[i + j * 4] |
              (array[i + j * 4 + 1] << 8) |
              (array[i + j * 4 + 2] << 16) |
              (array[i + j * 4 + 3] << 24);
          }
          chunk.palette = palette;
          break;
      }

      i += chunkSize;
    }

    console.log("解析完成:", {
      voxelCount: chunk.data ? chunk.data.length / 4 : 0,
      paletteSize: chunk.palette.length,
      modelSize: chunk.size,
    });

    return [chunk];
  }
}

// 修改loadModel函数，添加音频处理逻辑
const loadModel = async (resource: any, parameters: any) => {
  console.log("加载资源参数:", {
    resource,
    parameters,
    resourceId: resource.id,
    parametersUUID: parameters?.uuid,
  });

  // 处理视频类型
  if (resource.type === "video" || parameters.type === "Video") {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement("video");
        video.src = convertToHttps(resource.file.url);
        video.crossOrigin = "anonymous";

        // 设置视频属性
        video.loop = parameters.loop || false;
        video.muted = false;
        video.playsInline = true;
        video.volume = parameters.volume || 1.0;

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;

        video.addEventListener("loadedmetadata", () => {
          const aspectRatio = video.videoWidth / video.videoHeight;
          const width = parameters.width || 1;

          const geometry = new THREE.PlaneGeometry(1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
          });

          const mesh = new THREE.Mesh(geometry, material);

          // 应用变换
          if (parameters?.transform) {
            mesh.position.set(
              parameters.transform.position.x,
              parameters.transform.position.y,
              parameters.transform.position.z
            );

            mesh.rotation.set(
              THREE.MathUtils.degToRad(parameters.transform.rotate.x),
              THREE.MathUtils.degToRad(parameters.transform.rotate.y),
              THREE.MathUtils.degToRad(parameters.transform.rotate.z)
            );

            const baseScale = width;
            mesh.scale.set(
              parameters.transform.scale.x * baseScale,
              parameters.transform.scale.y * baseScale * (1 / aspectRatio),
              parameters.transform.scale.z * baseScale
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

          const uuid = parameters.uuid.toString();
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
            },
          });

          threeScene.add(mesh);

          // 如果设置了自动播放
          if (parameters.play) {
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
  if (resource.type === "picture" || parameters.type === "Picture") {
    return new Promise((resolve, reject) => {
      try {
        const textureLoader = new THREE.TextureLoader();
        const url = convertToHttps(resource.file.url);

        textureLoader.load(
          url,
          (texture) => {
            const aspectRatio = texture.image.width / texture.image.height;
            const width = parameters.width || 1;
            const height = width / aspectRatio;

            const geometry = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);

            // 应用变换
            if (parameters?.transform) {
              mesh.position.set(
                parameters.transform.position.x,
                parameters.transform.position.y,
                parameters.transform.position.z
              );

              mesh.rotation.set(
                THREE.MathUtils.degToRad(parameters.transform.rotate.x),
                THREE.MathUtils.degToRad(parameters.transform.rotate.y),
                THREE.MathUtils.degToRad(parameters.transform.rotate.z)
              );

              const baseScale = width;
              mesh.scale.set(
                parameters.transform.scale.x * baseScale,
                parameters.transform.scale.y * baseScale * (1 / aspectRatio),
                parameters.transform.scale.z * baseScale
              );
            }

            const uuid = parameters.uuid.toString();
            sources.set(uuid, {
              type: "picture",
              data: mesh,
            });

            threeScene.add(mesh);

            console.log("图片加载完成:", {
              uuid,
              position: mesh.position.toArray(),
              rotation: mesh.rotation.toArray(),
              scale: mesh.scale.toArray(),
              dimensions: { width, height, aspectRatio },
            });

            resolve(mesh);
          },
          undefined,
          (error) => {
            console.error("图片加载失败:", error);
            reject(error);
          }
        );
      } catch (error) {
        console.error("处理图片资源时出错:", error);
        reject(error);
      }
    });
  }

  // 处理音频类型
  if (resource.type === "audio") {
    return new Promise((resolve) => {
      const uuid = parameters.uuid.toString();
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
  if (parameters.type === "Text") {
    try {
      const textResource = {
        type: "text",
        content: parameters.text || "默认文本",
        id: parameters.uuid || crypto.randomUUID(),
      };

      await loadModel(textResource, parameters);
      return;
    } catch (error) {
      console.error("处理文本实体失败:", error);
      return;
    }
  }

  if (resource.type === "voxel") {
    const loader = new CustomVOXLoader();
    const url = convertToHttps(resource.file.url);

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (chunks) => {
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
            if (parameters?.transform) {
              voxMesh.position.set(
                parameters.transform.position.x,
                parameters.transform.position.y,
                parameters.transform.position.z
              );

              voxMesh.rotation.set(
                THREE.MathUtils.degToRad(parameters.transform.rotate.x),
                THREE.MathUtils.degToRad(parameters.transform.rotate.y),
                THREE.MathUtils.degToRad(parameters.transform.rotate.z)
              );

              const baseScale = 1;
              voxMesh.scale.set(
                parameters.transform.scale.x * baseScale,
                parameters.transform.scale.y * baseScale,
                parameters.transform.scale.z * baseScale
              );
            }

            // 启用阴影
            voxMesh.castShadow = true;
            voxMesh.receiveShadow = true;

            // 保存到模型Map中
            const uuid = parameters.uuid.toString();
            sources.set(uuid, {
              type: "model",
              data: voxMesh,
            });
            voxMesh.uuid = uuid;

            // 添加到场景
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
        (error) => {
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

          if (!parameters || !parameters.uuid) {
            console.error("parameters对象无效:", parameters);
            return reject(new Error("Invalid parameters object"));
          }

          if (parameters?.transform) {
            model.position.set(
              parameters.transform.position.x,
              parameters.transform.position.y,
              parameters.transform.position.z
            );
            model.rotation.set(
              parameters.transform.rotate.x,
              parameters.transform.rotate.y,
              parameters.transform.rotate.z
            );
            model.scale.set(
              parameters.transform.scale.x,
              parameters.transform.scale.y,
              parameters.transform.scale.z
            );
          }

          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            mixers.set(parameters.uuid, mixer);
            model.userData.animations = gltf.animations;
            console.log(`模型 ${parameters.uuid} 动画加载完成:`, {
              animations: gltf.animations,
              animationNames: gltf.animations.map((a) => a.name),
            });
          }

          const uuid = parameters.uuid.toString();
          sources.set(uuid, {
            type: "model",
            data: model,
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

  const model = source.data as THREE.Object3D;
  const mixer = mixers.get(uuid);

  if (!model) {
    console.error(
      `找不到UUID为 ${uuid} 的模型，可用模型:`,
      Array.from(sources.keys())
    );
    return;
  }

  if (!mixer) {
    console.error(`找不到UUID为 ${uuid} 的动画混合器`);
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
  return new Promise<void>((resolve) => {
    // 重置音频到开始位置
    audio.currentTime = 0;

    // 当音频播放结束时调用 resolve
    audio.onended = () => {
      resolve();
    };

    // 处理音频播放错误
    audio.onerror = () => {
      console.error("音频播放出错");
      resolve();
    };

    // 开始播放
    audio.play().catch((error) => {
      console.error("播放音频失败:", error);
      resolve();
    });
  });
};

// 音频播放队列管理
const audioPlaybackQueue: { audio: HTMLAudioElement; resolve: Function }[] = [];
let isPlaying = false;

// 处理音频队列
const processAudioQueue = async () => {
  if (isPlaying || audioPlaybackQueue.length === 0) return;

  isPlaying = true;

  while (audioPlaybackQueue.length > 0) {
    const current = audioPlaybackQueue[0];
    await handleAudioPlay(current.audio);
    current.resolve();
    audioPlaybackQueue.shift();
  }

  isPlaying = false;
};

// 音频播放
const playQueuedAudio = async (audio: HTMLAudioElement) => {
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

  // 设置相机
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 2, 5);

  // 设置渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0xeeeeee);
  scene.value.appendChild(renderer.domElement);

  // 添加轨道控制器
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  threeScene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  threeScene.add(directionalLight);

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
            content: entity.parameters.text || "默认文本",
            id: entity.parameters.uuid || crypto.randomUUID(),
          };

          await loadModel(textResource, entity.parameters);
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
          await loadModel(resource, entity.parameters);
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

    controls.update();
    renderer!.render(threeScene, camera!);
  };
  animate();
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
});

// 暴露方法
defineExpose({
  sources,
  playAnimation,
  getAudioUrl,
  playQueuedAudio,
});
</script>
