/*!
 * rete-vue-render-plugin v0.5.1
 * (c) 2021 Vitaliy Stoliarov
 * Released under the MIT license.
 */

function install(editor, options) {
  editor.on("noderemove", (component) => {
    alert("无权限进行操作");
    return false;
  });

  editor.on("nodecreate", (component) => {
    alert("无权限进行操作");
    return false;
  });
}
export default {
  name: "rete-ban",
  install: install,
};
