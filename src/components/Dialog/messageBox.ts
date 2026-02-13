import { createVNode, render } from "vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import InputDialog from "./InputDialog.vue";

interface ConfirmOptions {
  title?: string;
  type?: "warning" | "danger" | "info" | "success";
  confirmButtonText?: string;
  cancelButtonText?: string;
  description?: string;
}

interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
  label?: string;
  inputValidator?: (value: string) => boolean | string;
}

const MessageBox = {
  confirm: (
    message: string,
    titleOrOptions?: string | ConfirmOptions,
    options?: ConfirmOptions
  ) => {
    let title = "确认";
    let opts: ConfirmOptions = {};

    if (typeof titleOrOptions === "string") {
      title = titleOrOptions;
      if (options) opts = options;
    } else if (typeof titleOrOptions === "object") {
      opts = titleOrOptions;
      if (opts.title) title = opts.title;
    }

    return new Promise<void>((resolve, reject) => {
      const container = document.createElement("div");

      const props = {
        modelValue: true,
        message,
        title,
        ...opts,
        "onUpdate:modelValue": (val: boolean) => {
          if (!val) {
            // Delay unmount to allow animation if needed, but for now strict close
            handleClose();
            reject("cancel");
          }
        },
        onConfirm: () => {
          handleClose();
          render(null, container);
          resolve();
        },
        onCancel: () => {
          handleClose();
          reject("cancel");
        },
      };

      const vnode = createVNode(ConfirmDialog, props);
      render(vnode, container);
      document.body.appendChild(container);

      // We need to keep a reference to close it properly if user clicks mask
      // But ConfirmDialog handles mask click via modelValue update usually?
      // Our ConfirmDialog has :close-on-click-modal="false" so checking that.

      function handleClose() {
        render(null, container);
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }
    });
  },

  prompt: (
    message: string,
    title: string = "输入",
    options: PromptOptions = {}
  ) => {
    return new Promise<{ value: string; action: "confirm" }>(
      (resolve, reject) => {
        const container = document.createElement("div");

        const props = {
          modelValue: true,
          title,
          description: message, // Prompt usually treats message as description/content
          ...options,
          "onUpdate:modelValue": (val: boolean) => {
            if (!val) {
              handleClose();
              reject("cancel");
            }
          },
          onConfirm: (value: string) => {
            handleClose();
            resolve({ value, action: "confirm" });
          },
          onCancel: () => {
            handleClose();
            reject("cancel");
          },
        };

        const vnode = createVNode(InputDialog, props);
        render(vnode, container);
        document.body.appendChild(container);

        function handleClose() {
          render(null, container);
          document.body.removeChild(container);
        }
      }
    );
  },
};

export default MessageBox;
