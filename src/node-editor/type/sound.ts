import { EntitySocket, ComponentSocket } from "@/node-editor/sockets/sockets";

const SoundType = {
  title: "Sound",
  allocate: ["实体"],
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "string",
      key: "name",
      title: "名称",
      readonly: false,
    },
    {
      type: "transform",
      key: "transform",
      readonly: true,
      hidden: true,
    },
    {
      type: "bool",
      key: "active",
      title: "激活",
      readonly: true,
      hidden: true,
    },
    {
      type: "resource",
      key: "resource",
      resource: "audio",
      title: "音频",
      readonly: false,
    },
    {
      type: "number",
      key: "volume",
      title: "音量",
      readonly: false,
      default: 1,
    },
  ],
  inputs: [
    {
      key: "entities",
      title: "实体",
      socket: EntitySocket,
      multiConns: true,
    },
    {
      key: "components",
      title: "组件",
      socket: ComponentSocket,
      multiConns: true,
    },
  ],
  outputs: [
    {
      key: "out",
      title: "实体",
      socket: EntitySocket,
      multiConns: true,
    },
  ],
};
export default SoundType;
