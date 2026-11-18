<template>
  <section class="subtitle-library">
    <header>
      <h1>{{ $t("sidebar.subtitle") }}</h1>
      <el-button type="primary" @click="openUpload">上传字幕</el-button>
    </header>
    <el-alert
      v-if="listError"
      type="error"
      :closable="false"
      :title="listError"
    >
      <el-button link @click="load">重试</el-button>
    </el-alert>
    <el-table :data="items" v-loading="loading" empty-text="还没有字幕资源">
      <el-table-column
        prop="name"
        label="素材名称"
        min-width="160"
      ></el-table-column>
      <el-table-column
        prop="info.cueCount"
        label="条数"
        width="80"
      ></el-table-column>
      <el-table-column label="结束时间" min-width="122">
        <template #default="{ row }">{{
          timecode(row.info?.durationMs)
        }}</template>
      </el-table-column>
      <el-table-column label="操作" width="130">
        <template #default="{ row }">
          <div class="subtitle-actions">
            <button type="button" @click="openAsset(row.id, 'preview')">
              预览
            </button>
            <button type="button" @click="openAsset(row.id, 'edit')">
              编辑
            </button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="total > 20"
      layout="prev, pager, next"
      :page-size="20"
      :total="total"
      v-model:current-page="page"
    ></el-pagination>

    <el-dialog
      v-model="open"
      :title="title"
      :width="mode === 'edit' ? 'min(860px, 94vw)' : 'min(680px, 92vw)'"
      :top="mode === 'edit' ? '5vh' : undefined"
      destroy-on-close
      :close-on-click-modal="false"
      :before-close="beforeClose"
    >
      <el-alert
        v-if="error"
        type="error"
        :closable="false"
        :title="error"
      ></el-alert>
      <div v-loading="busy" class="dialog-body" :aria-busy="busy" :inert="busy">
        <template v-if="mode === 'upload'">
          <label
            >选择 SRT 文件
            <input
              type="file"
              accept=".srt"
              :disabled="busy"
              @change="chooseFile"
          /></label>
          <small>UTF-8 编码，最多 1 MiB 或 10,000 条字幕。</small>
        </template>
        <template v-if="mode === 'upload' || (mode === 'edit' && detail)">
          <label
            >素材名称
            <el-input v-model="name" maxlength="255" :disabled="busy"></el-input
          ></label>
          <SubeditPanel
            v-if="mode === 'edit' && detail"
            :key="detail.fileId"
            ref="cueEditor"
            :initial-srt="initialSrt"
          ></SubeditPanel>
          <label v-else-if="srt || hasFile"
            >SRT 正文
            <el-input
              v-model="srt"
              type="textarea"
              :rows="12"
              :disabled="busy"
            ></el-input>
          </label>
        </template>
        <template v-if="mode === 'preview' && detail">
          <div class="screen" aria-live="polite">
            {{ activeText || "此时没有字幕" }}
          </div>
          <label
            >预览时间　{{ timecode(position) }}
            <input
              type="range"
              v-model.number="position"
              :max="detail.info.durationMs"
              min="0"
              step="1"
            />
          </label>
          <ol class="cue-list" :start="cueOffset + 1">
            <li v-for="(cue, index) in visibleCues" :key="cueOffset + index">
              <button
                type="button"
                @click="position = cue.startMs"
                :aria-label="'跳到第 ' + (cueOffset + index + 1) + ' 条字幕'"
              >
                {{ timecode(cue.startMs) }} → {{ timecode(cue.endMs) }}
              </button>
              <p>{{ cue.text }}</p>
            </li>
          </ol>
          <el-pagination
            v-if="detail.cues.length > cuePageSize"
            layout="prev, pager, next"
            :page-size="cuePageSize"
            :total="detail.cues.length"
            v-model:current-page="cuePage"
          ></el-pagination>
        </template>
      </div>
      <template #footer>
        <el-button v-if="detail" :disabled="busy" @click="exportSrt">
          {{ mode === "edit" ? "导出已保存的 SRT" : "导出 SRT" }}
        </el-button>
        <el-button :disabled="busy" @click="beforeClose(() => (open = false))"
          >关闭</el-button
        >
        <el-button
          v-if="mode === 'preview' && detail"
          type="primary"
          @click="editDetail"
          >编辑字幕</el-button
        >
        <el-button
          v-else-if="mode !== 'preview'"
          type="primary"
          :loading="busy"
          :disabled="
            !name.trim() || (mode === 'edit' ? !cueEditor : !srt.trim())
          "
          @click="save"
          >保存</el-button
        >
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { isAxiosError } from "axios";
import request from "@/utils/request";
import SubeditPanel from "./SubeditPanel.vue";
import { readSrtFile } from "./readSrtFile";
import { uploadSubtitle } from "./uploadSubtitle";

