import { ComponentSocket } from "@/node-editor/sockets/sockets";

const MovedType = {
  title: "Moved",
  allocate: ["组件"],
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "bool",
      key: "magnetic",
      title: "磁力",
      default: false,
      readonly: false,
    },
    {
      type: "bool",
      key: "scalable",
      title: "双手缩放",
      default: true,
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
export default MovedType;
