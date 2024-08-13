/*!
 * rete-vue-render-plugin v0.5.1
 * (c) 2021 Vitaliy Stoliarov
 * Released under the MIT license.
 */

const randomWords = require("random-words");
function install(editor, options) {
  editor.on("nodecreate", (component) => {
    console.log(options);
    console.log(component);
    options.forEach((value, index, arr) => {
      if (value.component === component.name) {
        const control = component.controls.get(value.target);
        if (control !== null) {
          if (typeof component.data[value.target] === "undefined") {
            component.data[value.target] = randomWords();
          }
        }
      }
    });

    return true;
  });
}
export default {
  name: "rete-randomwords",
  install: install,
};
