import { MetaSocket } from "@/node-editor/sockets/sockets";

// import { MetaSocket } from '@/node-editor/sockets/sockets'
const MetaType = {
  title: "Meta",
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
      type: "meta",
      key: "title",
      title: "标题",
      readonly: false,
    },
    {
      type: "transform",
      key: "transform",
      readonly: false,
    },

    {
      type: "event",
      key: "event",
      label: "事件",
      ignore: true,
    },
  ],
  inputs: null,
  outputs: [
    {
      key: "out",
      title: "Meta",
      socket: MetaSocket,
      multiConns: false,
    },
  ],
};
export default MetaType;
