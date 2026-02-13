import { createVNode, render, shallowReactive } from "vue";
import MessageConstructor from "./Message.vue";

export type MessageType = "success" | "warning" | "info" | "error";

export interface MessageOptions {
  message: string;
  type?: MessageType;
  duration?: number;
  showClose?: boolean;
  offset?: number;
  zIndex?: number;
  onClose?: () => void;
}

const instances = shallowReactive<any[]>([]);
let seed = 1;
const zIndexStart = 2000;

const Message = (options: MessageOptions | string) => {
  if (typeof options === "string") {
    options = { message: options };
  }

  const id = `message_${seed++}`;
  const userOnClose = options.onClose;

  // Container for render
  const container = document.createElement("div");

  // Calculate vertical offset
  let verticalOffset = options.offset || 20;
  instances.forEach((inst) => {
    verticalOffset += (inst.el?.offsetHeight || 48) + 16;
  });

  const props = {
    ...options,
    id,
    zIndex: zIndexStart + seed,
    offset: verticalOffset, // Initial offset
    onClose: () => {
      close(id, userOnClose);
    },
    onDestroy: () => {
      render(null, container);
      // Remove container from DOM if it was appended (depends on implementation)
    },
  };

  const vnode = createVNode(MessageConstructor, props);
  vnode.appContext = Message._context || null;

  // Render to container (this creates DOM nodes in container)
  render(vnode, container);

  // Append the component's root element to body
  // vnode.el is the DOM element of the component
  if (vnode.el) {
    document.body.appendChild(vnode.el as Node);
  }

  const instance = {
    id,
    vnode,
    vm: vnode.component,
    el: vnode.el,
    props,
  };

  instances.push(instance);

  return {
    close: () => close(id, userOnClose),
  };
};

function close(id: string, userOnClose?: () => void) {
  const idx = instances.findIndex((inst) => inst.id === id);
  if (idx === -1) return;

  const instance = instances[idx];
  if (!instance) return;

  if (userOnClose) userOnClose();

  // Call component close to trigger transition
  instance.vm?.exposed?.close();

  // Remove from instances array
  instances.splice(idx, 1);

  // Note: We are not implementing dynamic position updates (slide up) for this iteration
  // to avoid complexity with Vue 3's non-reactive props in manual creation.
  // The messages will simply disappear, which is acceptable for a first version.
}

Message.success = (msg: string | MessageOptions) => {
  const opts =
    typeof msg === "string"
      ? { message: msg, type: "success" }
      : { ...msg, type: "success" };
  return Message(opts as MessageOptions);
};

Message.warning = (msg: string | MessageOptions) => {
  const opts =
    typeof msg === "string"
      ? { message: msg, type: "warning" }
      : { ...msg, type: "warning" };
  return Message(opts as MessageOptions);
};

Message.info = (msg: string | MessageOptions) => {
  const opts =
    typeof msg === "string"
      ? { message: msg, type: "info" }
      : { ...msg, type: "info" };
  return Message(opts as MessageOptions);
};

Message.error = (msg: string | MessageOptions) => {
  const opts =
    typeof msg === "string"
      ? { message: msg, type: "error" }
      : { ...msg, type: "error" };
  return Message(opts as MessageOptions);
};

Message._context = null;

export default Message;
