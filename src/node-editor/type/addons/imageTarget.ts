import { AddonSocket } from "@/node-editor/sockets/sockets";

const ImageTargetType = {
  title: "ImageTarget",
  allocate: ["插件"],
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "vector3",
      key: "position",
      title: "位置",
    },
    {
      type: "vector3",
      key: "rotate",
      title: "旋转",
    },
    {
      type: "picture",
      key: "picture",
      title: "图片",
      readonly: false,
    },
    {
      type: "number",
      key: "width",
      title: "宽度",
      readonly: false,
      default: 0.5,
    },
  ],
  inputs: [],
  outputs: [
    {
      key: "out",
      title: "插件",
      socket: AddonSocket,
      multiConns: false,
    },
  ],
};
export default ImageTargetType;
