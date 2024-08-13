import {
  MetaKnightSocket,
  MetaSocket,
  AnchorSocket,
} from "@/node-editor/sockets/sockets";

import env from "@/environment.js";

const VerseType = {
  title: "Verse",
  root: true,
  controls: [
    {
      type: "uuid",
      key: "uuid",
    },
    {
      type: "verse-name",
      key: "verse",
      readonly: true,
      ignore: true,
    },
    {
      type: "button",
      label: "场景",
      title: "编辑器",
      key: "editor",
      callback: function (root) {
        root.$router.push({
          path: "/verse/scene",
          query: root.$route.query,
        });
      },
      ignore: true,
    },
    {
      type: "button",
      label: "脚本",
      title: "编辑器",
      key: "blockly",
      callback: function (root) {
        root.$router.push({
          path: "/verse/script",
          query: root.$route.query,
        });
      },
      ignore: true,
    },
  ],
  inputs: [
    {
      key: "modules",
      title: "Module",
      socket: MetaKnightSocket,
      multiConns: true,
    },
  ],
};
/*
if (env.canStory()) {
  VerseType.controls.push({
    type: 'story',
    key: 'story'
  })
}
*/
export default VerseType;
