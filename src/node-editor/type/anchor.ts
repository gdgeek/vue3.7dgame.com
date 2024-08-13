import { AnchorSocket } from "@/node-editor/sockets/sockets";

const AnchorType = {
  title: "Anchor",
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "string",
      key: "title",
      title: "标题",
      readonly: false,
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
      title: "Anchor",
      socket: AnchorSocket,
      multiConns: false,
    },
  ],
};
export default AnchorType;
