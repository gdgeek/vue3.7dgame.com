import { ComponentSocket } from "@/node-editor/sockets/sockets";

const RotateType = {
  title: "Rotate",
  allocate: ["组件"],
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "vector3",
      key: "speed",
      title: "速度",
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
export default RotateType;
