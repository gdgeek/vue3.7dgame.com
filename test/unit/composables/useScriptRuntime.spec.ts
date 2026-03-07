import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildScriptRuntime } from "@/composables/useScriptRuntime";
import * as THREE from "three";

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

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

      expect(player.playQueuedAudio).toHaveBeenCalledWith(audio, false);
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
    it("创建并立即执行 audio task", async () => {
      const player = makeMockPlayer();
      const { sound } = buildScriptRuntime({ value: player });
      const audio = new Audio();

      const task = sound.playTask(audio);

      expect(task).not.toBeNull();
      expect(task!.type).toBe("audio");
      // playQueuedAudio should have been called
      expect(player.playQueuedAudio).toHaveBeenCalledWith(audio);
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
    it("创建并立即执行 animation task", () => {
      const { animation } = buildScriptRuntime({ value: makeMockPlayer() });
      const instance = makeMeshWrapper();
      const task = animation.playTask(instance, "idle");

      expect(task).not.toBeNull();
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

      // sound.play 内部调用 playQueuedAudio(audio, false)
      expect(player.playQueuedAudio).toHaveBeenCalledWith(audio, false);
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

      // duration=0 → elapsed/0 = Infinity or NaN → progress = NaN → !NaN<1 → resolve
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

      expect(player.playQueuedAudio).toHaveBeenCalledWith(audio);
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
    it("BOUNCE_IN_OUT duration=0 不抛异常（NaN 进度 → else 分支）", async () => {
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
});
