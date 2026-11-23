<template>
  <el-dialog
    :model-value="modelValue"
    title="字幕编辑"
    width="800px"
    top="8vh"
    class="audio-subtitle-dialog"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :before-close="close"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #header="{ titleId, titleClass }">
      <div class="subtitle-dialog-heading">
        <span :id="titleId" :class="titleClass">字幕编辑</span>
        <span class="subtitle-resource-name" :title="resource?.name">{{
          resource?.name || (mediaType === "video" ? "视频字幕" : "音频字幕")
        }}</span>
      </div>
    </template>
    <div
      ref="dialogContent"
      v-loading="loading"
      class="subtitle-dialog-content"
      @beforeinput.capture="handleNativeHistory"
      @compositionstart.capture="composing = true"
      @compositionend.capture="composing = false"
    >
      <fieldset class="subtitle-controls" :disabled="busy || !resource">
        <div class="subtitle-top-row">
          <el-button round :disabled="busy || !resource" @click="addCue"
            >添加字幕</el-button
          >
          <el-button round :disabled="busy || !cues.length" @click="clearCues"
            >清空字幕</el-button
          >
          <span
            class="subtitle-history-action"
            title="撤销（⌘Z / Ctrl+Z）"
            @mousedown.prevent
          >
            <el-button
              size="small"
              circle
              :disabled="busy || !canUndo"
              @click="undo"
              ><svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 11a9 9 0 1 1 2.1 5.8" />
                <path d="M3 4v7h7" /></svg
              ><span class="subtitle-action-label">撤销</span></el-button
            >
          </span>
          <span
            class="subtitle-history-action"
            title="重做（⌘⇧Z / Ctrl+Y / Ctrl+Shift+Z）"
            @mousedown.prevent
          >
            <el-button
              size="small"
              circle
              :disabled="busy || !canRedo"
              @click="redo"
              ><svg
                class="subtitle-redo-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 11a9 9 0 1 1 2.1 5.8" />
                <path d="M3 4v7h7" /></svg
              ><span class="subtitle-action-label">重做</span></el-button
            >
          </span>
          <div class="subtitle-import-actions">
            <select v-model="importTarget" aria-label="导入目标">
              <option value="primary">原文</option>
              <option value="secondary">译文</option>
            </select>
            <input
              ref="fileInput"
              type="file"
              accept=".srt,.vtt,.json"
              hidden
              :disabled="busy || !resource"
              @change="importFile"
            />
            <el-button
              size="small"
              round
              type="primary"
              :disabled="busy || !resource"
              @click="fileInput?.click()"
              >{{ cues.length ? "替换字幕文件" : "导入字幕文件" }}</el-button
            >
          </div>
        </div>
        <div class="subtitle-formats">SRT、VTT、JSON</div>
        <div class="subtitle-table">
          <div ref="cueList" class="subtitle-cues">
            <div
              v-if="cues.length"
              class="subtitle-column-headers"
              aria-hidden="true"
            >
              <span></span><span title="单位：秒">开始时间</span
              ><span title="单位：秒；留空表示到播放结束">结束时间</span
              ><span>原文</span><span>译文</span><span></span>
            </div>
            <div v-if="!cues.length" class="subtitle-empty">
              暂无字幕，点击「添加字幕」或导入字幕文件。
            </div>
            <div
              v-for="(cue, i) in cues"
              :key="cueKey(cue)"
              class="subtitle-cue"
              :aria-label="'第 ' + (i + 1) + ' 条字幕'"
            >
              <span class="subtitle-number">{{ i + 1 }}</span>
              <input
                :value="displayCueTime(cue, 'start')"
                :aria-label="'第 ' + (i + 1) + ' 条开始时间'"
                title="开始时间（秒）"
                type="text"
                inputmode="decimal"
                @input="queueCueTime(cue, 'start', $event)"
                @change="editCueTime(cue, 'start', $event)"
              />
              <input
                :value="displayCueTime(cue, 'end')"
                :aria-label="'第 ' + (i + 1) + ' 条结束时间'"
                title="结束时间（秒）"
                type="text"
                inputmode="decimal"
                placeholder="结束"
                @input="queueCueTime(cue, 'end', $event)"
                @change="editCueTime(cue, 'end', $event)"
              />
              <div class="subtitle-text-cell">
                <textarea
                  :value="cue.text"
                  @input="editCueText(cue, 'text', $event)"
                  @compositionend="editCueText(cue, 'text', $event)"
                  @pointerdown="startTextDrag"
                  @dragstart="stopTextDrag"
                  @blur="
                    endGroup();
                    stopTextDrag();
                  "
                  :aria-label="'第 ' + (i + 1) + ' 条原文'"
                  :title="cue.text || undefined"
                  rows="1"
                  wrap="off"
                  maxlength="500"
                  placeholder="输入字幕内容"
                />
                <span
                  v-if="cue.text"
                  class="subtitle-cell-summary"
                  aria-hidden="true"
                  >{{ cue.text }}</span
                >
              </div>
              <div class="subtitle-text-cell">
                <textarea
                  :value="cue.translation"
                  @input="editCueText(cue, 'translation', $event)"
                  @compositionend="editCueText(cue, 'translation', $event)"
                  @pointerdown="startTextDrag"
                  @dragstart="stopTextDrag"
                  @blur="
                    endGroup();
                    stopTextDrag();
                  "
                  :aria-label="'第 ' + (i + 1) + ' 条译文'"
                  :title="cue.translation || undefined"
                  rows="1"
                  wrap="off"
                  maxlength="500"
                  placeholder="输入译文（可留空）"
                />
                <span
                  v-if="cue.translation"
                  class="subtitle-cell-summary"
                  aria-hidden="true"
                  >{{ cue.translation }}</span
                >
              </div>
              <div class="subtitle-cue-actions">
                <el-button
                  link
                  size="small"
                  :disabled="!resource?.file?.url"
                  @click="seek(cue.start)"
                  >定位</el-button
                >
                <el-button link size="small" type="danger" @click="removeCue(i)"
                  >移除</el-button
                >
              </div>
            </div>
          </div>
        </div>
      </fieldset>
      <div v-if="resource?.file?.url" class="subtitle-preview-area">
        <component
          :is="mediaType === 'video' ? 'video' : 'audio'"
          ref="player"
          :src="toHttps(resource.file.url)"
          controls
          @timeupdate="time = player?.currentTime ?? -1"
          @seeking="time = player?.currentTime ?? -1"
          @ended="time = -1"
          @pause="mediaType === 'audio' && (time = -1)"
        />
        <div class="subtitle-preview-slot">
          <Transition name="subtitle-fade" mode="out-in">
            <div v-if="preview.length" class="subtitle-preview-caption">
              <div
                v-for="(line, i) in preview"
                :key="i"
                :class="{
                  translation: i === 1,
                }"
              >
                {{ line }}
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="subtitle-footer">
        <span
          >修改会同步到使用此{{
            mediaType === "video" ? "视频" : "音频"
          }}的实体</span
        >
        <el-button size="small" round :disabled="busy" @click="close()"
          >关闭</el-button
        >
        <el-button
          size="small"
          round
          :type="dirty ? 'primary' : 'info'"
          :disabled="!dirty || busy || !resource"
          :loading="saving"
          @click="save"
          >保存字幕</el-button
        >
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useTextDragScroll } from "@/composables/useTextDragScroll";
import { useSubtitleHistory } from "@/composables/useSubtitleHistory";
import { getAudio, putAudio, getVideo, putVideo } from "@/api/v1/resources";
import type { ResourceInfo } from "@/api/v1/resources/model";
import { Message, MessageBox } from "@/components/Dialog";
import { toHttps } from "@/utils/helper";
import {
  audioMetadata,
  mergeSubtitleTranslation,
  mergeAdjacentSubtitles,
  parseSubtitleFile,
  readAudioSubtitles,
  readSubtitleSettings,
  subtitleLinesAt,
  validateSubtitles,
  type SubtitleCue,
} from "@/utils/audioSubtitles";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    resourceId: number | null;
    mediaType?: "audio" | "video";
  }>(),
  { mediaType: "audio" }
);
const getResource = (id: string) =>
  props.mediaType === "video" ? getVideo(id) : getAudio(id);
