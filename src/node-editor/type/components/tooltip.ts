import { ComponentSocket } from "@/node-editor/sockets/sockets";

const TooltipType = {
  title: "Tooltip",
  allocate: ["组件"],
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "vector3",
      key: "position",
      title: "位置",
      readonly: false,
    },
    {
      type: "float",
      key: "length",
      title: "长度",
      readonly: false,
      default: "0.25",
    },
    {
      type: "string",
      key: "text",
      title: "文本",
      readonly: false,
    },
  ],
  inputs: [],
  outputs: [
    {
      key: "out",
      title: "组件",
      socket: ComponentSocket,
      multiConns: true,
    },
  ],
};
export default TooltipType;
