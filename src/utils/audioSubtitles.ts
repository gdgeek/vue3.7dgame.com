export interface SubtitleCue {
  start: number;
  end: number | null;
  text: string;
  translation?: string;
}

export type SubtitleLanguageMode = "bilingual" | "primary" | "secondary";
export interface SubtitleSettings {
  primaryLanguage: string;
  secondaryLanguage: string;
  display: SubtitleLanguageMode;
}

export function readSubtitleSettings(raw: unknown): SubtitleSettings {
  const settings = audioMetadata(raw).subtitleSettings as
    | Partial<SubtitleSettings>
    | undefined;
  return {
    primaryLanguage:
      typeof settings?.primaryLanguage === "string"
        ? settings.primaryLanguage
        : "zh-CN",
    secondaryLanguage:
      typeof settings?.secondaryLanguage === "string"
        ? settings.secondaryLanguage
        : "en",
    display: "bilingual",
  };
}

export function audioMetadata(raw: unknown): Record<string, unknown> {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}

export function validateSubtitles(cues: SubtitleCue[]): SubtitleCue[] {
  if (cues.length > 3000) throw new Error("字幕最多支持 3000 条");
  const sorted = cues
    .map((cue, i) => {
      const text = typeof cue?.text === "string" ? cue.text.trim() : "";
      const translation =
        typeof cue?.translation === "string" ? cue.translation.trim() : "";
      if (
        !Number.isFinite(cue.start) ||
        cue.start < 0 ||
        (cue.end !== null &&
          (!Number.isFinite(cue.end) || cue.end <= cue.start)) ||
        !text ||
        text.length > 500 ||
        translation.length > 500
      )
        throw new Error(`第 ${i + 1} 条字幕的时间或文字无效`);
      return {
        start: cue.start,
        end: cue.end,
        text,
        ...(translation ? { translation } : {}),
      };
    })
    .sort((a, b) => a.start - b.start);
  if (
    sorted.some(
      (cue, i) => i > 0 && (sorted[i - 1].end ?? Infinity) > cue.start
    )
  ) {
    throw new Error("同一段音频的字幕时间不能重叠");
  }
  return sorted;
}

function timestamp(value: string): number {
  const match = /^(?:(\d+):)?([0-5]?\d):([0-5]\d)[.,](\d{3})$/.exec(value);
  if (!match) throw new Error(`无法读取时间：${value}`);
  return (
    Number(match[1] || 0) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(match[4]) / 1000
  );
}

export function parseSubtitleFile(
  source: string,
  duration?: number
): SubtitleCue[] {
  const body = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  let cues: SubtitleCue[];
  if (body.startsWith("{")) {
    const data = JSON.parse(body).data;
    if (!Array.isArray(data)) throw new Error("JSON 字幕需要 data 时间点列表");
    const rows = data
      .map((row) => {
        if (
          !row ||
          typeof row.time !== "number" ||
          !Number.isFinite(row.time) ||
          row.time < 0 ||
          typeof row.text !== "string"
        )
          throw new Error("JSON 字幕时间点无效");
        return { time: row.time as number, text: row.text as string };
      })
      .sort((a, b) => a.time - b.time);
    cues = rows.flatMap((row, i) => {
      if (!row.text.trim()) return [];
      const end =
        rows[i + 1]?.time ??
        (duration && duration > row.time ? duration : null);
      return [{ start: row.time, end, text: row.text }];
    });
  } else {
    const vtt = /^WEBVTT(?:\s|$)/.test(body);
    const chunks = body.split(/\n[ \t]*\n+/);
    if (vtt) chunks.shift();
    cues = chunks
      .filter(
        (chunk) =>
          !vtt ||
          !/^(?:NOTE(?:[ \t\n]|$)|STYLE(?:\n|$)|REGION(?:\n|$))/.test(chunk)
      )
      .map((chunk) => {
        const lines = chunk.split("\n");
        const i = lines.findIndex((line) => line.includes("-->"));
        const match = /^\s*(\S+)\s+-->\s+(\S+)/.exec(lines[i] || "");
        if (i < 0 || i > 1 || !match)
          throw new Error("无法读取字幕时间轴，请检查文件格式");
        return {
          start: timestamp(match[1]),
          end: timestamp(match[2]),
          text: lines
            .slice(i + 1)
            .join("\n")
            .replace(/<\/?(?:b|i|u|c|v|lang|ruby|rt)(?:[.\s][^<>]*)?>/gi, ""),
        };
      });
  }
  if (!cues.length) throw new Error("文件里没有可用字幕");
  return validateSubtitles(cues);
}

export function readAudioSubtitles(raw: unknown): SubtitleCue[] {
  const value = audioMetadata(raw).subtitles;
  try {
    if (!Array.isArray(value)) return [];
    return validateSubtitles(
      value.map((cue) => ({
        start: cue.start,
        end: cue.end ?? null,
        text: cue.text,
        translation: cue.translation,
      }))
    );
  } catch {
    return [];
  }
}

