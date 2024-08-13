import { EntitySocket, ComponentSocket } from "@/node-editor/sockets/sockets";

const TextType = {
  title: "Text",
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
      type: "string",
      key: "text",
      title: "内容",
      readonly: false,
    },
    {
      type: "bool",
      key: "active",
      title: "激活",
      readonly: false,
    },
    /*,
    {
      type: 'polygen-reset',
      key: 'reset',
      title: '重制模型大小',
      readonly: false
    }*/
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
export default TextType;
