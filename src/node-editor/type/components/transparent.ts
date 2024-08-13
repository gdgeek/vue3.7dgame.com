import { ComponentSocket } from "@/node-editor/sockets/sockets";

const TransparentType = {
  title: "Transparent",
  allocate: ["组件"],
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "number",
      key: "alpha",
      title: "透明度",
      readonly: false,
      default: 0.5,
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
export default TransparentType;
