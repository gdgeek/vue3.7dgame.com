import { EntitySocket, ComponentSocket } from "@/node-editor/sockets/sockets";

const PolygenType = {
  title: "Voxel",
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
      resource: "voxel",
      title: "体素",
      readonly: false,
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
export default PolygenType;
