/*!
 * rete-vue-render-plugin v0.5.1
 * (c) 2021 Vitaliy Stoliarov
 * Released under the MIT license.
 */
import { v4 as uuidv4 } from "uuid";

function install(editor, options) {
  const set = new Set();
  editor.on("nodecreate", (component) => {
    options.forEach((value, index, arr) => {
      if (value.component === component.name) {
        const control = component.controls.get(value.target);
        if (control !== null) {
          if (
            typeof component.data[value.target] === "undefined" ||
            set.has(component.data[value.target])
          ) {
            component.data[value.target] = uuidv4();
          }
          set.add(component.data[value.target]);
        }
      }
    });

    return true;
  });
}
export default {
  name: "rete-uuid",
  install: install,
};