interface Cue {
  startMs: number;
  endMs: number;
  text: string;
}
interface Asset {
  id: number;
  fileId: number;
  name: string;
  info: { cueCount: number; durationMs: number };
}
interface Detail extends Asset {
  cues: Cue[];
}
type Mode = "preview" | "edit" | "upload";

const options = { skipErrorMessage: true };
const items = ref<Asset[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const listError = ref("");
const open = ref(false);
const mode = ref<Mode>("preview");
const busy = ref(false);
const error = ref("");
const detail = ref<Detail>();
const name = ref("");
const srt = ref("");
const initialName = ref("");
const initialSrt = ref("");
const cueEditor = ref<InstanceType<typeof SubeditPanel>>();
const hasFile = ref(false);
const position = ref(0);
const cuePage = ref(1);
const cuePageSize = 40;
const cueOffset = computed(() => (cuePage.value - 1) * cuePageSize);
const visibleCues = computed(() =>
  detail.value?.cues.slice(cueOffset.value, cueOffset.value + cuePageSize)
);
const activeText = computed(() =>
  detail.value?.cues
    .filter(
      (cue) => cue.startMs <= position.value && position.value < cue.endMs
    )
    .map((cue) => cue.text)
    .join("\n")
);
const title = computed(() =>
  mode.value === "upload"
    ? "上传字幕"
    : (mode.value === "edit" ? "编辑字幕" : "预览字幕") +
      (detail.value ? " · " + detail.value.name : "")
);

function timecode(ms: number) {
  if (!Number.isSafeInteger(ms) || ms < 0) return "—";
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return (
    pad(Math.floor(ms / 3600000)) +
    ":" +
    pad(Math.floor(ms / 60000) % 60) +
    ":" +
    pad(Math.floor(ms / 1000) % 60) +
    "," +
    pad(ms % 1000, 3)
  );
}

function reason(e: unknown) {
  if (isAxiosError(e) && e.response?.status === 403)
    return "当前会话无法管理字幕资源。";
  if (
    isAxiosError(e) &&
    e.response?.status &&
    e.response.status < 500 &&
    e.response.data?.message
  )
    return String(e.response.data.message);
  return "请求未完成，请重试。";
}

let listRequest = 0;
async function load() {
  const ticket = ++listRequest;
  loading.value = true;
  listError.value = "";
  try {
    const { data } = await request.get<{ items: Asset[]; total: number }>(
      "/v1/subtitles",
      { ...options, params: { page: page.value } }
    );
    if (ticket === listRequest) {
      items.value = data.items;
      total.value = data.total;
    }
  } catch (e) {
    if (ticket === listRequest) listError.value = reason(e);
  } finally {
    if (ticket === listRequest) loading.value = false;
  }
}
watch(page, load, { immediate: true });

function reset(next: Mode) {
  mode.value = next;
  detail.value = undefined;
  name.value = initialName.value = "";
  srt.value = initialSrt.value = "";
  hasFile.value = false;
  error.value = "";
  position.value = 0;
  cuePage.value = 1;
  open.value = true;
}
function openUpload() {
  reset("upload");
}

function formatSrt(cues: Cue[]) {
  return cues
    .map((cue, i) =>
      [
        i + 1,
        timecode(cue.startMs) + " --> " + timecode(cue.endMs),
        cue.text,
      ].join("\n")
    )
    .join("\n\n");
}

function exportSrt() {
  const asset = detail.value;
  if (!asset) return;
  const blob = new Blob([formatSrt(asset.cues)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = asset.name.replace(/\.srt$/i, "") + ".srt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function editDetail() {
  if (!detail.value) return;
  mode.value = "edit";
  name.value = initialName.value = detail.value.name;
  srt.value = initialSrt.value = formatSrt(detail.value.cues);
}

async function openAsset(id: number, next: "preview" | "edit") {
  reset(next);
  busy.value = true;
  try {
    const { data } = await request.get<Detail>("/v1/subtitles/" + id, options);
    detail.value = data;
    position.value = data.cues[0]?.startMs ?? 0;
    if (next === "edit") editDetail();
  } catch (e) {
    error.value = reason(e);
  } finally {
    busy.value = false;
  }
}

async function chooseFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  srt.value = "";
  hasFile.value = false;
  error.value = "";
  busy.value = true;
  try {
    const parsed = await readSrtFile(file);
    srt.value = parsed.srt;
    name.value = parsed.name;
    hasFile.value = true;
    if (!srt.value.trim()) error.value = "文件为空，请填写字幕正文。";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "无法读取字幕文件。";
  } finally {
    busy.value = false;
  }
}

async function beforeClose(done: () => void) {
  if (busy.value) return;
  if (
    mode.value !== "preview" &&
    (name.value !== initialName.value ||
      srt.value !== initialSrt.value ||
      cueEditor.value?.hasChanges())
  ) {
    try {
      await ElMessageBox.confirm("放弃尚未保存的字幕修改？", "关闭编辑");
    } catch {
      return;
    }
  }
  done();
}

async function save() {
  if (busy.value) return;
  const content =
    mode.value === "edit" ? cueEditor.value?.getText() : srt.value;
  if (mode.value === "edit" && !cueEditor.value?.reportValidity()) return;
  if (!content?.trim()) {
    error.value = "请至少保留一条字幕。";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    const body = await uploadSubtitle(name.value.trim(), content);
    const existing = detail.value;
    const { data } = existing
      ? await request.put<Detail>(
          "/v1/subtitles/" + existing.id,
          { ...body, fileId: existing.fileId },
          options
        )
      : await request.post<Detail>("/v1/subtitles", body, options);
    detail.value = data;
    mode.value = "preview";
    position.value = data.cues[0]?.startMs ?? 0;
    cuePage.value = 1;
    ElMessage.success("字幕已保存");
    if (!existing && page.value !== 1) page.value = 1;
    else await load();
  } catch (e) {
    error.value = reason(e);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.subtitle-library {
  padding: 20px;
  max-width: 1100px;
  margin: auto;
}
.subtitle-actions {
  display: flex;
  gap: 6px;
}
.subtitle-actions button {
  padding: 2px 8px;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 6px;
  background: var(--bg-card, #fff);
  color: var(--text-primary, #1e293b);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}
.subtitle-actions button:hover {
  background: var(--bg-hover, #f1f5f9);
  border-color: currentColor;
}
.subtitle-actions button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 1px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
h1 {
  font-size: 1.3rem;
  margin: 0;
}
.dialog-body,
label {
  display: grid;
  gap: 8px;
}
.dialog-body {
  gap: 14px;
  margin-top: 8px;
}
.screen {
  min-height: 90px;
  background: #18212b;
  color: white;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.cue-list {
  max-height: 30vh;
  overflow: auto;
  padding-left: 3em;
  margin: 0;
}
.cue-list button {
  font: inherit;
  color: var(--el-color-primary);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.cue-list p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 2px 0 10px;
}
input[type="range"] {
  width: 100%;
}
</style>
