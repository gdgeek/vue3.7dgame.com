import Rete from "rete";
import { NodeEditor, GetSchemes, ClassicPreset } from "rete";
import { DataflowEngine, DataflowEngineScheme } from "rete-engine";
import VueRenderPlugin from "rete-vue-render-plugin";
import ConnectionPlugin from "rete-connection-plugin";
// import AreaPlugin from "rete-area-plugin";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import AutoArrangePlugin from "rete-auto-arrange-plugin";
import ContextMenuPlugin from "rete-context-menu-plugin";
import LimitPlugin from "@/node-editor/plugins/limit";
import RandomStringPlugin from "@/node-editor/plugins/randomString";
import UUIDPlugin from "@/node-editor/plugins/uuid";
import { Component } from "./components/Component";
import BanPlugin from "@/node-editor/plugins/ban";

import { Build } from "@/node-editor/factory";
import {
  MetaRoot,
  Polygen,
  Picture,
  Video,
  Sound,
  Text,
  Entity,
  Transparent,
  Rotate,
  LockedScale,
  ImageTarget,
  Toolbar,
  Button,
  Action,
  Tooltip,
  Billboard,
  Moved,
  Voxel,
} from "./type/metaEditor";

type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;

const editor_ = new NodeEditor<Schemes>();
// let editor_: NodeEditor | null = null;
// let engine_: Engine | null = null;

const save = async function (): Promise<unknown> {
  if (!engine_ || !editor_) throw new Error("Editor or engine not initialized");
  await engine_.abort();
  let ret: any = null;
  await engine_.process(editor_.toJSON(), null, (data: unknown) => {
    ret = data;
  });
  return ret;
};

const arrange = function (): void {
  if (editor_ && editor_.nodes.length > 0) {
    editor_.trigger("arrange", editor_.nodes);
  }
};

const ban = function (): void {
  if (editor_) {
    editor_.use(BanPlugin);
  }
};

const create = function (meta: string): Promise<void> {
  const data = {
    type: "MetaRoot",
    parameters: {
      name: meta,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotate: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      active: true,
    },
    children: {
      entities: [] as unknown[],
      addons: [] as unknown[],
    },
  };
  return setup(data);
};

const setup = async function (data: unknown): Promise<void> {
  if (!editor_) throw new Error("Editor not initialized");
  await Build(editor_, data);
  setTimeout(() => {
    arrange();
    if (editor_) {
      editor_.view.resize();
      AreaExtensions.zoomAt(editor_);
      editor_.silent = false;
    }
  }, 250);
};

const initMeta = async function ({
  container,
  root,
}: {
  container: HTMLElement;
  root: any; // Replace 'any' with the correct type for root
}): Promise<void> {
  const types = [
    MetaRoot,
    Entity,
    Polygen,
    Picture,
    Voxel,
    Video,
    Sound,
    Text,
    Transparent,
    Rotate,
    LockedScale,
    ImageTarget,
    Toolbar,
    Button,
    Action,
    Tooltip,
    Billboard,
    Moved,
  ];

  type Schemes = BaseSchemes;
  const editor_ = new Rete.NodeEditor<Schemes>("MrPP@0.1.0", container);
  editor_.silent = true;
  editor_.use(ConnectionPlugin);
  editor_.use(VueRenderPlugin);
  editor_.use(ContextMenuPlugin, {
    delay: 100,
    allocate(component: any) {
      if (typeof component.type_.allocate !== "undefined") {
        return component.type_.allocate;
      }

      return [];
    },
    rename(component: any) {
      console.log(component);
      return component.name;
    },
  });
  editor_.use(AutoArrangePlugin, { margin: { x: 50, y: 50 }, depth: 110 });
  editor_.use(AreaExtensions);
  editor_.use(LimitPlugin, [{ name: "MetaRoot", max: 1, min: 1 }]);
  editor_.use(RandomStringPlugin, [
    { component: "Polygen", target: "name" },
    { component: "Video", target: "name" },
    { component: "Picture", target: "name" },
    { component: "Voxel", target: "name" },
    { component: "Sound", target: "name" },
    { component: "Text", target: "name" },
    { component: "Text", target: "text" },
    { component: "Entity", target: "name" },
    { component: "Button", target: "title" },
    { component: "Button", target: "action" },
    { component: "Action", target: "action" },
    { component: "Tooltip", target: "text" },
  ]);

  editor_.use(UUIDPlugin, [
    { component: "Polygen", target: "uuid" },
    { component: "Video", target: "uuid" },
    { component: "Picture", target: "uuid" },
    { component: "Sound", target: "uuid" },
    { component: "Voxel", target: "uuid" },
    { component: "Text", target: "uuid" },
    { component: "Entity", target: "uuid" },
    { component: "Button", target: "uuid" },
    { component: "Action", target: "uuid" },
    { component: "Tooltip", target: "uuid" },
    { component: "Moved", target: "uuid" },
  ]);

  // engine_ = new Engine("MrPP@0.1.0");
  const engine_ = new DataflowEngine<DataflowEngineScheme>();
  types.forEach((type) => {
    const component = new Component(type, root);
    editor_.register(component);
    engine_.register(component);
  });

  editor_.on("process", async (e: any) => {
    if (typeof e === "object" && typeof e.status === "string") {
      if (e.status === "save") {
        await engine_.abort();
        await root.save();
      }
    }
  });

  editor_.trigger("process", { status: "init" });
};

export default {
  initMeta,
  save,
  setup,
  create,
  arrange,
  ban,
};
