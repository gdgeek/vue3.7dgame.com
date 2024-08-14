import Rete from "rete";
import { Control } from "@/node-editor/controls/control";
export class Component extends Rete.Component {
  constructor(type, root) {
    super(type.title);
    this.type_ = type;
    this.root_ = root;
  }

  builder(node:any) {
    const self = this;
    if (
      typeof this.type_.controls !== "undefined" &&
      this.type_.controls !== null
    ) {
      this.type_.controls.forEach((ctrl) => {
        node.addControl(
          new Control(this.editor, { data: ctrl, root: this.root_, node: node })
        );
      });
    }

    if (
      typeof this.type_.inputs !== "undefined" &&
      this.type_.inputs !== null
    ) {
      this.type_.inputs.forEach((input) => {
        const ipt = new Rete.Input(
          input.key,
          input.title,
          input.socket,
          input.multiConns
        );
        if (typeof input.control !== "undefined") {
          ipt.addControl(
            new Control(this.editor, {
              data: input.control,
              root: this.root_,
              node: node,
            })
          );
        }
        node.addInput(ipt);
      });
    }
    if (
      typeof this.type_.outputs !== "undefined" &&
      this.type_.outputs !== null
    ) {
      this.type_.outputs.forEach((output) => {
        node.addOutput(
          new Rete.Output(
            output.key,
            output.title,
            output.socket,
            output.multiConns
          )
        );
      });
    }
    return node;
  }
  worker(node, inputs, outputs, callback) {
    const data = {};
    data.type = this.type_.title;
    if (
      typeof this.type_.controls !== "undefined" &&
      this.type_.controls !== null
    ) {
      data.parameters = {};
      this.type_.controls.forEach((ctrl) => {
        if (typeof ctrl.ignore === "undefined" || !ctrl.ignore) {
          data.parameters[ctrl.key] = node.data[ctrl.key];
        }
      });
    }

    if (
      typeof this.type_.inputs !== "undefined" &&
      this.type_.inputs !== null
    ) {
      data.children = {};
      this.type_.inputs.forEach((input) => {
        const items = inputs[input.key];

        data.children[input.key] = [];

        if (items.length === 0) {
          if (typeof input.control !== "undefined") {
            data.parameters[input.control.key] = node.data[input.control.key];
          }
        } else {
          items.forEach((item) => {
            data.children[input.key].push(item);
          });
        }
      });
    }

    if (
      typeof this.type_.outputs !== "undefined" &&
      this.type_.outputs !== null
    ) {
      this.type_.outputs.forEach((output) => {
        outputs[output.key] = data;
      });
    }
    if (typeof this.type_.root !== "undefined" && this.type_.root) {
      console.log(JSON.stringify(data));
      callback(JSON.stringify(data));
    }
  }
}
