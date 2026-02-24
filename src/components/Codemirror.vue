<template>
  <codemirror
    placeholder="Code goes here..."
    :style="{ width: '100%', height: '100%' }"
    :autofocus="true"
    :indent-with-tab="true"
    :tab-size="2"
    :extensions="extensions"
    @ready="handleReady"
    @change="log('change', $event)"
    @focus="log('focus', $event)"
    @blur="log('blur', $event)"
  ></codemirror>
</template>
<script setup lang="ts">
import { logger } from "@/utils/logger";
import { shallowRef } from "vue";
import { Codemirror } from "vue-codemirror";
import { json } from "@codemirror/lang-json";
import type { EditorView } from "@codemirror/view";

// Codemirror 扩展
const extensions = [json()];

// Codemirror EditorView 实例
const view = shallowRef<InstanceType<typeof EditorView> | null>(null);

// 编辑器就绪回调
function handleReady(payload: { view: InstanceType<typeof EditorView> }) {
  view.value = payload.view;
}

// 事件日志
function log(event: string, eventObj: unknown) {
  logger.log(event, eventObj);
}
</script>
