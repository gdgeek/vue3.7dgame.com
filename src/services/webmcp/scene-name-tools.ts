import {
  formatSceneName,
  formatClonedSceneName,
  parseSceneName,
  resolveSceneNameTimeZone,
  SCENE_NAME_FORMAT,
  SCENE_NAME_MAX_LENGTH,
} from "@/utils/sceneName";
import type { WebMcpTool } from "./model-context";

export const SCENE_NAME_TOOL_NAME = "xrugc_format_scene_name";
export const SCENE_NAME_GUIDANCE = `场景需要日期后缀时，先调用 ${SCENE_NAME_TOOL_NAME}，将返回的 name 原样用于创建；统一使用 ${SCENE_NAME_FORMAT}，不要手拼紧凑日期、括号日期或重复时间后缀。克隆场景或组件时传 refreshTimestamp:true，替换旧时间；没有日期需求时可保留普通名称。`;

export const getSceneNamingGuidance = () => ({
  formatterTool: SCENE_NAME_TOOL_NAME,
  format: SCENE_NAME_FORMAT,
  maximumLength: SCENE_NAME_MAX_LENGTH,
  defaultTimeZone: resolveSceneNameTimeZone(),
  dateSuffixRequired: false,
  cloneInput: { refreshTimestamp: true },
  recommendation: SCENE_NAME_GUIDANCE,
});

const parseTimestamp = (value: unknown): Date => {
  if (typeof value !== "string")
    throw new TypeError("timestamp 必须是带 Z 或时区偏移的完整日期时间");
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u
  );
  if (!match)
    throw new TypeError(
      "timestamp 须使用 YYYY-MM-DDTHH:mm:ssZ 或 YYYY-MM-DDTHH:mm:ss+08:00；不要传含糊的纯日期"
    );
  const wallClock = new Date(`${match[1]}Z`);
  const timestamp = new Date(value);
  if (
    Number.isNaN(wallClock.getTime()) ||
    wallClock.toISOString().slice(0, 19) !== match[1] ||
    Number.isNaN(timestamp.getTime())
  ) {
    throw new RangeError("timestamp 包含不存在的日期或时间");
  }
  return timestamp;
};

/** Pure naming assistance, available independently of editor readiness. */
export const createSceneNameTools = (
  now: () => number = Date.now
): WebMcpTool[] => [
  {
    name: SCENE_NAME_TOOL_NAME,
    title: "生成规范的场景名称",
    description: `${SCENE_NAME_GUIDANCE} 此工具只返回名称，不新建、保存或重命名场景。省略 timestamp 使用真实当前时间；默认采用浏览器本地时区，可显式指定 IANA 时区。已有规范名称未指定 timestamp 且未要求刷新时保持原样；克隆时清理旧的规范时间及历史副本时间，只保留本次时间。不猜测历史标题中日期的业务含义或缺失的时分秒。`,
    inputSchema: {
      type: "object",
      properties: {
        baseName: {
          type: "string",
          minLength: 1,
          maxLength: SCENE_NAME_MAX_LENGTH,
          description:
            "不含手写日期后缀的场景标题正文；也可传已有规范名称以避免重复追加。完整输出不得超过 200 字符。",
        },
        timestamp: {
          type: "string",
          format: "date-time",
          description:
            "可选的明确时间，如 2026-09-21T11:00:05+08:00；须含秒和 Z 或偏移。省略时由工具取当前时间，不要由 AI 猜当前日期。",
        },
        timeZone: {
          type: "string",
          description:
            "可选的 IANA 输出时区，如 Asia/Shanghai；默认浏览器本地时区，日期与时间使用同一时区。",
        },
        refreshTimestamp: {
          type: "boolean",
          default: false,
          description:
            "克隆场景或组件时设为 true：将末尾已有的时间替换为本次时间，清理重复时间及历史副本时间。省略 timestamp 时取当前真实时间，不在名称后再叠加时间。",
        },
      },
      required: ["baseName"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute(input, execution) {
      execution?.signal.throwIfAborted();
      try {
        if (!input || typeof input !== "object" || Array.isArray(input))
          throw new TypeError("命名参数必须是对象");
        const params = input as Record<string, unknown>;
        if (
          Object.keys(params).some(
            (key) =>
              ![
                "baseName",
                "timestamp",
                "timeZone",
                "refreshTimestamp",
              ].includes(key)
          )
        ) {
          throw new TypeError(
            "仅接受 baseName、timestamp、timeZone 和 refreshTimestamp 参数"
          );
        }
        if (typeof params.baseName !== "string")
          throw new TypeError("baseName 必须是场景标题正文");
        if (params.baseName.length > SCENE_NAME_MAX_LENGTH)
          throw new RangeError("完整场景名称不能超过 200 个字符");
        if (
          params.refreshTimestamp !== undefined &&
          typeof params.refreshTimestamp !== "boolean"
        ) {
          throw new TypeError("refreshTimestamp 必须是布尔值");
        }
        if (
          params.timeZone !== undefined &&
          (typeof params.timeZone !== "string" || !params.timeZone.trim())
        ) {
          throw new TypeError("timeZone 必须是有效的 IANA 时区名称");
        }
        const baseName = params.baseName.trim();
        const existing = parseSceneName(baseName);
        const timeZone = resolveSceneNameTimeZone(
          params.timeZone as string | undefined
        );
        const refresh = params.refreshTimestamp === true;
        const preserve =
          existing !== null && params.timestamp === undefined && !refresh;
        const at =
          params.timestamp === undefined
            ? new Date(now())
            : parseTimestamp(params.timestamp);
        // The shared formatter validates names and length even for an existing suffix.
        const formatted = refresh
          ? formatClonedSceneName(params.baseName, undefined, at, timeZone)
          : formatSceneName(params.baseName, at, timeZone);
        const candidateBase = refresh
          ? parseSceneName(formatted)!.baseName
          : baseName;
        if (
          !existing &&
          /(?:\d{4}-\d{2}-\d{2}|\d{4}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))(?:[ _T]\d[\d:.-]*)?[）)]?$/u.test(
            candidateBase
          )
        ) {
          throw new TypeError(
            "baseName 中有非规范的日期后缀；请单独提供标题正文，需要保留历史时间时明确传 timestamp，不猜测缺失时间"
          );
        }
        const name = preserve ? baseName : formatted;
        if (name.length > SCENE_NAME_MAX_LENGTH)
          throw new RangeError("完整场景名称不能超过 200 个字符");
        const parts = parseSceneName(name)!;
        return {
          name,
          baseName: parts.baseName,
          date: parts.date,
          time: parts.time,
          format: SCENE_NAME_FORMAT,
          // Existing names contain no timezone; do not infer their original zone.
          timeZone: preserve ? null : timeZone,
          timestampSource: preserve
            ? "existing"
            : params.timestamp === undefined
              ? "current"
              : "provided",
          nextStep:
            "将 name 原样用于场景或组件的创建/克隆名称；xrugc_stage_authoring_creation 用 kind=scene/entity。格式化本身不创建、克隆或修改对象。",
        };
      } catch (error) {
        if (!(error instanceof TypeError || error instanceof RangeError))
          throw error;
        return {
          isError: true,
          status: "failed",
          errorCode: "invalid_scene_name",
          message: error.message,
          nextStep:
            "提供不含手写日期后缀的 baseName；省略 timestamp 使用当前时间，保留历史时间则传带秒和时区的完整 timestamp。不会修改已有场景。",
        };
      }
    },
  },
];