const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "saved", resource: ResourceInfo): void;
}>();
const resource = ref<ResourceInfo | null>(null);
const cues = ref<SubtitleCue[]>([]);
const {
  canUndo: historyCanUndo,
  canRedo: historyCanRedo,
  record,
  reset: resetHistory,
  undo: undoHistory,
  redo: redoHistory,
  endGroup,
  acceptNormalization,
} = useSubtitleHistory(cues);
type PendingTime = {
  cue: SubtitleCue;
  field: "start" | "end";
  input: HTMLInputElement;
  value: string;
};
const pendingTime = shallowRef<PendingTime | null>(null);
const composing = ref(false);
const dialogContent = ref<HTMLElement | null>(null);
const canUndo = computed(
  () => historyCanUndo.value || pendingTime.value !== null
);
const canRedo = computed(
  () => historyCanRedo.value && pendingTime.value === null
);
const settings = ref(readSubtitleSettings(null));
const loading = ref(false),
  saving = ref(false),
  reading = ref(false);
const busy = computed(() => loading.value || saving.value || reading.value);
const { startTextDrag, stopTextDrag } = useTextDragScroll(
  () => props.modelValue && !busy.value
);
const snapshot = ref("");
const signature = () =>
  JSON.stringify({ subtitles: cues.value, subtitleSettings: settings.value });
