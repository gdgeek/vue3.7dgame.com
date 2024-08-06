import { Directive } from "vue";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

const highlightDirective: Directive = {
  beforeMount(el) {
    const blocks = el.querySelectorAll("pre code");
    blocks.forEach((block: HTMLElement) => {
      hljs.highlightElement(block);
    });
  },
  updated(el) {
    const blocks = el.querySelectorAll("pre code");
    blocks.forEach((block: HTMLElement) => {
      hljs.highlightElement(block);
    });
  },
};

export default highlightDirective;
