/*!
 * rete-vue-render-plugin v0.5.1
 * (c) 2021 Vitaliy Stoliarov
 * Released under the MIT license.
 */
import { postMeta, deleteMeta } from "@/api/v1/meta";

import { v4 as uuidv4 } from "uuid";

function install(editor, options) {
  editor.on("noderemove", (component) => {
    if (component.name !== "Meta" || editor.silent) {
      return true;
    }
    const id = component.data["id"];

    if (id !== -1) {
      if (options.root.saveable) {
        deleteMeta(id)
          .then((response) => {
            console.log("delete ok" + id);
            options.root._deleteMeta(id);
          })
          .catch((e) => {
            console.error(e);
          });
      }
    } else {
      return false;
    }
    return true;
  });
  editor.on("nodecreate", (component) => {
    if (component.name !== "Meta") {
      return true;
    }

    if (typeof component.data["meta"] !== "undefined") {
      component.data["id"] = component.data["meta"].id;
      component.data["title"] = component.data["meta"].name;
    }

    let id = component.data["id"];
    if (options.root.saveable) {
      if (typeof id === "undefined") {
        const uuid = uuidv4();
        const data = {
          verse_id: options.root.id,
          uuid,
        };

        postMeta(data).then((response) => {
          const meta = response.data;
          options.root._addMeta(meta);
          id = meta.id;
          component.controls.get("id").setValue(id);
          component.controls.get("uuid").setValue(uuid);
          setTimeout(() => {
            component.controls.get("title").$emit("setId", id);
            component.controls.get("event").$emit("setId", id);
          });
        });
      } else {
        setTimeout(() => {
          component.controls.get("title").$emit("setId", id);
          component.controls.get("event").$emit("setId", id);
        });
      }
    }

    return true;
  });
}
export default {
  name: "rete-meta",
  install: install,
};
