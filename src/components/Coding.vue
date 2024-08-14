<template>
  <div>
    <el-tabs v-model="activeName" type="card" @tab-click="handleClick">
      <el-tab-pane label="逻辑编辑" name="blockly"></el-tab-pane>
      <el-tab-pane label="代码查看" name="script"></el-tab-pane>
    </el-tabs>
    <div
      v-show="activeName === 'blockly'"
      id="blocklyDiv"
      style="height: 600px; width: 100%"
    ></div>
    <el-card v-if="activeName === 'script'" class="box-card">
      <div v-highlight>
        <pre>
          <code class="lua">{{ script }}</code>
        </pre>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import * as Blockly from "blockly";
import toolbox from "@/assets/js/blockly/toolbox";
import { AddBlocks } from "@/assets/js/blockly/blocks";
import { cybersType, putCyber } from "@/api/v1/cyber";
import { metaInfo } from "@/api/v1/meta";
import type { TabsPaneContext } from "element-plus";
import type { Workspace, WorkspaceSvg } from "blockly";

import { luaGenerator } from "blockly/lua";

const props = defineProps<{
  cyber: cybersType;
  meta: metaInfo;
  id: number;
  index: string;
}>();

console.log("props", props);

const activeName = ref("blockly");
const script = ref("");
const workspace = ref<WorkspaceSvg>();

onMounted(() => {
  try {
    if (props.meta.data) {
      console.log("index", props.index);
      console.log("resource", getResource(props.meta));
      const res = AddBlocks({
        index: props.index,
        resource: getResource(props.meta),
      });
      console.log("AddBlocks", res); // undefined
    }

    // 初始化 Blockly 工作区
    workspace.value = Blockly.inject("blocklyDiv", {
      media: "/src/assets/test/blockly/media",
      toolbox,
      grid: { spacing: 20, length: 3, colour: "#ccc", snap: true },
      move: {
        scrollbars: { horizontal: false, vertical: true },
        drag: true,
        wheel: false,
      },
      zoom: {
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        controls: true,
        wheel: true,
        pinch: true,
      },
    });

    if (props.cyber && props.cyber.data) {
      const res = load(props.cyber.data);
      console.log("Load result:", res);
    }
    console.log("Initialized workspace:", workspace.value);

    const luaCode = luaGenerator.workspaceToCode(workspace.value);
    console.log("luaCode", luaCode);

    script.value = "local meta = {}\nindex = ''\n" + luaCode;
  } catch (error) {
    console.error("Error in onMounted:", error);
  }
});

const getResource = (meta: metaInfo) => {
  const data = JSON.parse(meta.data!);
  console.log("data", data);
  const ret = {
    action: [],
    trigger: [],
    polygen: [],
    picture: [],
    video: [],
    voxel: [],
    text: [],
    sound: [],
    entity: [],
    events: {
      inputs: [],
      outputs: [],
    },
  };
  ret.events = JSON.parse(meta.events!) || { inputs: [], outputs: [] };
  console.log("events", ret.events);
  addMetaData(data, ret);
  return ret;
};

const addMetaData = (data: any, ret: any) => {
  const action = testAction(data);
  console.log("action", action);
  if (action) {
    ret.action.push(action);
  }

  const entity = testPoint(data, [
    "polygen",
    "entity",
    "voxel",
    "video",
    "picture",
    "text",
    "voxel",
  ]);

  console.log("entity", entity);

  if (entity) {
    ret.entity.push(entity);
  }

  const polygen = testPoint(data, ["polygen"]);
  if (polygen) {
    ret.polygen.push(polygen);
  }

  const video = testPoint(data, ["video"]);
  if (video) {
    ret.video.push(video);
  }

  const picture = testPoint(data, ["picture"]);
  if (picture) {
    ret.picture.push(picture);
  }

  const sound = testPoint(data, ["sound"]);
  if (sound) {
    ret.sound.push(sound);
  }

  const text = testPoint(data, ["text"]);
  if (text) {
    ret.text.push(text);
  }

  const voxel = testPoint(data, ["voxel"]);
  if (voxel) {
    ret.voxel.push(voxel);
  }

  if (data.children) {
    Object.keys(data.children).forEach((key) => {
      data.children[key].forEach((item: any) => {
        addMetaData(item, ret);
      });
    });
  }
};

const testAction = (data: any) => {
  if (data && data.parameters && typeof data.parameters !== "undefined") {
    return {
      uuid: data.parameters.uuid,
      name: data.parameters.action ?? null,
      parameter: data.parameters.parameter ?? null,
    };
  }
};

const testPoint = (data: any, typeList: string[]) => {
  return typeList.find((type) => data.type.toLowerCase() === type.toLowerCase())
    ? {
        uuid: data.parameters.uuid,
        name: data.parameters.name ?? null,
      }
    : undefined;
};

const load = (data: any) => {
  if (workspace.value) {
    try {
      const parsedData = JSON.parse(data);

      const blocks = parsedData.blocks || {};
      // 保存当前工作区状态
      const state = Blockly.serialization.workspaces.save(workspace.value);

      const result = Blockly.serialization.workspaces.load(
        blocks,
        workspace.value,
        { recordUndo: true }
      );
      /*const result = Blockly.serialization.workspaces.load(
        { blocks: blocks },
        workspace.value,
        { recordUndo: true } // 可选，记录撤销操作
      );*/
      console.log("blocklyload", result);
    } catch (error) {
      console.error("Error loading workspace:", error);
    }
  }
};

const handleClick = (tab: TabsPaneContext, event: Event) => {};

const save = async () => {
  if (!workspace.value) return;

  const data = Blockly.serialization.workspaces.save(workspace.value);

  //if (props.cyber.data === JSON.stringify(data)) return;

  const test: string = luaGeneratorInstance.workspaceToCode(workspace.value);

  try {
    const scriptValue =
      "local meta = {}\nindex = ''\n" +
      luaGeneratorInstance.workspaceToCode(workspace.value);

    await putCyber(props.cyber.id, {
      data: JSON.stringify(data),
      script: scriptValue,
    });

    ElMessage({
      message: "代码保存成功",
      type: "success",
    });
  } catch (e: any) {
    ElMessage({
      message: e.message,
      type: "error",
    });
  }
};

defineExpose({
  save,
});
</script>
