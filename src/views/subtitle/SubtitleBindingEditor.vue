<template>
  <section
    class="subtitle-binding"
    aria-label="字幕绑定"
    :aria-busy="busy || (editing && listBusy)"
  >
    <input ref="fileInput" type="file" accept=".srt" hidden @change="upload" />
    <div class="binding-head">
      <div class="binding-summary">
        <span class="caption-icon" aria-hidden="true">
          <FontAwesomeIcon :icon="faClosedCaptioning"></FontAwesomeIcon>
        </span>
        <div class="binding-title">
          <h3>{{ editing ? "选择字幕资源" : "字幕" }}</h3>
          <p role="status">
            <template v-if="current">已绑定 · {{ current.name }}</template>
            <template v-else-if="current === null && !editing"
              >未绑定字幕</template
            >
            <template v-else-if="current === undefined && busy"
              >正在读取绑定…</template
            >
          </p>
        </div>
      </div>
      <div v-if="current !== undefined" class="head-actions">
        <button
          v-if="!editing"
          ref="chooseButton"
          type="button"
          class="control secondary"
          :disabled="busy"
          @click="choose"
        >
          {{ current ? "更换字幕" : "选择已有字幕" }}
        </button>
        <button
          type="button"
          class="control"
          :class="editing || current ? 'secondary' : 'primary'"
          :disabled="busy"
          @click="fileInput?.click()"
        >
          <FontAwesomeIcon :icon="faUpload"></FontAwesomeIcon>
          {{ uploading ? "正在上传…" : current ? "上传并更换" : "上传并绑定" }}
        </button>
        <button
          v-if="current && !editing"
          type="button"
          class="control quiet"
          :disabled="busy"
          @click="save(null)"
        >
          解除绑定
        </button>
      </div>
      <button
        v-else-if="!busy"
        type="button"
        class="control secondary"
        @click="loadBinding"
      >
        重新读取绑定
      </button>
    </div>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <div v-if="editing" class="picker">
      <label class="search-box">
        <FontAwesomeIcon :icon="faMagnifyingGlass"></FontAwesomeIcon>
        <input
          ref="searchInput"
          v-model="search"
          type="search"
          maxlength="255"
          :disabled="busy"
          placeholder="搜索字幕名称"
          aria-label="搜索字幕名称"
        />
      </label>
      <fieldset
        v-if="assets.length"
        ref="choices"
        class="asset-list"
        :disabled="busy || listBusy"
        aria-label="选择字幕资源"
      >
        <label
          v-for="asset in assets"
          :key="asset.id"
          class="asset-row"
          :class="{ selected: selected?.id === asset.id }"
        >
          <input
            :checked="selected?.id === asset.id"
            @change="selected = asset"
            type="radio"
            :name="'subtitle-choice-' + mediaId"
            :value="asset.id"
            :aria-label="asset.name"
          />
          <span class="asset-name" :title="asset.name">{{ asset.name }}</span>
          <span v-if="asset.info" class="asset-meta"
            >{{ asset.info.cueCount }} 条 ·
            {{ duration(asset.info.durationMs) }}</span
          >
        </label>
      </fieldset>
      <p v-else-if="listBusy" class="feedback">正在加载字幕…</p>
      <p v-else-if="total === 0" class="feedback">
        {{
          term
            ? "没有找到匹配的字幕，请换个关键词。"
            : "素材库里还没有字幕，可以上传 SRT 文件并直接绑定。"
        }}
      </p>
      <p
        v-if="
          selected &&
          selected.id !== current?.id &&
          !assets.some((asset) => asset.id === selected?.id)
        "
        class="feedback"
        role="status"
      >
        已选 · {{ selected.name }}
      </p>
      <div class="picker-footer">
        <button
          v-if="failedPage !== null"
          type="button"
          class="control quiet more"
          :disabled="busy"
          @click="loadPage(failedPage)"
        >
          重试第 {{ failedPage }} 页
        </button>
        <nav v-else-if="pageCount > 1" class="pages" aria-label="字幕分页">
          <button
            type="button"
            class="page-step"
            aria-label="上一页"
            title="上一页"
            :disabled="busy || listBusy || page <= 1"
            @click="loadPage(page - 1)"
          >
            <FontAwesomeIcon :icon="faChevronLeft"></FontAwesomeIcon>
          </button>
          <span aria-live="polite">第 {{ page }} / {{ pageCount }} 页</span>
          <button
            type="button"
            class="page-step"
            aria-label="下一页"
            title="下一页"
            :disabled="busy || listBusy || page >= pageCount"
            @click="loadPage(page + 1)"
          >
            <FontAwesomeIcon :icon="faChevronRight"></FontAwesomeIcon>
          </button>
        </nav>
        <button
          type="button"
          class="control quiet"
          :disabled="busy"
          @click="cancel"
        >
          取消
        </button>
        <button
          v-if="assets.length || selected"
          type="button"
          class="control primary"
          :disabled="
            busy || listBusy || !selected || selected.id === current?.id
          "
          @click="selected && save(selected.id)"
        >
          保存绑定
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faClosedCaptioning,
  faMagnifyingGlass,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { isAxiosError } from "axios";
