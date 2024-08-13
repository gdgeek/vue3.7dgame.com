/*!
 * rete-vue-render-plugin v0.5.1
 * (c) 2021 Vitaliy Stoliarov
 * Released under the MIT license.
 */
import { postMetaKnight, deleteMetaKnight } from "@/api/v1/meta-knight";
//var randomWords = require('random-words')
//let removeNope = -1

import { v4 as uuidv4 } from "uuid";
function install(editor, options) {
  editor.on("nodecreate", (component) => {
    console.error(component);
    if (component.name !== "Module ") {
      return true;
    } else if (!editor.silent) {
      options.root.createMetaKnight();
    }
    return false;
  });
}
export default {
  name: "rete-module",
  install: install,
};
