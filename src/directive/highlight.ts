// src/directives/highlight.ts
import { Directive } from "vue";
import hljs from "highlight.js";
import "highlight.js/styles/github.css"; // 或其他样式

const highlightDirective: Directive = {
  beforeMount(el) {
    const blocks = el.querySelectorAll("pre code");
    blocks.forEach((block: HTMLElement) => {
      hljs.highlightBlock(block);
    });
  },
  updated(el) {
    const blocks = el.querySelectorAll("pre code");
    blocks.forEach((block: HTMLElement) => {
      hljs.highlightBlock(block);
    });
  },
};

export default highlightDirective;
