function install(editor, options) {
  const map = new Map();
  options.forEach((value) => {
    map.set(value.output.name, value);
  });
  let removeNode = -1;
  editor.on("noderemove", async (component) => {
    if (map.has(component.name)) {
      removeNode = component.id;
      setTimeout(() => {
        removeNode = -1;
      });
    }

    return true;
  });

  editor.on("nodecreated", (component) => {
    if (map.has(component.name)) {
      setTimeout(() => {
        const option = map.get(component.name);
        const input = editor.nodes.find((n) => n.name === option.input.name);
        if (input !== null) {
          editor.connect(
            component.outputs.get(option.output.socket),
            input.inputs.get(option.input.socket)
          );
        }
      });
    }

    return true;
  });
  editor.on("connectioncreate", (connection, a, b) => {
    if (connection.output.node.id === connection.input.node.id) {
      return false;
    }
    return true;
  });
  editor.on("connectionremove", (connection) => {
    if (editor.silent) {
      return true;
    }
    if (map.has(connection.output.node.name)) {
      const item = map.get(connection.output.node.name);
      if (
        item.input.name === connection.input.node.name &&
        item.input.socket === connection.input.key &&
        item.output.name === connection.output.node.name &&
        item.output.socket === connection.output.key &&
        connection.output.node.id !== removeNode
      ) {
        return false;
      }
    }
    return true;
  });
}
export default {
  name: "rete-always-connection",
  install: install,
};
