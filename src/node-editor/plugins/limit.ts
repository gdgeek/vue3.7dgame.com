/*!
 * rete-vue-render-plugin v0.5.1
 * (c) 2021 Vitaliy Stoliarov
 * Released under the MIT license.
 */

function install(editor, options) {
  editor.on("noderemove", (component) => {
    let limit = null;
    options.forEach((item) => {
      if (item.name === component.name) {
        limit = item;
      }
    });
    if (limit === null || typeof limit.min === "undefined") {
      return true;
    }

    let count = 0;
    editor.nodes.forEach(function (e) {
      if (e.name === component.name) {
        ++count;
      }
    });
    if (count <= limit.min) {
      alert("禁止删除" + component.name + "模块(至少" + limit.min + "个)");
      return false;
    }
    return true;
  });

  editor.on("nodecreate", (component) => {
    let limit = null;
    options.forEach((item) => {
      if (item.name === component.name) {
        limit = item;
      }
    });

    if (limit === null || typeof limit.max === "undefined") {
      return true;
    }

    let count = 0;
    editor.nodes.forEach(function (e) {
      if (e.name === component.name) {
        ++count;
      }
    });
    if (count >= limit.max) {
      alert("禁止创建" + component.name + "模块(至多" + limit.max + "个)");
      return false;
    }
    return true;
  });
}
export default {
  name: "rete-limit",
  install: install,
};