import request from "@/utils/request";
import { readSrtFile } from "./readSrtFile";
import { uploadSubtitle } from "./uploadSubtitle";

type Asset = { id: number; name: string };
type Binding = { subtitle: Asset | null };
const props = defineProps<{ mediaId: number }>();
const endpoint = `/v1/resources/${props.mediaId}/subtitle`;
const controller = new AbortController();
const options = {
  skipErrorMessage: true,
  signal: controller.signal,
};
onBeforeUnmount(() => controller.abort());

const current = ref<Asset | null>();
const selected = ref<Asset | null>(null);
type LibraryAsset = Asset & { info?: { cueCount: number; durationMs: number } };
const assets = ref<LibraryAsset[]>([]);
const chooseButton = ref<HTMLButtonElement>();
const choices = ref<HTMLFieldSetElement>();
const searchInput = ref<HTMLInputElement>();
const search = ref("");
const term = computed(() => search.value.trim());
const listBusy = ref(false);
let listGeneration = 0;
const editing = ref(false);
const busy = ref(false);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement>();
const error = ref("");
const page = ref(0);
const total = ref<number>();
const pageSize = 20;
const pageCount = computed(() => Math.ceil((total.value ?? 0) / pageSize));
const failedPage = ref<number | null>(null);

function message(e: unknown) {
  if (isAxiosError(e) && e.response?.status === 403)
    return "当前账号没有字幕资源权限。";
  if (isAxiosError(e) && e.response?.status === 404)
    return "素材已不存在或无权访问。";
  if (isAxiosError(e) && e.response?.status === 422 && e.response.data?.message)
    return String(e.response.data.message);
  return "请求未完成，请重试。";
}

