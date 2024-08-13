import Rete from "rete";
import VueRenderPlugin from "rete-vue-render-plugin";
import ConnectionPlugin from "rete-connection-plugin";
import AreaPlugin from "rete-area-plugin";

import { EventSocket } from "@/node-editor/sockets/sockets";
import RandomStringPlugin from "@/node-editor/plugins/randomString";
import AutoArrangePlugin from "rete-auto-arrange-plugin";
import ContextMenuPlugin from "rete-context-menu-plugin";
import LimitPlugin from "@/node-editor/plugins/limit";
import BanPlugin from "@/node-editor/plugins/ban";
import ModulePlugin from "@/node-editor/plugins/module";
//import MetaKnightPlugin from '@/node-editor/plugins/metaKnight'

import MetaPlugin from "@/node-editor/plugins/meta.js";
import AlwaysConnectionPlugin from "@/node-editor/plugins/alwaysConnection";
import { Component } from "@/node-editor/components/Component";
import {
  Meta,
  Verse,
  _Module,
  MetaKnight,
} from "@/node-editor/type/verseEditor";
import { Build } from "@/node-editor/factory";

let editor_ = null;
let engine_ = null;
const arrange = function () {
  editor_.trigger("arrange", editor_.nodes);
};

const saveEvent = async function () {
  const list = editor_.nodes.filter((node) => {
    if (
      node.name.toLowerCase() === "meta" ||
      node.name.toLowerCase() === "metaknight"
    ) {
      return true;
    }
    return false;
  });
  const ret = [];

  list.forEach((node) => {
    const nd = {
      node: node.data.uuid,
      linked: [],
    };

    node.outputs.forEach((output, key) => {
      if (
        output.socket.name.toLowerCase() === "event" &&
        output.hasConnection()
      ) {
        const od = {};

        nd.linked.push(od);
        od.uuid = output.key;
        od.connections = [];
        const links = output.toJSON();
        links.connections.forEach((item) => {
          const co = {};

          const n = editor_.nodes.find((node) => {
            return node.id === item.node;
          });

          od.connections.push(co);
          co.node = n.data.uuid;
          co.uuid = item.input;
        });
      }
    });
    if (nd.linked.length !== 0) {
      ret.push(nd);
    }
  });
  return ret;
};
const save = async function () {
  await engine_.abort();
  let ret = null;
  await engine_.process(editor_.toJSON(), null, function (data) {
    ret = data;
  });
  return ret;
};

