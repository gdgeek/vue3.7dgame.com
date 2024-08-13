import { MetaKnightSocket } from "@/node-editor/sockets/sockets";

const MetaKnightType = {
  title: "Module",
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "num",
      key: "id",
      hidden: true,
      readonly: true,
    },
    {
      type: "string",
      key: "title",
      title: "标题",
      readonly: false,
    },
    {
      type: "module",
      title: "元数据",
      key: "meta_id",
      hidden: false,
      readonly: true,
    },
    {
      type: "string",
      title: "数据",
      key: "data",
      hidden: true,
      readonly: true,
    },
    {
      type: "transform",
      key: "transform",
      readonly: false,
    },
  ],
  inputs: null,
  outputs: [
    {
      key: "out",
      title: "Module",
      socket: MetaKnightSocket,
      multiConns: false,
    },
  ],
};
export default MetaKnightType;
