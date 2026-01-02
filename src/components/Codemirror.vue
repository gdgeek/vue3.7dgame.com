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
import { ref, shallowRef } from "vue";
import { linter } from "@codemirror/lint";
import { Codemirror } from "vue-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

// Codemirror 扩展
const extensions = [json()];

// Codemirror EditorView 实例
const view = shallowRef<any>(null);

// 编辑器就绪回调
function handleReady(payload: { view: any }) {
  view.value = payload.view;
}

// 事件日志
function log(event: string, eventObj: any) {
  console.log(event, eventObj);
}
</script>
