import { ButtonSocket, ActionSocket } from "@/node-editor/sockets/sockets";

const ButtonType = {
  title: "Button",
  allocate: ["其他"],
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "string",
      key: "title",
      title: "标题",
      default: "标题",
    },
    {
      type: "icons",
      key: "icon",
      title: "图标",
    },
    {
      type: "string",
      key: "action",
      title: "动作",
    },
    {
      type: "string",
      key: "parameter",
      title: "参数",
    },
  ],
  inputs: [],
  outputs: [
    {
      key: "out",
      title: "按钮",
      socket: ButtonSocket,
      multiConns: false,
    },
  ],
};
export default ButtonType;
