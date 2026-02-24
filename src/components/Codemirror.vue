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
// @ts-nocheck
// @ts-nocheck
import { shallowRef } from "vue";
import { Codemirror } from "vue-codemirror";
import { json } from "@codemirror/lang-json";

// Codemirror 扩展
const extensions = [json()];

// Codemirror EditorView 实例
const view = shallowRef<any>(null);

// 编辑器就绪回调
function handleReady(payload: { view: EditorView }) {
  view.value = payload.view;
}

// 事件日志
function log(event: string, eventObj: unknown) {
  console.log(event, eventObj);
}
</script>
