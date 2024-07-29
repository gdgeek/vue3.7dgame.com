declare module "element-resize-detector" {
  class ElementResizeDetector {
    listenTo(element: HTMLElement, callback: () => void): void;
    removeListener(element: HTMLElement, callback: () => void): void;
  }
  export default ElementResizeDetector;
}
