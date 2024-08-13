import { ComponentSocket } from "@/node-editor/sockets/sockets";

const BillboardType = {
  title: "Billboard",
  allocate: ["组件"],
  controls: [
    {
      type: "uuid",
      key: "uuid",
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
export default BillboardType;
