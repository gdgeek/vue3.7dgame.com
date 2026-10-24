import type { DirectiveBinding, ObjectDirective } from "vue";
import "@/styles/long-press.scss";

type LongPressHandler = (() => void) | undefined;
const bindings = new WeakMap<
  HTMLElement,
  { handler: LongPressHandler; cleanup: () => void }
>();
const ignoredTargets =
  ".card-checkbox, .card-action-group, .col-checkbox, .col-actions, button, a, input, textarea, select, [role='button'], [contenteditable='true']";

function bind(el: HTMLElement, binding: DirectiveBinding<LongPressHandler>) {
  const handler = binding.value;
  if (!handler) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pointer: { id: number; x: number; y: number } | undefined;
  let suppressClick = false;
  let hint: HTMLDivElement | undefined;
  const state = { handler, cleanup: () => {} };

  const hideHint = () => {
    hint?.remove();
    hint = undefined;
  };
  const showHint = (event: PointerEvent) => {
    const text =
      binding.instance?.$t?.("ui.longPressToEdit") || "长按 1 秒直接进入编辑";
    const duration = binding.instance?.$t?.("ui.longPressDuration") || "1 秒";
    hint = document.createElement("div");
    hint.className = "long-press-hint";
    hint.setAttribute("role", "status");
    const index = text.indexOf(duration);
    if (index >= 0) {
      const emphasis = document.createElement("strong");
      emphasis.textContent = duration;
      hint.append(
        text.slice(0, index),
        emphasis,
        text.slice(index + duration.length)
      );
    } else hint.textContent = text;
    document.body.append(hint);
    const { width, height } = hint.getBoundingClientRect();
    hint.style.left = `${Math.max(12, Math.min(event.clientX - width / 2, window.innerWidth - width - 12))}px`;
    hint.style.top = `${Math.max(12, event.clientY - height - 20)}px`;
  };
  const cancel = () => {
    hideHint();
    clearTimeout(timer);
    timer = undefined;
    pointer = undefined;
    window.removeEventListener("scroll", cancel, true);
    window.removeEventListener("blur", cancel);
  };
  const onDown = (event: PointerEvent) => {
    cancel();
    if (event.button !== 0 || event.isPrimary === false) return;
    const control = (event.target as Element).closest(ignoredTargets);
    if (control && control !== el) return;
    suppressClick = false;
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    showHint(event);
    window.addEventListener("scroll", cancel, { capture: true, passive: true });
    window.addEventListener("blur", cancel);
    timer = setTimeout(() => {
      timer = undefined;
      suppressClick = true;
      hideHint();
      state.handler?.();
    }, 1000);
  };
  const onMove = (event: PointerEvent) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (
      Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >= 10
    ) {
      suppressClick = true;
      cancel();
    }
  };
  const onRelease = (event: PointerEvent) => {
    if (event.pointerId === pointer?.id) cancel();
  };
  const onClick = (event: MouseEvent) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const preventNativeGesture = (event: Event) => {
    if (pointer || suppressClick) event.preventDefault();
  };

  el.classList.add("supports-long-press");
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onRelease);
  el.addEventListener("pointercancel", onRelease);
  el.addEventListener("pointerleave", onRelease);
  el.addEventListener("click", onClick, true);
  el.addEventListener("contextmenu", preventNativeGesture);
  el.addEventListener("dragstart", preventNativeGesture);
  state.cleanup = () => {
    cancel();
    el.classList.remove("supports-long-press");
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onRelease);
    el.removeEventListener("pointercancel", onRelease);
    el.removeEventListener("pointerleave", onRelease);
    el.removeEventListener("click", onClick, true);
    el.removeEventListener("contextmenu", preventNativeGesture);
    el.removeEventListener("dragstart", preventNativeGesture);
    bindings.delete(el);
  };
  bindings.set(el, state);
}

export const vLongPress: ObjectDirective<HTMLElement, LongPressHandler> = {
  mounted(el, binding) {
    bind(el, binding);
  },
  updated(el, binding) {
    const state = bindings.get(el);
    if (!binding.value) state?.cleanup();
    else if (state) state.handler = binding.value;
    else bind(el, binding);
  },
  beforeUnmount(el) {
    bindings.get(el)?.cleanup();
  },
};
