import { Directive } from "vue";
import hljs from "highlight.js";
import lua from "highlight.js/lib/languages/lua";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/github.css";
// import "highlight.js/styles/a11y-dark.css";
// import "highlight.js/styles/a11y-light.css";

// 注册 Lua 语言
hljs.registerLanguage("lua", lua);
// 注册 JavaScript 语言
hljs.registerLanguage("javascript", javascript);

const highlightDirective: Directive = {
  beforeMount(el) {
    const blocks = el.querySelectorAll("pre code");
    console.log("blocks", blocks);
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
