import { onBeforeUnmount } from "vue";

/** Preserve native text selection while revealing clipped text near either edge. */
export function useTextDragScroll(enabled: () => boolean) {
  let drag: {
    element: HTMLTextAreaElement;
    pointerId: number;
    originX: number;
    originY: number;
    x: number;
    moved: boolean;
  } | null = null;
  let frame: number | null = null;
  let previousTime = 0;

  function stopTextDrag() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    drag = null;
    previousTime = 0;
    document.removeEventListener("pointermove", move, true);
    document.removeEventListener("pointerup", release, true);
    document.removeEventListener("pointercancel", release, true);
    window.removeEventListener("blur", stopTextDrag);
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!(event.buttons & 1)) {
      stopTextDrag();
      return;
    }
    drag.x = event.clientX;
    drag.moved ||=
      Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) >
      3;
  }
  function release(event: PointerEvent) {
    if (event.pointerId === drag?.pointerId) stopTextDrag();
  }
  function tick(time: number) {
    frame = null;
    if (
      !drag ||
      !enabled() ||
      !drag.element.isConnected ||
      document.activeElement !== drag.element
    ) {
      stopTextDrag();
      return;
    }
    const elapsed = previousTime
      ? Math.min(time - previousTime, 32) / 16.67
      : 1;
    previousTime = time;
    if (drag.moved) {
      const rect = drag.element.getBoundingClientRect();
      const edge = Math.min(24, rect.width / 4);
      const distance =
        drag.x < rect.left + edge
          ? drag.x - rect.left - edge
          : drag.x > rect.right - edge
            ? drag.x - rect.right + edge
            : 0;
      if (distance !== 0) {
        const speed =
          Math.sign(distance) *
          Math.min(18, Math.max(1, Math.abs(distance) / 2));
        const maximum = Math.max(
          0,
          drag.element.scrollWidth - drag.element.clientWidth
        );
        drag.element.scrollLeft = Math.max(
          0,
          Math.min(maximum, drag.element.scrollLeft + speed * elapsed)
        );
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function startTextDrag(event: PointerEvent) {
    stopTextDrag();
    if (
      !enabled() ||
      event.button !== 0 ||
      !["mouse", "pen"].includes(event.pointerType) ||
      !(event.currentTarget instanceof HTMLTextAreaElement)
    )
      return;
    drag = {
      element: event.currentTarget,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      x: event.clientX,
      moved: false,
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
    window.addEventListener("blur", stopTextDrag);
    frame = requestAnimationFrame(tick);
  }
  onBeforeUnmount(stopTextDrag);
  return { startTextDrag, stopTextDrag };
}