async function loadBinding() {
  busy.value = true;
  error.value = "";
  try {
    const { data } = await request.get<Binding>(endpoint, options);
    current.value = data.subtitle;
  } catch (e) {
    current.value = undefined;
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
onMounted(loadBinding);

async function loadPage(requested: number) {
  const generation = ++listGeneration;
  listBusy.value = true;
  error.value = "";
  failedPage.value = null;
  let target = requested;
  try {
    for (;;) {
      const { data } = await request.get<{
        items: LibraryAsset[];
        total: number;
      }>("/v1/subtitles", {
        ...options,
        params: { page: target, search: term.value || undefined },
      });
      if (generation !== listGeneration) return;
      const last = Math.max(1, Math.ceil(data.total / pageSize));
      if (target > last) {
        target = last;
        continue;
      }
      assets.value = data.items;
      total.value = data.total;
      page.value = target;
      if (choices.value) choices.value.scrollTop = 0;
      break;
    }
  } catch (e) {
    if (generation !== listGeneration) return;
    failedPage.value = target;
    error.value = message(e);
  } finally {
    if (generation === listGeneration) listBusy.value = false;
  }
}

function duration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${pad(minutes % 60)}:${pad(seconds % 60)}`
    : `${minutes}:${pad(seconds % 60)}`;
}

watch([editing, term], ([open, keyword], [wasOpen], onCleanup) => {
  if (!open) return;
  assets.value = [];
  page.value = 0;
  total.value = undefined;
  failedPage.value = null;
  error.value = "";
  listBusy.value = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    clearTimeout(timer);
    ++listGeneration;
    listBusy.value = false;
  });
  if (wasOpen && keyword) timer = setTimeout(() => void loadPage(1), 250);
  else void loadPage(1);
});

function choose() {
  search.value = "";
  selected.value = current.value ?? null;
  editing.value = true;
  void nextTick(() => searchInput.value?.focus({ preventScroll: true }));
}

function focusChoiceButton() {
  void nextTick(() => chooseButton.value?.focus({ preventScroll: true }));
}

function cancel() {
  focusChoiceButton();
  editing.value = false;
  error.value = "";
}

async function writeError(e: unknown) {
  if (isAxiosError(e) && e.response?.status === 409) {
    editing.value = false;
    await loadBinding();
    if (!error.value)
      error.value = "其他窗口已更改绑定，请确认最新字幕后再操作。";
  } else {
    error.value = message(e);
  }
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || busy.value || current.value === undefined) return;
  busy.value = uploading.value = true;
  error.value = "";
  try {
    const { name, srt } = await readSrtFile(file);
    const body = await uploadSubtitle(name, srt);
    const { data } = await request.post<Binding>(
      endpoint,
      { ...body, previousSubtitleResourceId: current.value?.id ?? null },
      options
    );
    current.value = data.subtitle;
    editing.value = false;
    focusChoiceButton();
  } catch (e) {
    if (!isAxiosError(e) && e instanceof Error) error.value = e.message;
    else await writeError(e);
  } finally {
    busy.value = uploading.value = false;
  }
}

async function save(target: number | null) {
  busy.value = true;
  error.value = "";
  try {
    const { data } = await request.put<Binding>(
      endpoint,
      {
        subtitleResourceId: target,
        previousSubtitleResourceId: current.value?.id ?? null,
      },
      options
    );
    current.value = data.subtitle;
    editing.value = false;
    focusChoiceButton();
  } catch (e) {
    await writeError(e);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.subtitle-binding {
  --accent: var(--primary-color, #0079ae);
  --action-bg: color-mix(in srgb, var(--accent) 62%, #123148);
  --surface: var(--bg-card, #fff);
  --ink: var(--text-primary, #1e293b);
  --muted: var(--text-secondary, #526477);
  --line: var(--border-color, #dbe3eb);
  --tint: color-mix(in srgb, var(--accent) 8%, var(--surface));
  container-type: inline-size;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--ink);
  background: var(--surface);
  text-align: start;
}
.binding-head,
.binding-summary,
.head-actions,
.picker-footer {
  display: flex;
  align-items: center;
}
.binding-head {
  gap: 12px 24px;
  justify-content: space-between;
}
.binding-summary {
  min-width: 0;
  gap: 10px;
}
.caption-icon {
  display: grid;
  flex: none;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  background: var(--tint);
  color: color-mix(in srgb, var(--accent) 50%, var(--ink));
  font-size: 20px;
}
.binding-title {
  min-width: 0;
}
.binding-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}
.binding-title p,
.feedback {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.binding-title p:empty {
  display: none;
}
.head-actions,
.picker-footer {
  flex-wrap: wrap;
  gap: 8px;
}
.head-actions {
  flex-shrink: 0;
}
.control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  padding: 5px 12px;
  border: 1px solid transparent;
  border-radius: 7px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
}
.control.primary {
  background: var(--action-bg);
  color: white;
}
.control.primary:hover:enabled {
  filter: brightness(0.9);
}
.control.secondary {
  background: var(--surface);
  border-color: var(--line);
  color: var(--ink);
}
.control.quiet {
  background: transparent;
  color: var(--muted);
  font-weight: 500;
}
.control.secondary:hover:enabled,
.control.quiet:hover:enabled {
  background: var(--bg-hover, #eef3f8);
  color: var(--ink);
}
.control:disabled {
  opacity: 0.55;
  cursor: default;
}
.control:focus-visible,
.asset-row:has(:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.picker {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  color: var(--muted);
  font-size: 13px;
}
.search-box:focus-within {
  border-color: var(--action-bg);
  outline: 1px solid var(--action-bg);
}
.search-box input {
  flex: 1;
  min-width: 0;
  min-height: 34px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
}
.asset-list {
  display: grid;
  gap: 4px;
  min-inline-size: 0;
  max-height: 184px;
  padding: 4px;
  margin: -4px;
  overflow: auto;
  border: 0;
}
.asset-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 38px;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  font-size: 14px;
  cursor: pointer;
}
.asset-row:hover,
.asset-row.selected {
  background: var(--tint);
}
.asset-row.selected {
  border-color: color-mix(in srgb, var(--accent) 60%, var(--line));
}
.asset-row input {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--action-bg);
}
.asset-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.asset-meta {
  flex: none;
  margin-left: auto;
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.picker-footer {
  margin-top: 12px;
  justify-content: flex-end;
}
.pages {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.page-step {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}
.page-step:hover:enabled {
  background: var(--tint);
}
.page-step:disabled {
  opacity: 0.4;
  cursor: default;
}
.page-step:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.pages,
.more {
  margin-right: auto;
}
.error {
  margin-top: 10px;
  color: var(--danger-color, #b13636);
}

@container (max-width: 490px) {
  .binding-head {
    flex-wrap: wrap;
  }
  .head-actions {
    flex: 1 1 100%;
  }
  .control {
    min-height: 38px;
  }
}
@container (max-width: 300px) {
  .pages {
    flex-basis: 100%;
  }
  .asset-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    row-gap: 2px;
  }
  .asset-meta {
    grid-column: 2;
    margin-left: 0;
  }
}
</style>
