import { EntitySocket, ComponentSocket } from "@/node-editor/sockets/sockets";

const VideoType = {
  title: "Video",
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
      readonly: false,
    },
    {
      type: "bool",
      key: "active",
      title: "激活",
      readonly: false,
    },
    {
      type: "resource",
      key: "resource",
      resource: "video",
      title: "视频",
      readonly: false,
    },
    {
      type: "number",
      key: "width",
      title: "宽度",
      readonly: false,
      default: 0.5,
    },
    {
      type: "bool",
      key: "loop",
      title: "循环",
      readonly: false,
      default: false,
    },
    {
      type: "bool",
      key: "play",
      title: "播放",
      readonly: false,
      default: true,
    },
    {
      type: "bool",
      key: "console",
      title: "控制",
      readonly: false,
      default: true,
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
export default VideoType;