const dirty = computed(
  () =>
    !!resource.value &&
    (pendingTime.value !== null || signature() !== snapshot.value)
);
const originalSignature = (info: unknown) =>
  JSON.stringify({
    subtitles: readAudioSubtitles(info),
    subtitleSettings: readSubtitleSettings(info),
  });
const player = ref<HTMLMediaElement | null>(null),
  fileInput = ref<HTMLInputElement | null>(null),
  cueList = ref<HTMLElement | null>(null);
const time = ref(-1);
const importTarget = ref("primary");
const preview = computed(() => subtitleLinesAt(cues.value, time.value));
const cueIds = new WeakMap<SubtitleCue, number>();
let nextCueId = 0;
let generation = 0;
watch(
  () => [props.modelValue, props.resourceId, props.mediaType] as const,
  async ([open, id]) => {
    const ticket = ++generation;
    stopTextDrag();
    player.value?.pause();
    time.value = -1;
    resource.value = null;
    pendingTime.value = null;
    composing.value = false;
    cues.value = [];
    resetHistory();
    snapshot.value = "";
    importTarget.value = "primary";
    if (!open || id == null) {
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      const response = await getResource(String(id));
      if (ticket !== generation) return;
      resource.value = response.data;
      cues.value = readAudioSubtitles(response.data.info);
      settings.value = readSubtitleSettings(response.data.info);
      snapshot.value = signature();
      resetHistory();
    } catch (error) {
      if (ticket === generation)
        Message.error(error instanceof Error ? error.message : String(error));
    } finally {
      if (ticket === generation) loading.value = false;
    }
  },
  { immediate: true }
);