const setup = async function (data) {
  await Build(editor_, data);
  setTimeout(() => {
    arrange();
    editor_.view.resize();
    AreaPlugin.zoomAt(editor_);
    editor_.silent = false;
  }, 250);
};
/*
const loadEvent = async function (uuid, oldValue, newValue) {
  const node = getNodeByUUID({ uuid })

  if (!node) {
    console.error(333)
    console.error(uuid)
    return
  }

  const oldSolts = oldValue

  const iRemove = oldSolts.inputs.filter(n1 => {
    const f = newValue.inputs.find(n2 => {
      return n2.uuid === n1.uuid
    })
    if (typeof f === 'undefined') {
      return true
    }
    return false
  })

  const iAdd = newValue.inputs.filter(n1 => {
    const f = oldSolts.inputs.find(n2 => {
      return n2.uuid === n1.uuid
    })
    if (typeof f === 'undefined') {
      return true
    }
    return false
  })

  iRemove.forEach(i => {
    const remove = node.inputs.get(i.uuid)
    if (remove) {
      remove.connections.forEach(conn => {
        editor_.removeConnection(conn)
      })
      node.removeInput(remove)
    }
  })

  iAdd.forEach(i => {
    node.addInput(
      new Rete.Input(i.uuid, '[' + i.title + ']', EventSocket, 'multiConns')
    )
  })

  const oRemove = oldSolts.outputs.filter(n1 => {
    const f = newValue.outputs.find(n2 => {
      return n2.uuid === n1.uuid
    })
    if (typeof f === 'undefined') {
      return true
    }
    return false
  })

  const oAdd = newValue.outputs.filter(n1 => {
    const f = oldSolts.outputs.find(n2 => {
      return n2.uuid === n1.uuid
    })
    if (typeof f === 'undefined') {
      return true
    }
    return false
  })

  oRemove.forEach(i => {
    const remove = node.outputs.get(i.uuid)

    if (remove) {
      remove.connections.forEach(conn => {
        editor_.removeConnection(conn)
      })
      node.removeOutput(remove)
    }
  })

  oAdd.forEach(i => {
    node.addOutput(
      new Rete.Output(i.uuid, '[' + i.title + ']', EventSocket, 'multiConns')
    )
  })

  editor_.selectNode(node)
  editor_.selected.clear()
}
*/
const getNodeByUUID = function ({ uuid }) {
  const node = editor_.nodes.find((item) => {
    if (item.data && item.data.uuid && item.data.uuid === uuid) {
      return true;
    }
    return false;
  });
  return node;
};
/*
const getNodeByID = function ({ id }) {
  const node = editor_.nodes.find(item => {
    if (item.data.id && item.data.id === id) {
      return true
    }
    return false
  })
  return node
}*/
/*
const removeLinked = async function () {
  const list = []
  editor_.nodes.forEach(node => {
    const connections = node.getConnections()
    connections.forEach(connection => {
      if (
        connection.input.socket.name.toLowerCase() == 'event' &&
        connection.input.node.id == node.id
      ) {
        list.push(connection)
      }
    })
  })
  list.forEach(item => {
    editor_.removeConnection(item)
  })
}
*/
/*
const addLinked = async function ({ node, linked }) {
  const n = getNodeByUUID({ uuid: node })
  if (n) {
    linked.forEach(item => {
      const output = n.outputs.get(item.uuid)

      item.connections.forEach(c => {
        const node2 = getNodeByUUID({ uuid: c.node })
        const input = node2.inputs.get(c.uuid)
        editor_.connect(output, input)
      })
    })
  }
}
*/
/*
const addEventNode = async function (event_node, uuid) {
  if (!event_node) {
    return
  }
  const node = editor_.nodes.find(n => {
    if (n.data.uuid && n.data.uuid === uuid) {
      return true
    }
    return false
  })

  if (node) {
    event_node.outputs.forEach(o => {
      node.addOutput(
        new Rete.Output(o.uuid, '[' + o.title + ']', EventSocket, 'multiConns')
      )
    })
    event_node.inputs.forEach(i => {
      node.addInput(
        new Rete.Input(i.uuid, '[' + i.title + ']', EventSocket, 'multiConns')
      )
    })
    editor_.selectNode(node)
    editor_.selected.clear()
  }
}*/
const banKnight = function () {
  const nodes = editor_.nodes.filter((n) => {
    if (n.name.toLowerCase() === "knight") {
      return true;
    }
    return false;
  });
  const ret = [];
  nodes.forEach((n) => {
    const item = n.controls.get("knight").vueContext.item;
    if (item !== null) {
      const id = item.id;
      if (!ret.includes(id)) {
        ret.push(id);
      }
    }
  });

  return ret;
};
const ban = function () {
  editor_.use(BanPlugin);
};
const initVerse = async function ({ container, verseId, root }) {
  const types = [Verse, _Module, MetaKnight];
  editor_ = new Rete.NodeEditor("MrPP@0.1.0", container);
  editor_.silent = true;
  editor_.use(ConnectionPlugin);
  editor_.use(VueRenderPlugin);

  editor_.use(ContextMenuPlugin, {
    nodeItems: { Clone: false },
    delay: 100,
    allocate(component) {
      if (component.type_.title === "Module") {
        return null;
      }

      return [];
    },
    rename(component) {
      console.log(component);
      return component.name;
    },
  });

  editor_.use(AutoArrangePlugin, { margin: { x: 50, y: 50 }, depth: 110 });
  editor_.use(AreaPlugin);
  editor_.use(LimitPlugin, [{ name: "Verse", max: 1, min: 1 }]);

  editor_.use(ModulePlugin, { root });
  editor_.use(MetaPlugin, { root });
  //editor_.use(MetaKnightPlugin, { verseId, root })

  editor_.use(AlwaysConnectionPlugin, [
    {
      output: { name: "Module", socket: "out" },
      input: { name: "Verse", socket: "modules" },
    },
  ]);
  editor_.use(RandomStringPlugin, [{ component: "Module", target: "title" }]);

  engine_ = new Rete.Engine("MrPP@0.1.0");

  types.forEach((type) => {
    const component = new Component(type, root);
    editor_.register(component);
    engine_.register(component);
  });
  editor_.on("process", async (e) => {
    if (typeof e === "object" && typeof e.status === "string") {
      if (e.status === "save") {
        await engine_.abort();
        await root.save();
      }
    }
  });

  editor_.trigger("process", { status: "init" });
};

const addModule = function (parameters) {
  return new Promise((resolve, reject) => {
    const component = editor_.getComponent("Module");

    component
      .createNode(parameters)
      .then((node) => {
        editor_.addNode(node);

        setTimeout(() => {
          arrange();
          editor_.view.resize();
          AreaPlugin.zoomAt(editor_);
          resolve(node);
        }, 250);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
export default {
  ban,
  initVerse,
  setup,
  banKnight,
  arrange,
  save,
  saveEvent,
  addModule,
  //addEventNode,
  //addLinked,
  //removeLinked,
  //loadEvent
};
