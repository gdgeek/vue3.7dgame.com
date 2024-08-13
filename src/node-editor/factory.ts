export async function Build(editor, data, input = null) {
  return new Promise((resolve, reject) => {
    if (data === null) {
      resolve(null);
      return;
    }
    /*
    if (data.type === 'MetaKnight') {
      data.type = 'Knight'
    }
*/
    const component = editor.getComponent(data.type);

    component
      .createNode(data.parameters)
      .then((node) => {
        editor.addNode(node);

        if (input !== null) {
          editor.connect(node.outputs.get("out"), input);
        }

        if (typeof data.children !== "undefined" && data.children !== null) {
          const keys = Object.keys(data.children);
          if (keys.length === 0) {
            resolve(node);
            return;
          }

          let count = 0;
          keys.forEach((key) => {
            data.children[key].forEach((item) => {
              count++;
            });
          });
          if (count !== 0) {
            keys.forEach((key) => {
              data.children[key].forEach((item) => {
                Build(editor, item, node.inputs.get(key))
                  .then((node) => {
                    --count;
                    if (count === 0) {
                      resolve(node);
                    }
                  })
                  .catch((e) => {
                    reject(e);
                  });
              });
            });
          } else {
            resolve(node);
          }
        } else {
          resolve(node);
        }
      })
      .catch((e) => {
        reject(e);
      });
  });
}