export function subtitleAt(cues: SubtitleCue[], time: number): string {
  return (
    cues.find(
      (cue) => cue.start <= time && (cue.end === null || time < cue.end)
    )?.text || ""
  );
}

const TIMELINE_TOLERANCE = 0.02;
const sentenceEnd = /[。！？.!?…][”’"'」』）)\]]*$/u;
const cjkEdge = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

function joinSubtitleText(left: string, right: string): string {
  const before = left.trimEnd(),
    after = right.trimStart();
  const noSpace =
    cjkEdge.test(before.slice(-1)) ||
    cjkEdge.test(after[0] ?? "") ||
    /^[，。！？、；：,.!?;:%…）)\]】」』]/u.test(after) ||
    /[（(\[【「『]$/u.test(before);
  return before + (noSpace ? "" : " ") + after;
}

function subtitleWidth(text: string): number {
  return Array.from(text).reduce(
    (size, character) => size + (/[\x00-\x7f]/.test(character) ? 0.5 : 1),
    0
  );
}

/** Import-only normalization. Keep sentence boundaries, pauses, and readable length. */
export function mergeAdjacentSubtitles(cues: SubtitleCue[]): SubtitleCue[] {
  const merged: SubtitleCue[] = [];
  for (const cue of validateSubtitles(cues)) {
    const previous = merged.at(-1);
    const text = previous
      ? joinSubtitleText(previous.text, cue.text)
      : cue.text;
    const translation =
      previous?.translation && cue.translation
        ? joinSubtitleText(previous.translation, cue.translation)
        : undefined;
    if (
      previous &&
      previous.end !== null &&
      cue.end !== null &&
      cue.start - previous.end <= TIMELINE_TOLERANCE + 1e-6 &&
      !sentenceEnd.test(previous.text) &&
      !sentenceEnd.test(previous.translation ?? "") &&
      cue.end - previous.start <= 8 &&
      subtitleWidth(text) <= 40 &&
      (!translation || subtitleWidth(translation) <= 40) &&
      Boolean(previous.translation) === Boolean(cue.translation)
    ) {
      previous.end = cue.end;
      previous.text = text;
      if (translation) previous.translation = translation;
    } else merged.push({ ...cue });
  }
  return merged;
}

/** Match complete time spans, including several translated pieces for one merged original. */
export function mergeSubtitleTranslation(
  cues: SubtitleCue[],
  translated: SubtitleCue[]
): SubtitleCue[] {
  const result = cues.map((cue) => ({ ...cue }));
  const groups = new Map<number, Array<{ cue: SubtitleCue; row: number }>>();
  const mismatch = (row: number) =>
    new Error(
      `译文第 ${row + 1} 条时间与原文不匹配，请使用相同时间轴，或在字幕编辑器中填写译文`
    );
  const sameTime = (left: number | null, right: number | null) =>
    left === null || right === null
      ? left === right
      : Math.abs(left - right) <= TIMELINE_TOLERANCE + 1e-6;
  for (const [row, translation] of translated.entries()) {
    const matches = cues.flatMap((cue, i) =>
      translation.start >= cue.start - TIMELINE_TOLERANCE &&
      (cue.end === null ||
        (translation.end !== null &&
          translation.end <= cue.end + TIMELINE_TOLERANCE))
        ? [i]
        : []
    );
    if (matches.length !== 1) throw mismatch(row);
    const group = groups.get(matches[0]) ?? [];
    group.push({ cue: translation, row });
    groups.set(matches[0], group);
  }
  for (const [index, group] of groups) {
    group.sort((left, right) => left.cue.start - right.cue.start);
    if (
      !sameTime(group[0].cue.start, cues[index].start) ||
      !sameTime(group.at(-1)!.cue.end, cues[index].end)
    )
      throw mismatch(group[0].row);
    for (let i = 1; i < group.length; i++) {
      const previousEnd = group[i - 1].cue.end;
      if (
        previousEnd === null ||
        group[i].cue.start < previousEnd ||
        !sameTime(previousEnd, group[i].cue.start)
      )
        throw mismatch(group[i].row);
    }
    const text = group.map((entry) => entry.cue.text).reduce(joinSubtitleText);
    if (text.length > 500)
      throw new Error(`合并后的译文超过 500 字，请缩短对应的译文内容`);
    result[index].translation = text;
  }
  return result;
}

export function subtitleLinesAt(
  cues: SubtitleCue[],
  time: number,
  mode: SubtitleLanguageMode = "bilingual"
): string[] {
  const cue = cues.find(
    (cue) => cue.start <= time && (cue.end === null || time < cue.end)
  );
  if (!cue) return [];
  return [
    mode !== "secondary" ? cue.text : "",
    mode !== "primary" ? cue.translation : "",
  ].filter((text): text is string => !!text);
}