async function close(done?: () => void) {
  if (busy.value) return;
  stopTextDrag();
  flushPendingTime();
  if (dirty.value) {
    try {
      await MessageBox.confirm(
        "字幕尚未保存，确定放弃修改并关闭？",
        "未保存的字幕",
        {
          type: "warning",
          confirmButtonText: "放弃修改",
          cancelButtonText: "继续编辑",
        }
      );
    } catch {
      return;
    }
  }
  player.value?.pause();
  if (done) done();
  else emit("update:modelValue", false);
}
function cueKey(cue: SubtitleCue) {
  if (!cueIds.has(cue)) cueIds.set(cue, ++nextCueId);
  return cueIds.get(cue)!;
}
function formatCueTime(value: number | null) {
  return value !== null && Number.isFinite(value) ? value.toFixed(1) : "";
}
function displayCueTime(cue: SubtitleCue, field: "start" | "end") {
  const pending = pendingTime.value;
  return pending?.cue === cue && pending.field === field
    ? pending.value
    : formatCueTime(cue[field]);
}
function queueCueTime(cue: SubtitleCue, field: "start" | "end", event: Event) {
  const input = event.target as HTMLInputElement;
  pendingTime.value =
    input.value === formatCueTime(cue[field])
      ? null
      : { cue, field, input, value: input.value };
}
function flushPendingTime() {
  const pending = pendingTime.value;
  if (pending)
    applyCueTime(pending.cue, pending.field, pending.input, pending.value);
}
function editCueText(
  cue: SubtitleCue,
  field: "text" | "translation",
  event: Event
) {
  cue[field] = (event.target as HTMLTextAreaElement).value;
  if (!composing.value && !(event as InputEvent).isComposing)
    record(`${cueKey(cue)}:${field}`);
}
function restoreHistory(action: () => void) {
  if (busy.value || !props.modelValue || !resource.value) return;
  const active = document.activeElement;
  const row =
    active instanceof HTMLElement ? active.closest(".subtitle-cue") : null;
  const rowIndex = row
    ? Array.from(
        cueList.value?.querySelectorAll(".subtitle-cue") ?? []
      ).indexOf(row)
    : -1;
  const fieldIndex = row
    ? Array.from(row.querySelectorAll("input, textarea")).indexOf(active!)
    : -1;
  const cursor =
    active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      ? active.selectionStart
      : null;
  flushPendingTime();
  endGroup();
  action();
  if (rowIndex >= 0 && fieldIndex >= 0)
    void nextTick(() => {
      const rows = cueList.value?.querySelectorAll(".subtitle-cue");
      const target = rows?.[
        Math.min(rowIndex, rows.length - 1)
      ]?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea"
      )[fieldIndex];
      target?.focus({ preventScroll: true });
      if (target && cursor !== null)
        target.setSelectionRange(
          Math.min(cursor, target.value.length),
          Math.min(cursor, target.value.length)
        );
    });
}
function undo() {
  restoreHistory(undoHistory);
}
function redo() {
  restoreHistory(redoHistory);
}
function handleHistoryKey(event: KeyboardEvent) {
  if (
    !props.modelValue ||
    !resource.value ||
    busy.value ||
    composing.value ||
    event.isComposing ||
    event.altKey ||
    !(event.metaKey || event.ctrlKey)
  )
    return;
  const key = event.key.toLowerCase();
  if (key !== "z" && !(key === "y" && event.ctrlKey && !event.metaKey)) return;
  const dialog = dialogContent.value?.closest(".audio-subtitle-dialog");
  if (!(event.target instanceof Node) || !dialog?.contains(event.target))
    return;
  event.preventDefault();
  event.stopPropagation();
  if (key === "y" || event.shiftKey) redo();
  else undo();
}
function handleNativeHistory(event: Event) {
  const input = event as InputEvent;
  if (busy.value || composing.value || input.isComposing) return;
  if (input.inputType !== "historyUndo" && input.inputType !== "historyRedo")
    return;
  input.preventDefault();
  input.stopPropagation();
  if (input.inputType === "historyUndo") undo();
  else redo();
}
onMounted(() => window.addEventListener("keydown", handleHistoryKey, true));
onBeforeUnmount(() =>
  window.removeEventListener("keydown", handleHistoryKey, true)
);
function editCueTime(cue: SubtitleCue, field: "start" | "end", event: Event) {
  applyCueTime(cue, field, event.target as HTMLInputElement);
}
function applyCueTime(
  cue: SubtitleCue,
  field: "start" | "end",
  input: HTMLInputElement,
  pendingValue = input.value
) {
  pendingTime.value = null;
  const value = pendingValue.trim();
  const number = value === "" ? NaN : Number(value);
  if (field === "end" && value === "") cue.end = null;
  else
    cue[field] = Number.isFinite(number) ? Math.round(number * 10) / 10 : NaN;
  input.value = formatCueTime(cue[field]);
  record();
}
function clearCues() {
  flushPendingTime();
  cues.value = [];
  record();
}
function removeCue(index: number) {
  flushPendingTime();
  cues.value.splice(index, 1);
  record();
}
async function addCue() {
  flushPendingTime();
  const progress = player.value?.currentTime ?? 0;
  const start = Number.isFinite(progress) ? Math.round(progress * 10) / 10 : 0;
  const nextStart = Math.min(
    ...cues.value.filter((cue) => cue.start > start).map((cue) => cue.start)
  );
  const end = Math.min(start + 3, nextStart);
  const position = cues.value.findIndex((cue) => cue.start > start);
  const index = position < 0 ? cues.value.length : position;
  cues.value.splice(index, 0, { start, end, text: "" });
  record();
  await nextTick();
  const row =
    cueList.value?.querySelectorAll<HTMLElement>(".subtitle-cue")[index];
  row
    ?.querySelector<HTMLTextAreaElement>("textarea")
    ?.focus({ preventScroll: true });
  row?.scrollIntoView?.({ block: "nearest" });
}
function seek(start: number) {
  if (player.value && Number.isFinite(start) && start >= 0) {
    player.value.currentTime = start;
    time.value = start;
  }
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !resource.value) return;
  flushPendingTime();
  endGroup();
  const ticket = generation;
  reading.value = true;
  try {
    if (file.size > 512 * 1024) throw new Error("字幕文件不能超过 512 KB");
    const imported = parseSubtitleFile(
      await file.text(),
      Number(audioMetadata(resource.value.info).length)
    );
    if (ticket !== generation) return;
    if (importTarget.value === "secondary") {
      if (!cues.value.length)
        throw new Error("请先添加或导入原文字幕，再导入相同时间轴的译文");
      cues.value = mergeSubtitleTranslation(cues.value, imported);
      record();
    } else {
      if (cues.value.length) {
        try {
          await MessageBox.confirm(
            "导入原文会替换当前字幕和译文，是否继续？",
            "替换字幕",
            { type: "warning" }
          );
        } catch {
          return;
        }
      }
      if (ticket === generation) {
        cues.value = mergeAdjacentSubtitles(imported);
        record();
        if (cues.value.length < imported.length)
          Message.success(
            `已导入 ${cues.value.length} 条字幕，自动合并了 ${imported.length - cues.value.length} 个相邻片段`
          );
      }
    }
  } catch (error) {
    Message.error(error instanceof Error ? error.message : String(error));
  } finally {
    reading.value = false;
  }
}
async function save() {
  flushPendingTime();
  endGroup();
  if (!resource.value || !dirty.value || busy.value) return;
  saving.value = true;
  const ticket = generation;
  try {
    const subtitles = validateSubtitles(cues.value);
    const kind = props.mediaType;
    const resourceId = String(resource.value.id);
    const latest = (
      await (kind === "video" ? getVideo(resourceId) : getAudio(resourceId))
    ).data;
    if (ticket !== generation) return;
    if (originalSignature(latest.info) !== snapshot.value)
      throw new Error(
        "此资源的字幕已在其他页面修改，请关闭后重新打开，避免覆盖"
      );
    const info = JSON.stringify({
      ...audioMetadata(latest.info),
      subtitles,
      subtitleSettings: settings.value,
    });
    await (kind === "video"
      ? putVideo(String(latest.id), { info })
      : putAudio(String(latest.id), { info }));
    if (ticket !== generation) return;
    resource.value = { ...latest, info };
    cues.value = subtitles;
    acceptNormalization();
    snapshot.value = signature();
    emit("saved", resource.value);
    Message.success("字幕已保存");
  } catch (error) {
    Message.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.subtitle-dialog-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.subtitle-dialog-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding-right: 24px;
}
.subtitle-dialog-heading .el-dialog__title {
  flex-shrink: 0;
}
.subtitle-resource-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.subtitle-controls {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.subtitle-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
  flex-shrink: 0;
}
.subtitle-controls select,
.subtitle-controls input,
.subtitle-controls textarea {
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  font: inherit;
  padding: 4px 6px;
  box-sizing: border-box;
}
.subtitle-controls :is(input, textarea, select):focus {
  outline: 1px solid var(--el-color-primary);
  border-color: var(--el-color-primary);
}
.subtitle-action-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.subtitle-redo-icon {
  transform: scaleX(-1);
}
.subtitle-history-action {
  display: inline-flex;
}
.subtitle-import-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-inline-start: auto;
}
.subtitle-formats {
  text-align: right;
  margin-bottom: 8px;
}
.subtitle-top-row :deep(.el-button + .el-button),
.subtitle-cue-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
.subtitle-import-actions select,
.subtitle-formats {
  font-size: 12px;
}
.subtitle-formats {
  color: var(--el-text-color-secondary);
}
.subtitle-table {
  flex: 1;
  min-height: 0;
  --subtitle-columns: 18px 62px 62px minmax(100px, 1fr) minmax(100px, 1fr) 64px;
  overflow-x: auto;
}
.subtitle-column-headers,
.subtitle-cue {
  display: grid;
  grid-template-columns: var(--subtitle-columns);
  align-items: center;
  gap: 6px;
  min-width: 500px;
  padding: 0 2px;
}
.subtitle-column-headers {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--el-fill-color-blank);
  padding-bottom: 2px;
}
.subtitle-cues {
  height: 100%;
  align-content: start;
  overflow-y: auto;
  scrollbar-gutter: stable;
  min-width: 500px;
  display: grid;
  gap: 6px;
}
.subtitle-empty {
  text-align: center;
  padding: 28px 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.subtitle-cue {
  font-size: 12px;
}
.subtitle-cue input,
.subtitle-cue textarea {
  width: 100%;
  min-width: 0;
  height: 30px;
  line-height: 20px;
  resize: none;
}
.subtitle-text-cell {
  position: relative;
  min-width: 0;
  height: 30px;
}
.subtitle-text-cell textarea {
  overflow: hidden;
  scrollbar-width: none;
}
.subtitle-text-cell textarea::-webkit-scrollbar {
  display: none;
}
.subtitle-text-cell textarea:not(:focus) {
  color: transparent;
  caret-color: transparent;
}
.subtitle-text-cell textarea::placeholder {
  color: var(--el-text-color-placeholder);
}
.subtitle-cell-summary {
  position: absolute;
  inset: 1px;
  padding: 4px 6px;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 20px;
}
.subtitle-text-cell:focus-within .subtitle-cell-summary {
  display: none;
}
.subtitle-number {
  color: var(--el-text-color-secondary);
  text-align: center;
}
.subtitle-cue-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
.subtitle-preview-area {
  flex-shrink: 0;
  margin-top: 6px;
}
.subtitle-preview-area audio {
  display: block;
  width: 100%;
  height: 32px;
}
.subtitle-preview-area video {
  display: block;
  width: 100%;
  height: 120px;
  background: #000;
  object-fit: contain;
}
.subtitle-preview-slot {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}
.subtitle-preview-caption {
  white-space: pre-line;
  overflow-wrap: anywhere;
  text-align: center;
  background: #242424;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.35;
  max-width: 100%;
}
.subtitle-preview-caption .translation {
  font-size: 12px;
}
.subtitle-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}
.subtitle-footer span {
  flex: 1;
  text-align: left;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.subtitle-footer :deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>
<style>
.audio-subtitle-dialog {
  padding: 12px;
  max-width: min(calc(100vw - 32px), 112vh);
  aspect-ratio: 4 / 3;
  display: flex;
  flex-direction: column;
}
.audio-subtitle-dialog .el-dialog__header,
.audio-subtitle-dialog .el-dialog__footer {
  flex-shrink: 0;
}
.audio-subtitle-dialog .el-dialog__header {
  padding-bottom: 8px;
}
.audio-subtitle-dialog .el-dialog__footer {
  padding-top: 8px;
}
.audio-subtitle-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  padding-top: 0;
  padding-bottom: 4px;
  overflow: auto;
}
</style>
