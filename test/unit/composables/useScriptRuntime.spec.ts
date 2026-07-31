import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildScriptRuntime,
  getScriptRuntimeBindingValues,
  resolveWithRetry,
  SCRIPT_RUNTIME_BINDING_NAMES,
} from "@/composables/useScriptRuntime";
import * as THREE from "three";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("resolveWithRetry", () => {
  it("首次未命中时将稍后重试成功值回传且仅回传一次", async () => {
    vi.useFakeTimers();
    try {
      const resolvedValue = { id: "model-ready" };
      const lookup = vi
        .fn<() => typeof resolvedValue | null>()
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValue(resolvedValue);
      const onResolved = vi.fn();

      expect(resolveWithRetry(lookup, onResolved, 3, 50)).toBeNull();
      expect(lookup).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(99);
      expect(onResolved).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(onResolved).toHaveBeenCalledOnce();
      expect(onResolved).toHaveBeenCalledWith(resolvedValue);
      expect(lookup).toHaveBeenCalledTimes(3);

      await vi.runAllTimersAsync();
      expect(onResolved).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});

// --- 工具函数：创建 mock ScenePlayer ---
function makeMockPlayer(
  overrides: Partial<{
    sources: Map<string, any>;
    playAnimation: (uuid: string, animName: string) => void;
    getAudioUrl: (uuid: string) => string | undefined;
    playQueuedAudio: (
      audio: HTMLAudioElement,
      skipQueue?: boolean
    ) => Promise<void>;
  }> = {}
) {
  return {
    sources: new Map<string, any>(),
    playAnimation: vi.fn(),
    getAudioUrl: vi.fn(),
    playQueuedAudio: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makePendingAudioPlayer() {
  const playQueuedAudio = vi.fn(
    (audio: HTMLAudioElement, _skipQueue: boolean = false) =>
      new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        Promise.resolve(audio.play()).catch(() => resolve());
      })
  );

  return {
    player: makeMockPlayer({ playQueuedAudio }),
    playQueuedAudio,
  };
}

function makeQueuedAudioPlayer() {
  type QueueItem = {
    audio: HTMLAudioElement;
    resolve: () => void;
  };

  const queue: QueueItem[] = [];
  let isPlaying = false;

  const playOne = (audio: HTMLAudioElement) =>
    new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      Promise.resolve(audio.play()).catch(() => resolve());
    });

  const processQueue = async () => {
    if (isPlaying) return;
    isPlaying = true;
    try {
      while (queue.length > 0) {
        const current = queue[0];
        await playOne(current.audio);
        current.resolve();
        queue.shift();
      }
    } finally {
      isPlaying = false;
    }
  };

  const playQueuedAudio = vi.fn(
    (audio: HTMLAudioElement, skipQueue: boolean = false) => {
      if (skipQueue) return playOne(audio);
      return new Promise<void>((resolve) => {
        queue.push({ audio, resolve });
        void processQueue();
      });
    }
  );

  return {
    player: makeMockPlayer({ playQueuedAudio }),
    playQueuedAudio,
  };
}

// 创建带有 mesh 的 MeshWrapper mock
function makeMeshWrapper(opts: { playAnimation?: boolean } = {}) {
  const mesh = new THREE.Object3D();
  return {
    mesh,
    playAnimation: opts.playAnimation !== false ? vi.fn() : undefined,
  } as any;
}

describe("buildScriptRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // handleText
  // ----------------------------------------------------------------
  describe("handleText", () => {
    it("源存在时返回 data", () => {
      const player = makeMockPlayer();
      player.sources.set("uuid-1", { type: "text", data: { text: "hello" } });
      const { handleText } = buildScriptRuntime({ value: player });

      expect(handleText("uuid-1")).toEqual({ text: "hello" });
    });

    it("源不存在时返回 null", () => {
      const { handleText } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(handleText("missing-uuid")).toBeNull();
    });

    it("scenePlayer 为 null 时返回 null", () => {
      const { handleText } = buildScriptRuntime({ value: null });
      expect(handleText("uuid")).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // handleEntity
  // ----------------------------------------------------------------
  describe("handleEntity", () => {
    it("源存在时返回 data", () => {
      const player = makeMockPlayer();
      player.sources.set("uuid-2", {
        type: "mesh",
        data: { mesh: new THREE.Object3D() },
      });
      const { handleEntity } = buildScriptRuntime({ value: player });

      const result = handleEntity("uuid-2");
      expect(result).toBeDefined();
      expect((result as any).mesh).toBeInstanceOf(THREE.Object3D);
    });

    it("源不存在时返回 null", () => {
      const { handleEntity } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(handleEntity("missing")).toBeNull();
    });
  });

  describe("handleVoxel", () => {
    it("返回 ScenePlayer 以 model source 登记的体素 data", () => {
      const player = makeMockPlayer();
      const voxelData = { mesh: new THREE.Object3D() };
      player.sources.set("voxel-1", { type: "model", data: voxelData });
      const { handleVoxel } = buildScriptRuntime({ value: player });

      expect(handleVoxel("voxel-1")).toBe(voxelData);
      expect(handleVoxel("missing-voxel")).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // handleSound
  // ----------------------------------------------------------------
  describe("handleSound", () => {
    it("URL 存在时返回 Audio 实例", () => {
      const player = makeMockPlayer();
      (player.getAudioUrl as ReturnType<typeof vi.fn>).mockReturnValue(
        "https://example.com/sound.mp3"
      );
      const { handleSound } = buildScriptRuntime({ value: player });

      const audio = handleSound("audio-uuid");
      expect(audio).toBeInstanceOf(Audio);
    });

    it("URL 不存在时返回 undefined", () => {
      const player = makeMockPlayer();
      (player.getAudioUrl as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined
      );
      const { handleSound } = buildScriptRuntime({ value: player });

      expect(handleSound("missing-audio")).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // polygen API
  // ----------------------------------------------------------------
  describe("polygen.playAnimation", () => {
    it("调用 playAnimation 方法", () => {
      const { polygen } = buildScriptRuntime({ value: makeMockPlayer() });
      const instance = makeMeshWrapper();
      polygen.playAnimation(instance, "walk");

      expect(instance.playAnimation).toHaveBeenCalledWith("walk");
    });

    it("instance 为 null 时不抛出异常", () => {
      const { polygen } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(() => polygen.playAnimation(null as any, "walk")).not.toThrow();
    });

    it("instance 没有 playAnimation 方法时不抛出异常", () => {
      const { polygen } = buildScriptRuntime({ value: makeMockPlayer() });
      const instance = makeMeshWrapper({ playAnimation: false });
      expect(() => polygen.playAnimation(instance, "run")).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // sound API
  // ----------------------------------------------------------------
  describe("sound.play", () => {
    it("调用 scenePlayer.playQueuedAudio", async () => {
      const player = makeMockPlayer();
      const { sound } = buildScriptRuntime({ value: player });
      const audio = new Audio();

      await sound.play(audio, false);

      expect(player.playQueuedAudio).toHaveBeenCalledWith(
        expect.any(HTMLAudioElement),
        false
      );
      expect(player.playQueuedAudio.mock.calls[0][0]).not.toBe(audio);
    });

    it("audio 为 undefined 时不调用 playQueuedAudio", async () => {
      const player = makeMockPlayer();
      const { sound } = buildScriptRuntime({ value: player });

      await sound.play(undefined, false);

      expect(player.playQueuedAudio).not.toHaveBeenCalled();
    });
  });

  describe("sound.createTask", () => {
    it("audio 有效时返回 type=audio 的 task 对象", () => {
      const { sound } = buildScriptRuntime({ value: makeMockPlayer() });
      const audio = new Audio();
      const task = sound.createTask(audio);

      expect(task).not.toBeNull();
      expect(task!.type).toBe("audio");
      expect(typeof task!.execute).toBe("function");
    });

    it("audio 为 undefined 时返回 null", () => {
      const { sound } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(sound.createTask(undefined)).toBeNull();
    });
  });

  describe("sound.playTask", () => {
    it("兼容别名返回惰性 audio task", async () => {
      const player = makeMockPlayer();
      const { sound } = buildScriptRuntime({ value: player });
      const audio = new Audio();

      const task = sound.playTask(audio);

      expect(task).not.toBeNull();
      expect(task!.type).toBe("audio");
      expect(player.playQueuedAudio).not.toHaveBeenCalled();
      await task!.execute!();
      expect(player.playQueuedAudio).toHaveBeenCalledWith(
        expect.any(HTMLAudioElement),
        false
      );
    });

    it("audio 为 undefined 时返回 null", () => {
      const { sound } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(sound.playTask(undefined)).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // helper API
  // ----------------------------------------------------------------
  describe("helper.handler", () => {
    it("源存在时返回 data", () => {
      const player = makeMockPlayer();
      player.sources.set("uuid-h", { type: "helper", data: { x: 1 } });
      const { helper } = buildScriptRuntime({ value: player });

      expect(helper.handler("", "uuid-h")).toEqual({ x: 1 });
    });

    it("源不存在时返回 null", () => {
      const { helper } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(helper.handler("", "missing")).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // tween API
  // ----------------------------------------------------------------
  describe("tween.to_object", () => {
    it("创建包含位置信息的 tween 数据", () => {
      const { tween } = buildScriptRuntime({ value: makeMockPlayer() });
      const from = makeMeshWrapper();
      const to = makeMeshWrapper();
      from.mesh.position.set(0, 0, 0);
      to.mesh.position.set(10, 5, 2);

      const result = tween.to_object(from, to, 1.5, "LINEAR");

      expect(result).not.toBeNull();
      expect(result!.type).toBe("object");
      expect(result!.duration).toBe(1.5);
      expect(result!.easing).toBe("LINEAR");
      expect(result!.endPos).toBeInstanceOf(THREE.Vector3);
    });

    it("from 为 null 时返回 null", () => {
      const { tween } = buildScriptRuntime({ value: makeMockPlayer() });
      const to = makeMeshWrapper();
      expect(tween.to_object(null as any, to, 1, "LINEAR")).toBeNull();
    });

    it("to 为 null 时返回 null", () => {
      const { tween } = buildScriptRuntime({ value: makeMockPlayer() });
      const from = makeMeshWrapper();
      expect(tween.to_object(from, null as any, 1, "LINEAR")).toBeNull();
    });
  });

  describe("tween.to_data", () => {
    it("创建包含旋转和缩放的 tween 数据", () => {
      const { tween } = buildScriptRuntime({ value: makeMockPlayer() });
      const obj = makeMeshWrapper();
      const transformData = {
        position: new THREE.Vector3(5, 0, 0),
        rotation: new THREE.Vector3(0, 90, 0),
        scale: new THREE.Vector3(2, 2, 2),
      };

      const result = tween.to_data(obj, transformData, 2.0, "EASE_IN");

      expect(result).not.toBeNull();
      expect(result!.type).toBe("data");
      expect(result!.duration).toBe(2.0);
      expect(result!.easing).toBe("EASE_IN");
      expect(result!.endPos).toEqual(transformData.position);
      expect(result!.endScale).toEqual(transformData.scale);
    });

    it("obj 为 null 时返回 null", () => {
      const { tween } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(
        tween.to_data(
          null as any,
          {
            position: new THREE.Vector3(),
            rotation: new THREE.Vector3(),
            scale: new THREE.Vector3(1, 1, 1),
          },
          1,
          "LINEAR"
        )
      ).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // task API
  // ----------------------------------------------------------------
  describe("task.array", () => {
    it("LIST 类型返回所有元素", () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const result = task.array("LIST", [1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it("SET 类型去除重复元素", () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const result = task.array("SET", [1, 2, 2, 3, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it("未知类型默认按 LIST 处理", () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const result = task.array("UNKNOWN", [1, 2]);
      expect(result).toEqual([1, 2]);
    });

    it("LIST 任务按顺序等待前一项完成", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const calls: string[] = [];
      let releaseFirst!: () => void;
      const first = () =>
        new Promise<void>((resolve) => {
          calls.push("first:start");
          releaseFirst = () => {
            calls.push("first:end");
            resolve();
          };
        });
      const second = () => {
        calls.push("second");
      };

      const execution = task.execute(task.array("LIST", [first, second]));
      await Promise.resolve();
      expect(calls).toEqual(["first:start"]);

      releaseFirst();
      await execution;
      expect(calls).toEqual(["first:start", "first:end", "second"]);
    });

    it("SET 任务并行启动并等待全部完成", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const calls: string[] = [];
      let releaseFirst!: () => void;
      const first = () =>
        new Promise<void>((resolve) => {
          calls.push("first:start");
          releaseFirst = resolve;
        });
      const second = () => {
        calls.push("second");
      };

      const execution = task.execute(task.array("SET", [first, second]));
      await Promise.resolve();
      expect(calls).toEqual(["first:start", "second"]);

      releaseFirst();
      await execution;
    });
  });

  describe("task.sleep", () => {
    it("返回一个函数", () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const sleepFn = task.sleep(1);
      expect(typeof sleepFn).toBe("function");
    });

    it("返回的函数调用后返回 Promise", () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const sleepFn = task.sleep(0.001);
      const result = sleepFn();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("task.execute", () => {
    it("tweenData 为 null 时直接返回", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      await expect(task.execute(null)).resolves.toBeUndefined();
    });

    it("tweenData 为函数时直接调用", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const fn = vi.fn().mockResolvedValue(undefined);
      await task.execute(fn);
      expect(fn).toHaveBeenCalledOnce();
    });

    it("tweenData 为 Promise 时等待 Promise", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const resolved = Promise.resolve(42);
      const result = await task.execute(resolved);
      expect(result).toBe(42);
    });
  });

  describe("task.circle", () => {
    it("执行函数 N 次", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const fn = vi.fn().mockResolvedValue(undefined);

      await task.circle(3, fn);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("count 为 0 时不执行", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const fn = vi.fn();

      await task.circle(0, fn);

      expect(fn).not.toHaveBeenCalled();
    });

    it("执行带 execute 方法的 task 对象", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const execute = vi.fn().mockResolvedValue(undefined);
      const taskObj = { type: "custom", execute };

      await task.circle(2, taskObj);

      expect(execute).toHaveBeenCalledTimes(2);
    });
  });

  // ----------------------------------------------------------------
  // animation API
  // ----------------------------------------------------------------
  describe("animation.createTask", () => {
    it("返回 type=animation 的 task 对象", () => {
      const { animation } = buildScriptRuntime({ value: makeMockPlayer() });
      const instance = makeMeshWrapper();
      const task = animation.createTask(instance, "run");

      expect(task).not.toBeNull();
      expect(task!.type).toBe("animation");
      expect(typeof task!.execute).toBe("function");
    });

    it("instance 为 null 时返回 null", () => {
      const { animation } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(animation.createTask(null as any, "run")).toBeNull();
    });

    it("instance 没有 playAnimation 方法时返回 null", () => {
      const { animation } = buildScriptRuntime({ value: makeMockPlayer() });
      const instance = makeMeshWrapper({ playAnimation: false });
      expect(animation.createTask(instance, "run")).toBeNull();
    });

    it("执行 task 时调用 playAnimation", async () => {
      const { animation } = buildScriptRuntime({ value: makeMockPlayer() });
      const instance = makeMeshWrapper();
      const task = animation.createTask(instance, "jump");

      await task!.execute!();

      expect(instance.playAnimation).toHaveBeenCalledWith("jump");
    });
  });

  describe("animation.playTask", () => {
    it("兼容别名返回惰性 animation task", async () => {
      const { animation } = buildScriptRuntime({ value: makeMockPlayer() });
      const instance = makeMeshWrapper();
      const task = animation.playTask(instance, "idle");

      expect(task).not.toBeNull();
      expect(instance.playAnimation).not.toHaveBeenCalled();
      await task!.execute!();
      expect(instance.playAnimation).toHaveBeenCalledWith("idle");
    });

    it("instance 无效时返回 null", () => {
      const { animation } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(animation.playTask(null as any, "idle")).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // event API
  // ----------------------------------------------------------------
  describe("event.trigger", () => {
    it("不抛出异常（仅记录日志）", () => {
      const { event } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(() => event.trigger("index", "evt-id")).not.toThrow();
    });
  });

  describe("event extraEvent 扩展", () => {
    it("extraEvent 中的方法可在 event 上调用", () => {
      const signal = vi.fn();
      const { event } = buildScriptRuntime(
        { value: makeMockPlayer() },
        {
          signal,
        }
      );

      (event as any).signal("arg1");
      expect(signal).toHaveBeenCalledWith("arg1");
    });
  });

  // ----------------------------------------------------------------
  // text API
  // ----------------------------------------------------------------
  describe("text.setText", () => {
    it("调用 object.setText", () => {
      const { text } = buildScriptRuntime({ value: makeMockPlayer() });
      const obj = { setText: vi.fn() };
      text.setText(obj, "Hello World");

      expect(obj.setText).toHaveBeenCalledWith("Hello World");
    });

    it("object 没有 setText 方法时不抛出异常", () => {
      const { text } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(() => text.setText({ no: "setText" }, "hi")).not.toThrow();
    });

    it("object 为 null 时不抛出异常", () => {
      const { text } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(() => text.setText(null, "hi")).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // point API
  // ----------------------------------------------------------------
  describe("point.setVisual", () => {
    it("调用 object.setVisibility", () => {
      const { point } = buildScriptRuntime({ value: makeMockPlayer() });
      const obj = { setVisibility: vi.fn() };
      point.setVisual(obj, true);

      expect(obj.setVisibility).toHaveBeenCalledWith(true);
    });

    it("object 没有 setVisibility 方法时不抛出异常", () => {
      const { point } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(() =>
        point.setVisual({ no: "setVisibility" }, false)
      ).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // transform
  // ----------------------------------------------------------------
  describe("transform", () => {
    it("传入 Vector3 时返回正确的 transform", () => {
      const { transform } = buildScriptRuntime({ value: makeMockPlayer() });
      const pos = new THREE.Vector3(1, 2, 3);
      const rot = new THREE.Vector3(0, 90, 0);
      const scale = new THREE.Vector3(2, 2, 2);

      const result = transform(pos, rot, scale);

      expect(result.position).toBe(pos);
      expect(result.rotation).toBe(rot);
      expect(result.scale).toBe(scale);
    });

    it("非 Vector3 值时使用默认值", () => {
      const { transform } = buildScriptRuntime({ value: makeMockPlayer() });
      const result = transform(null, null, null);

      expect(result.position).toBeInstanceOf(THREE.Vector3);
      expect(result.rotation).toBeInstanceOf(THREE.Vector3);
      // 默认 scale 是 (1, 1, 1)
      expect(result.scale).toEqual(new THREE.Vector3(1, 1, 1));
    });
  });

  // ----------------------------------------------------------------
  // argument API
  // ----------------------------------------------------------------
  describe("argument", () => {
    it("argument.boolean 原样返回", () => {
      const { argument } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(argument.boolean(true)).toBe(true);
      expect(argument.boolean(false)).toBe(false);
    });

    it("argument.number 原样返回", () => {
      const { argument } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(argument.number(42)).toBe(42);
      expect(argument.number(-3.14)).toBe(-3.14);
    });

    it("argument.string 原样返回", () => {
      const { argument } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(argument.string("hello")).toBe("hello");
    });

    it("argument.idPlayer 原样返回", () => {
      const { argument } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(argument.idPlayer(7)).toBe(7);
    });

    it("argument.point 传入 Vector3 时原样返回", () => {
      const { argument } = buildScriptRuntime({ value: makeMockPlayer() });
      const v = new THREE.Vector3(1, 2, 3);
      expect(argument.point(v)).toBe(v);
    });

    it("argument.point 传入非 Vector3 时返回默认 Vector3", () => {
      const { argument } = buildScriptRuntime({ value: makeMockPlayer() });
      expect(argument.point(null)).toBeInstanceOf(THREE.Vector3);
    });

    it("argument.range 返回中心点半径内的 Vector3", () => {
      const { argument } = buildScriptRuntime({ value: makeMockPlayer() });
      const center = new THREE.Vector3(0, 0, 0);
      const radius = 5;

      const result = argument.range(center, radius);

      expect(result).toBeInstanceOf(THREE.Vector3);
      const distance = result.distanceTo(center);
      expect(distance).toBeLessThanOrEqual(radius + 1e-9);
    });

    it("argument.range 传入非 Vector3 centerPoint 时以原点为中心", () => {
      const { argument } = buildScriptRuntime({ value: makeMockPlayer() });
      const result = argument.range(null as any, 3);
      expect(result).toBeInstanceOf(THREE.Vector3);
      // 中心 = (0,0,0), 半径 = 3
      const distance = result.distanceTo(new THREE.Vector3(0, 0, 0));
      expect(distance).toBeLessThanOrEqual(3 + 1e-9);
    });
  });

  // ----------------------------------------------------------------
  // task.circle — 额外未覆盖分支
  // ----------------------------------------------------------------
  describe("task.circle — 额外分支", () => {
    it("count 为负数时不执行任务并调用 warn", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const { logger } = await import("@/utils/logger");
      const fn = vi.fn();

      await task.circle(-1, fn);

      expect(fn).not.toHaveBeenCalled();
      expect(
        (logger as { warn: ReturnType<typeof vi.fn> }).warn
      ).toHaveBeenCalled();
    });

    it("taskToRepeat 为 Promise 时等待其解析后执行", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const fn = vi.fn().mockResolvedValue(undefined);
      const resolvedFnPromise = Promise.resolve(fn);

      await task.circle(2, resolvedFnPromise);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("resolvedTask 为 audio 类型时调用 sound.play", async () => {
      const player = makeMockPlayer();
      const { task } = buildScriptRuntime({ value: player });
      const audio = new Audio();
      const audioTask = { type: "audio", data: audio };

      await task.circle(1, audioTask);

      expect(player.playQueuedAudio).toHaveBeenCalledWith(
        expect.any(HTMLAudioElement),
        false
      );
    });

    it("resolvedTask 为 animation 类型时调用其 execute", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const execute = vi.fn().mockResolvedValue(undefined);
      const animTask = { type: "animation", execute };

      await task.circle(1, animTask);

      expect(execute).toHaveBeenCalledTimes(1);
    });

    it("resolvedTask 为未知类型时 warn 并提前 return", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const { logger } = await import("@/utils/logger");

      // 非 null，非函数，无 execute 方法，type 不是 audio/animation
      const unknownTask = { type: "xyz_unknown" };

      await task.circle(3, unknownTask);

      expect(
        (logger as { warn: ReturnType<typeof vi.fn> }).warn
      ).toHaveBeenCalled();
    });

    it("任务执行抛出异常时 logger.error 记录，循环仍继续", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const { logger } = await import("@/utils/logger");
      const failFn = vi.fn().mockRejectedValue(new Error("task failed"));

      await task.circle(2, failFn);

      expect(
        (logger as { error: ReturnType<typeof vi.fn> }).error
      ).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // task.array — 特殊元素类型
  // ----------------------------------------------------------------
  describe("task.array — 特殊元素类型", () => {
    it("嵌套数组被递归处理", () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const result = task.array("LIST", [[1, 2], 3]);
      expect(Array.isArray(result[0])).toBe(true);
      expect(result[1]).toBe(3);
    });

    it("含 'url' 字段的对象被转换为字符串 'audio'", () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const result = task.array("LIST", [{ url: "https://example.com/a.mp3" }]);
      expect(result[0]).toBe("audio");
    });

    it("含 'type' 字段的对象直接保留", () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const obj = { type: "animation", data: {} };
      const result = task.array("LIST", [obj]);
      expect(result[0]).toBe(obj);
    });

    it("Promise 元素被原样保留", () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const p = Promise.resolve(42);
      const result = task.array("LIST", [p]);
      expect(result[0]).toBe(p);
    });
  });

  // ----------------------------------------------------------------
  // task.execute — tween 动画（type=object / type=data）
  // ----------------------------------------------------------------
  describe("task.execute — tween 动画执行", () => {
    it("type='object'（duration=0）立即 resolve", async () => {
      const { task, tween } = buildScriptRuntime({ value: makeMockPlayer() });
      const from = makeMeshWrapper();
      const to = makeMeshWrapper();
      from.mesh.position.set(0, 0, 0);
      to.mesh.position.set(10, 0, 0);

      // duration=0 会直接应用最终状态并 resolve
      const tweenData = tween.to_object(from, to, 0, "LINEAR");
      await expect(task.execute(tweenData)).resolves.toBeUndefined();
    });

    it("type='data'（duration=0）立即 resolve", async () => {
      const { task, tween } = buildScriptRuntime({ value: makeMockPlayer() });
      const obj = makeMeshWrapper();
      const transformData = {
        position: new THREE.Vector3(5, 0, 0),
        rotation: new THREE.Vector3(0, 45, 0),
        scale: new THREE.Vector3(2, 2, 2),
      };

      const tweenData = tween.to_data(obj, transformData, 0, "LINEAR");
      await expect(task.execute(tweenData)).resolves.toBeUndefined();
    });

    it("tweenData 为非对象原始值时直接返回", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      // "string" → !isRecord → return
      await expect(
        task.execute("not-an-object" as any)
      ).resolves.toBeUndefined();
    });

    it("未知 easing 类型时降级使用 LINEAR", async () => {
      const { task, tween } = buildScriptRuntime({ value: makeMockPlayer() });
      const from = makeMeshWrapper();
      const to = makeMeshWrapper();
      const tweenData = tween.to_object(from, to, 0, "INVALID_EASING");
      await expect(task.execute(tweenData)).resolves.toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // sound.createTask — execute 内部逻辑
  // ----------------------------------------------------------------
  describe("sound.createTask — execute 内部调用", () => {
    it("调用 task.execute() 触发 playQueuedAudio", async () => {
      const player = makeMockPlayer();
      const { sound } = buildScriptRuntime({ value: player });
      const audio = new Audio();
      const taskObj = sound.createTask(audio);

      await taskObj!.execute!();

      expect(player.playQueuedAudio).toHaveBeenCalledWith(
        expect.any(HTMLAudioElement),
        false
      );
    });
  });

  // ----------------------------------------------------------------
  // task.circle — animation 类型任务 (line 269)
  // ----------------------------------------------------------------
  describe("task.circle — animation 类型任务", () => {
    it("type='animation' 时调用 resolvedTask.execute", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const mockExecute = vi.fn().mockResolvedValue(undefined);
      const animTask = { type: "animation", execute: mockExecute };
      await task.circle(1, animTask);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("type='animation' count=2 时调用 execute 两次", async () => {
      vi.useFakeTimers();
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const mockExecute = vi.fn().mockResolvedValue(undefined);
      const animTask = { type: "animation", execute: mockExecute };
      const p = task.circle(2, animTask);
      vi.runAllTimersAsync();
      await p;
      expect(mockExecute).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  // ----------------------------------------------------------------
  // BOUNCE_IN_OUT easing — both branches (lines 236-238)
  // requestAnimationFrame loop (line 362)
  // ----------------------------------------------------------------
  describe("BOUNCE_IN_OUT easing + requestAnimationFrame 循环", () => {
    it("BOUNCE_IN_OUT duration=0 直接应用最终状态", async () => {
      const { task, tween } = buildScriptRuntime({ value: makeMockPlayer() });
      const from = makeMeshWrapper();
      const to = makeMeshWrapper();
      from.mesh.position.set(0, 0, 0);
      to.mesh.position.set(5, 0, 0);
      const tweenData = tween.to_object(from, to, 0, "BOUNCE_IN_OUT");
      await expect(task.execute(tweenData)).resolves.toBeUndefined();
    });

    it("BOUNCE_IN_OUT duration>0 走完动画循环（覆盖 t<0.5 和 requestAnimationFrame）", async () => {
      vi.useFakeTimers();
      // Mock requestAnimationFrame so it calls the callback via setTimeout(fn, 0)
      const rafIds = new Map<number, () => void>();
      let rafId = 0;
      vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
        const id = ++rafId;
        rafIds.set(id, cb);
        setTimeout(cb, 0);
        return id;
      });

      const { task, tween } = buildScriptRuntime({ value: makeMockPlayer() });
      const from = makeMeshWrapper();
      const to = makeMeshWrapper();
      from.mesh.position.set(0, 0, 0);
      to.mesh.position.set(10, 0, 0);

      // duration = 0.001 seconds → very short, so after 10ms it completes
      const tweenData = tween.to_object(from, to, 0.001, "BOUNCE_IN_OUT");
      const p = task.execute(tweenData);

      // Advance time to complete the tween
      await vi.advanceTimersByTimeAsync(100);
      await p;

      vi.unstubAllGlobals();
      vi.useRealTimers();
    });
  });

  // ----------------------------------------------------------------
  // picture / video runtime
  // ----------------------------------------------------------------
  describe("handlePicture", () => {
    it("只返回 picture source data", () => {
      const player = makeMockPlayer();
      const pictureData = { mesh: new THREE.Object3D() };
      player.sources.set("picture-1", { type: "picture", data: pictureData });
      player.sources.set("model-1", { type: "model", data: pictureData });
      const { handlePicture } = buildScriptRuntime({ value: player });

      expect(handlePicture("picture-1")).toBe(pictureData);
      expect(handlePicture("model-1")).toBeNull();
      expect(handlePicture("missing")).toBeNull();
    });
  });

  describe("video runtime", () => {
    it("handleVideo 返回 ScenePlayer 中的视频 data", () => {
      const player = makeMockPlayer();
      const data = { video: document.createElement("video") };
      player.sources.set("video-1", { type: "video", data });
      const { handleVideo } = buildScriptRuntime({ value: player });

      expect(handleVideo("video-1")).toBe(data);
      expect(handleVideo("missing")).toBeNull();
    });

    it("URL-only source 复用同一视频实例，pause 可取消当前及排队播放", async () => {
      const playSpy = vi
        .spyOn(HTMLMediaElement.prototype, "play")
        .mockResolvedValue(undefined);
      vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
        () => {}
      );
      const sourceData = { url: "https://example.com/video.mp4" };
      const { video } = buildScriptRuntime({ value: makeMockPlayer() });

      const first = video.play(sourceData);
      const queued = video.play(sourceData);
      await video.pause(sourceData);

      await expect(Promise.all([first, queued])).resolves.toEqual([
        undefined,
        undefined,
      ]);
      expect(playSpy).toHaveBeenCalledOnce();
    });

    it("play 等待 ended，pause/stop 会释放等待且 stop 重置进度", async () => {
      const videoElement = document.createElement("video");
      const playSpy = vi
        .spyOn(videoElement, "play")
        .mockResolvedValue(undefined);
      const pauseSpy = vi
        .spyOn(videoElement, "pause")
        .mockImplementation(() => {});
      const { video } = buildScriptRuntime({ value: makeMockPlayer() });

      const firstPlayback = video.play(videoElement, true);
      expect(playSpy).toHaveBeenCalledOnce();
      videoElement.dispatchEvent(new Event("ended"));
      await firstPlayback;

      videoElement.currentTime = 8;
      const secondPlayback = video.play(videoElement, true);
      await video.stop(videoElement);
      await secondPlayback;
      expect(pauseSpy).toHaveBeenCalled();
      expect(videoElement.currentTime).toBe(0);
    });

    it("auto_play 在播放中暂停，在暂停中恢复", async () => {
      const videoElement = document.createElement("video");
      const pauseSpy = vi
        .spyOn(videoElement, "pause")
        .mockImplementation(() => {});
      const playSpy = vi
        .spyOn(videoElement, "play")
        .mockResolvedValue(undefined);
      let paused = false;
      vi.spyOn(videoElement, "paused", "get").mockImplementation(() => paused);
      const { video } = buildScriptRuntime({ value: makeMockPlayer() });

      await video.auto_play(videoElement, true);
      expect(pauseSpy).toHaveBeenCalledOnce();
      expect(playSpy).not.toHaveBeenCalled();

      paused = true;
      videoElement.currentTime = 3;
      await video.auto_play(videoElement, true);
      expect(playSpy).toHaveBeenCalledOnce();
    });

    it("auto_play 对排队视频再次触发时取消队列且不会播放", async () => {
      const activeVideo = document.createElement("video");
      const queuedVideo = document.createElement("video");
      const activePlay = vi
        .spyOn(activeVideo, "play")
        .mockResolvedValue(undefined);
      const queuedPlay = vi
        .spyOn(queuedVideo, "play")
        .mockResolvedValue(undefined);
      const { video } = buildScriptRuntime({ value: makeMockPlayer() });

      const activePlayback = video.play(activeVideo);
      const firstToggle = video.auto_play(queuedVideo);
      const secondToggle = video.auto_play(queuedVideo);

      await Promise.all([firstToggle, secondToggle]);
      expect(activePlay).toHaveBeenCalledOnce();
      expect(queuedPlay).not.toHaveBeenCalled();

      activeVideo.dispatchEvent(new Event("ended"));
      await activePlayback;
      expect(queuedPlay).not.toHaveBeenCalled();
    });

    it("原生 pause 事件会释放当前等待并推进视频队列", async () => {
      const firstVideo = document.createElement("video");
      const secondVideo = document.createElement("video");
      const firstPlay = vi
        .spyOn(firstVideo, "play")
        .mockResolvedValue(undefined);
      const secondPlay = vi
        .spyOn(secondVideo, "play")
        .mockResolvedValue(undefined);
      const { video } = buildScriptRuntime({ value: makeMockPlayer() });

      const firstPlayback = video.play(firstVideo);
      const secondPlayback = video.play(secondVideo);
      expect(firstPlay).toHaveBeenCalledOnce();
      expect(secondPlay).not.toHaveBeenCalled();

      firstVideo.dispatchEvent(new Event("pause"));
      await firstPlayback;
      await vi.waitFor(() => expect(secondPlay).toHaveBeenCalledOnce());

      secondVideo.dispatchEvent(new Event("ended"));
      await secondPlayback;
    });

    it("兼容旧版 handleVideo 复合参数并在播放完成后回调", async () => {
      const videoElement = document.createElement("video");
      vi.spyOn(videoElement, "play").mockResolvedValue(undefined);
      const player = makeMockPlayer();
      player.sources.set("legacy-video", {
        type: "video",
        data: { video: videoElement },
      });
      const callback = vi.fn();
      const { handleVideo } = buildScriptRuntime({ value: player });

      expect(
        handleVideo('handleVideo("legacy-video"), true', callback)
      ).toEqual({ video: videoElement });
      videoElement.dispatchEvent(new Event("ended"));

      await vi.waitFor(() => expect(callback).toHaveBeenCalledOnce());
    });

    it("createTask/playTask 提供通用 task.execute 契约", async () => {
      const videoElement = document.createElement("video");
      vi.spyOn(videoElement, "play").mockResolvedValue(undefined);
      const { video } = buildScriptRuntime({ value: makeMockPlayer() });

      const taskObject = video.createTask(videoElement);
      expect(taskObject).toMatchObject({ type: "video", data: videoElement });
      const execution = taskObject!.execute!();
      videoElement.dispatchEvent(new Event("ended"));
      await execution;
      expect(video.createTask(undefined)).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // sound toggle/stop compatibility
  // ----------------------------------------------------------------
  describe("sound auto_play / stop", () => {
    it("handleSound 按 UUID 缓存控制句柄，历史 pause 会取消实际播放副本", async () => {
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
      const playSpy = vi
        .spyOn(HTMLMediaElement.prototype, "play")
        .mockResolvedValue(undefined);
      const pauseSpy = vi
        .spyOn(HTMLMediaElement.prototype, "pause")
        .mockImplementation(() => {});
      const { player, playQueuedAudio } = makePendingAudioPlayer();
      (player.getAudioUrl as ReturnType<typeof vi.fn>).mockReturnValue(
        "https://example.com/cached.mp3"
      );
      const { handleSound, sound } = buildScriptRuntime({ value: player });
      const handle = handleSound("sound-cached")!;

      const playback = sound.play(handle, true);
      const playbackAudio = playQueuedAudio.mock.calls[0][0];

      expect(handleSound("sound-cached")).toBe(handle);
      expect(playbackAudio).not.toBe(handle);
      handle.pause();
      await playback;

      expect(playSpy).toHaveBeenCalledOnce();
      expect(pauseSpy).toHaveBeenCalledOnce();
      expect(pauseSpy.mock.instances[0]).toBe(playbackAudio);
      expect(playbackAudio.getAttribute("src")).toBeNull();
    });

    it("auto_play 再次触发时取消当前播放副本并释放等待", async () => {
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
      vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
      const pauseSpy = vi
        .spyOn(HTMLMediaElement.prototype, "pause")
        .mockImplementation(() => {});
      const { player, playQueuedAudio } = makePendingAudioPlayer();
      const audioHandle = new Audio("https://example.com/toggle.mp3");
      const { sound } = buildScriptRuntime({ value: player });

      const playback = sound.auto_play(audioHandle, true);
      const playbackAudio = playQueuedAudio.mock.calls[0][0];
      const toggleOff = sound.auto_play(audioHandle, true);

      await Promise.all([playback, toggleOff]);

      expect(playQueuedAudio).toHaveBeenCalledOnce();
      expect(pauseSpy).toHaveBeenCalledOnce();
      expect(pauseSpy.mock.instances[0]).toBe(playbackAudio);
      expect(playbackAudio.getAttribute("src")).toBeNull();
    });

    it("stop 取消播放副本并归零，且兼容历史 handleSound(...).stop()", async () => {
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
      vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
      const pauseSpy = vi
        .spyOn(HTMLMediaElement.prototype, "pause")
        .mockImplementation(() => {});
      const { player, playQueuedAudio } = makePendingAudioPlayer();
      (player.getAudioUrl as ReturnType<typeof vi.fn>).mockReturnValue(
        "https://example.com/sound.mp3"
      );
      const { handleSound, sound } = buildScriptRuntime({ value: player });
      const audioHandle = handleSound("sound-1") as HTMLAudioElement & {
        stop: () => void;
      };

      const firstPlayback = sound.play(audioHandle, true);
      const firstPlaybackAudio = playQueuedAudio.mock.calls[0][0];
      firstPlaybackAudio.currentTime = 5;
      await sound.stop(audioHandle);
      await firstPlayback;
      expect(audioHandle.currentTime).toBe(0);

      const secondPlayback = sound.play(audioHandle, true);
      const secondPlaybackAudio = playQueuedAudio.mock.calls[1][0];
      secondPlaybackAudio.currentTime = 3;
      audioHandle.stop();
      await secondPlayback;

      expect(secondPlaybackAudio).not.toBe(firstPlaybackAudio);
      expect(audioHandle.currentTime).toBe(0);
      expect(pauseSpy).toHaveBeenCalledTimes(2);
      expect(pauseSpy.mock.instances).toEqual([
        firstPlaybackAudio,
        secondPlaybackAudio,
      ]);
    });

    it("同一控制句柄的普通播放和 skipQueue 播放使用独立副本并发完成", async () => {
      const playSpy = vi
        .spyOn(HTMLMediaElement.prototype, "play")
        .mockResolvedValue(undefined);
      const { player, playQueuedAudio } = makePendingAudioPlayer();
      (player.getAudioUrl as ReturnType<typeof vi.fn>).mockReturnValue(
        "https://example.com/concurrent.mp3"
      );
      const { handleSound, sound } = buildScriptRuntime({ value: player });
      const audioHandle = handleSound("sound-concurrent")!;

      const normalPlayback = sound.play(audioHandle, false);
      const immediatePlayback = sound.play(audioHandle, true);
      const normalAudio = playQueuedAudio.mock.calls[0][0];
      const immediateAudio = playQueuedAudio.mock.calls[1][0];

      expect(normalAudio).not.toBe(audioHandle);
      expect(immediateAudio).not.toBe(audioHandle);
      expect(immediateAudio).not.toBe(normalAudio);
      expect(playQueuedAudio.mock.calls.map((call) => call[1])).toEqual([
        false,
        true,
      ]);
      expect(playSpy).toHaveBeenCalledTimes(2);

      immediateAudio.dispatchEvent(new Event("ended"));
      normalAudio.dispatchEvent(new Event("ended"));
      await Promise.all([normalPlayback, immediatePlayback]);
    });

    it("stop 会预取消尚在队列中的副本，队列推进后不会真正出声", async () => {
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
      const playSpy = vi
        .spyOn(HTMLMediaElement.prototype, "play")
        .mockResolvedValue(undefined);
      const pauseSpy = vi
        .spyOn(HTMLMediaElement.prototype, "pause")
        .mockImplementation(() => {});
      const { player, playQueuedAudio } = makeQueuedAudioPlayer();
      (player.getAudioUrl as ReturnType<typeof vi.fn>).mockReturnValue(
        "https://example.com/queued.mp3"
      );
      const { handleSound, sound } = buildScriptRuntime({ value: player });
      const audioHandle = handleSound("sound-queued")!;

      const activePlayback = sound.play(audioHandle, false);
      const queuedPlayback = sound.play(audioHandle, false);
      const activeAudio = playQueuedAudio.mock.calls[0][0];
      const queuedAudio = playQueuedAudio.mock.calls[1][0];

      expect(playSpy).toHaveBeenCalledOnce();
      await sound.stop(audioHandle);
      await Promise.all([activePlayback, queuedPlayback]);
      await vi.waitFor(() => expect(playSpy).toHaveBeenCalledOnce());

      expect(activeAudio).not.toBe(queuedAudio);
      expect(queuedAudio.getAttribute("src")).toBeNull();
      expect(pauseSpy).toHaveBeenCalledTimes(2);
    });

    it("pause 后立即 resume，旧播放 finally 不会误删新会话，随后 stop 仍可取消", async () => {
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
      const playSpy = vi
        .spyOn(HTMLMediaElement.prototype, "play")
        .mockResolvedValue(undefined);
      const pauseSpy = vi
        .spyOn(HTMLMediaElement.prototype, "pause")
        .mockImplementation(() => {});
      const { player, playQueuedAudio } = makePendingAudioPlayer();
      const audioHandle = new Audio("https://example.com/resume.mp3");
      const { sound } = buildScriptRuntime({ value: player });

      const initialPlayback = sound.auto_play(audioHandle, true);
      const initialAudio = playQueuedAudio.mock.calls[0][0];
      initialAudio.currentTime = 4;

      const pauseToggle = sound.auto_play(audioHandle, true);
      const resumedPlayback = sound.auto_play(audioHandle, true);
      const resumedAudio = playQueuedAudio.mock.calls[1][0];

      expect(resumedAudio.currentTime).toBe(4);
      await Promise.all([initialPlayback, pauseToggle]);
      await sound.stop(audioHandle);
      await resumedPlayback;

      expect(playSpy).toHaveBeenCalledTimes(2);
      expect(pauseSpy).toHaveBeenCalledTimes(2);
      expect(pauseSpy.mock.instances).toEqual([initialAudio, resumedAudio]);
      expect(resumedAudio.getAttribute("src")).toBeNull();
      expect(audioHandle.currentTime).toBe(0);
    });

    it("sound.pause 不重置当前播放位置", async () => {
      const audio = new Audio();
      vi.spyOn(audio, "pause").mockImplementation(() => {});
      audio.currentTime = 4;
      const { sound } = buildScriptRuntime({ value: makeMockPlayer() });

      await sound.pause(audio);

      expect(audio.currentTime).toBe(4);
    });
  });

  describe("task media array contract", () => {
    it("circle 按序执行 audio/video/animation task，每轮各一次且创建时不预播", async () => {
      const player = makeMockPlayer();
      const runtime = buildScriptRuntime({ value: player });
      const audio = new Audio();
      const videoElement = document.createElement("video");
      const videoPlay = vi
        .spyOn(videoElement, "play")
        .mockImplementation(() => {
          queueMicrotask(() => videoElement.dispatchEvent(new Event("ended")));
          return Promise.resolve();
        });
      const polygenInstance = makeMeshWrapper();
      const tasks = [
        runtime.sound.createTask(audio),
        runtime.video.createTask(videoElement),
        runtime.animation.createTask(polygenInstance, "wave"),
      ];

      expect(player.playQueuedAudio).not.toHaveBeenCalled();
      expect(videoPlay).not.toHaveBeenCalled();
      expect(polygenInstance.playAnimation).not.toHaveBeenCalled();

      await runtime.task.circle(2, tasks);

      expect(player.playQueuedAudio).toHaveBeenCalledTimes(2);
      expect(videoPlay).toHaveBeenCalledTimes(2);
      expect(polygenInstance.playAnimation).toHaveBeenCalledTimes(2);
    });

    it("task.execute 递归执行 Promise 和嵌套数组", async () => {
      const { task } = buildScriptRuntime({ value: makeMockPlayer() });
      const first = vi.fn();
      const second = vi.fn();

      await task.execute([
        Promise.resolve({ execute: first }),
        [{ execute: second }],
      ]);

      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
    });
  });

  // ----------------------------------------------------------------
  // point extended API
  // ----------------------------------------------------------------
  describe("point extended API", () => {
    it("复用实体控制能力并提供 Web 安全 fallback", () => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      const scene = new THREE.Scene();
      scene.add(mesh);
      const setRotating = vi.fn();
      const object = { mesh, setRotating };
      const { point } = buildScriptRuntime({ value: makeMockPlayer() });

      point.setHighlight(object, true, "red");
      point.setMoveable(object, true);
      point.setRotatable(object, false);
      point.setTooltipVisual(object, true);

      expect(
        scene.children.some((child) => child instanceof THREE.BoxHelper)
      ).toBe(true);
      expect(mesh.userData.xrugcMoveable).toBe(true);
      expect(mesh.userData.xrugcTooltipVisible).toBe(true);
      expect(setRotating).toHaveBeenCalledWith(false);
    });

    it("toTransformData 返回独立的 position/degree rotation/scale", () => {
      const mesh = new THREE.Object3D();
      mesh.position.set(1, 2, 3);
      mesh.rotation.set(0, Math.PI / 2, 0);
      mesh.scale.set(2, 3, 4);
      const { point } = buildScriptRuntime({ value: makeMockPlayer() });

      const result = point.toTransformData({ mesh });

      expect(result).toEqual({
        position: new THREE.Vector3(1, 2, 3),
        rotation: new THREE.Vector3(0, 90, 0),
        scale: new THREE.Vector3(2, 3, 4),
      });
      expect(result!.position).not.toBe(mesh.position);
      expect(result!.scale).not.toBe(mesh.scale);
    });

    it("explode/unexplode 展开并恢复子物体位置", () => {
      const root = new THREE.Group();
      const first = new THREE.Object3D();
      const second = new THREE.Object3D();
      first.position.set(-1, 0, 0);
      second.position.set(1, 0, 0);
      root.add(first, second);
      const originalFirst = first.position.clone();
      const originalSecond = second.position.clone();
      const { point } = buildScriptRuntime({ value: makeMockPlayer() });

      point.explode({ mesh: root }, 2);
      expect(first.position).not.toEqual(originalFirst);
      expect(second.position).not.toEqual(originalSecond);

      point.unexplode({ mesh: root });
      expect(first.position).toEqual(originalFirst);
      expect(second.position).toEqual(originalSecond);
    });

    it("line 在共同父节点下创建 THREE.Line", () => {
      const scene = new THREE.Scene();
      const from = new THREE.Object3D();
      const to = new THREE.Object3D();
      from.position.set(1, 0, 0);
      to.position.set(2, 0, 0);
      scene.add(from, to);
      const { point } = buildScriptRuntime({ value: makeMockPlayer() });

      const line = point.line({ mesh: from }, { mesh: to });

      expect(line).toBeInstanceOf(THREE.Line);
      expect(scene.children).toContain(line);
    });

    it("tween 将普通 transform 数据转换后交给 task.execute", async () => {
      const object = makeMeshWrapper();
      const runtime = buildScriptRuntime({ value: makeMockPlayer() });
      const executeSpy = vi
        .spyOn(runtime.task, "execute")
        .mockResolvedValue(undefined);

      await runtime.point.tween(
        object,
        {
          position: { x: 1, y: 2, z: 3 },
          rotate: { x: 0, y: 90, z: 0 },
          scale: { x: 2, y: 2, z: 2 },
        },
        0.5,
        true
      );

      expect(executeSpy).toHaveBeenCalledOnce();
      expect(executeSpy.mock.calls[0][0]).toMatchObject({
        type: "data",
        duration: 0.5,
        easing: "LINEAR",
      });
    });

    it("优先调用实体已有的原生方法", async () => {
      const entity = {
        explode: vi.fn(),
        unexplode: vi.fn(),
        lineTo: vi.fn(),
        tweenTo: vi.fn().mockResolvedValue(undefined),
      };
      const { point } = buildScriptRuntime({ value: makeMockPlayer() });

      point.explode(entity, 1);
      point.unexplode(entity);
      point.line(entity, {});
      await point.tween(entity, {}, 2, true);

      expect(entity.explode).toHaveBeenCalledWith(1);
      expect(entity.unexplode).toHaveBeenCalledOnce();
      expect(entity.lineTo).toHaveBeenCalledOnce();
      expect(entity.tweenTo).toHaveBeenCalledWith({}, 2, true);
    });
  });

  // ----------------------------------------------------------------
  // managers + deterministic injection contract
  // ----------------------------------------------------------------
  describe("managers", () => {
    it("Web 预览维护安全的分数/倒计时状态并派发事件", () => {
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");
      const { managers } = buildScriptRuntime({ value: makeMockPlayer() });

      expect(managers.game_add_score(5)).toMatchObject({ score: 5 });
      expect(managers.game_countdown(30)).toMatchObject({
        score: 5,
        countdownSeconds: 30,
      });
      expect(managers.game_reset()).toMatchObject({
        score: 0,
        countdownSeconds: 0,
      });
      expect(dispatchSpy).toHaveBeenCalledTimes(3);
    });

    it("正式宿主在 parameter 上提供方法时优先委托", () => {
      const gameAddScore = vi.fn().mockReturnValue("delegated");
      const { managers } = buildScriptRuntime({ value: makeMockPlayer() });

      expect(managers.game_add_score(2, { game_add_score: gameAddScore })).toBe(
        "delegated"
      );
      expect(gameAddScore).toHaveBeenCalledWith(2);
    });
  });

  describe("remaining Blockly compatibility APIs", () => {
    it("polygen 控制方法优先委托，并可用 emote 回退动画", () => {
      const setHighlight = vi.fn();
      const setMoveable = vi.fn();
      const setRotating = vi.fn();
      const playAnimation = vi.fn();
      const instance = {
        mesh: new THREE.Object3D(),
        setHighlight,
        setMoveable,
        setRotating,
        playAnimation,
      };
      const { polygen } = buildScriptRuntime({ value: makeMockPlayer() });

      polygen.setHighlight(instance, true, "blue");
      polygen.setMoveable(instance, true);
      polygen.setRotatable(instance, false);
      polygen.setEmote(instance, "smile");

      expect(setHighlight).toHaveBeenCalledWith(true, "blue");
      expect(setMoveable).toHaveBeenCalledWith(true);
      expect(setRotating).toHaveBeenCalledWith(false);
      expect(playAnimation).toHaveBeenCalledWith("smile");
    });

    it("event.signal_array 规范化对象/数组并调用宿主 signal", () => {
      const signal = vi.fn();
      const { event } = buildScriptRuntime(
        { value: makeMockPlayer() },
        { signal }
      );

      event.signal_array([
        { index: "module-1", uuid: "event-1", parameter: 3 },
        ["module-2", "event-2"],
        {},
      ]);

      expect(signal).toHaveBeenNthCalledWith(1, "module-1", "event-1", 3);
      expect(signal).toHaveBeenNthCalledWith(
        2,
        "module-2",
        "event-2",
        undefined
      );
    });

    it("helper/system/argument/log 提供无 ReferenceError 的稳定返回", () => {
      const player = makeMockPlayer();
      const mesh = new THREE.Object3D();
      mesh.position.set(4, 5, 6);
      player.sources.set("anchor-1", { type: "model", data: { mesh } });
      const runtime = buildScriptRuntime({ value: player });

      expect(runtime.helper.parameters([1, 2])).toEqual([1, 2]);
      expect(runtime.system.parameter("value")).toBe("value");
      expect(runtime.argument.indexPlayer(2)).toBe(2);
      expect(runtime.argument.serverPlayer()).toBe("server");
      expect(runtime.argument.randomPlayer()).toBe("random_client");
      expect(runtime.argument.anchor("anchor-1")).toEqual(
        new THREE.Vector3(4, 5, 6)
      );
      expect(runtime.log.post("string", "key", "value")).toMatchObject({
        dataType: "string",
        key: "key",
        value: "value",
      });
      expect(runtime.log.resetUuid()).toEqual(expect.any(String));
    });

    it("helper.sync_sleep 提供可等待且不阻塞主线程的兼容入口", async () => {
      vi.useFakeTimers();
      try {
        const { helper } = buildScriptRuntime({ value: makeMockPlayer() });
        const sleep = helper.sync_sleep(0.1);
        let completed = false;
        void sleep.then(() => {
          completed = true;
        });

        await vi.advanceTimersByTimeAsync(99);
        expect(completed).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await sleep;
        expect(completed).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it("system.task 返回惰性任务并通过 Web 事件桥执行", async () => {
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");
      const { system, task } = buildScriptRuntime({ value: makeMockPlayer() });
      const systemTask = system.task("open-panel", { tab: "resource" });

      expect(systemTask).toMatchObject({
        type: "system",
        data: {
          method: "open-panel",
          parameter: { tab: "resource" },
        },
      });
      expect(dispatchSpy).not.toHaveBeenCalled();

      await task.execute(systemTask);

      expect(dispatchSpy).toHaveBeenCalledOnce();
      expect(dispatchSpy.mock.calls[0][0]).toMatchObject({
        type: "xrugc:system-task",
        detail: {
          method: "open-panel",
          parameter: { tab: "resource" },
        },
      });
    });
  });

  describe("script runtime binding contract", () => {
    it("参数名和实参数组同序注入所有 Blockly 运行时能力", () => {
      const runtime = buildScriptRuntime({ value: makeMockPlayer() });
      const values = getScriptRuntimeBindingValues(runtime);
      const executable = new Function(
        ...SCRIPT_RUNTIME_BINDING_NAMES,
        "return { handleVoxel, handlePicture, handleVideo, video, sound, point, managers, system, log };"
      );

      expect(values).toHaveLength(SCRIPT_RUNTIME_BINDING_NAMES.length);
      expect(executable(...values)).toEqual({
        handleVoxel: runtime.handleVoxel,
        handlePicture: runtime.handlePicture,
        handleVideo: runtime.handleVideo,
        video: runtime.video,
        sound: runtime.sound,
        point: runtime.point,
        managers: runtime.managers,
        system: runtime.system,
        log: runtime.log,
      });
    });
  });
});
