import { ComponentSocket } from "@/node-editor/sockets/sockets";

const ActionType = {
  title: "Action",
  allocate: ["组件"],
  controls: [
    {
      type: "uuid",
      key: "uuid",
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
  outputs: [
    {
      key: "out",
      title: "组件",
      socket: ComponentSocket,
      multiConns: true,
    },
  ],
};
export default ActionType;
