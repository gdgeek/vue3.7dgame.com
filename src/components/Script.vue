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
    <el-card v-if="activeName === 'script' && script !== ''" class="box-card">
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
import toolbox from "@/assets/js/blockly/verse/toolbox";
import { AddBlocks } from "@/assets/js/blockly/verse/blocks";
import type { TabsPaneContext } from "element-plus";
import { LuaGenerator } from "blockly/lua";
import type { Workspace, WorkspaceSvg } from "blockly";

const luaGeneratorInstance = new LuaGenerator();

interface Props {
  blockly: string;
  id: number;
  resource: Record<string, any>;
}
const props = defineProps<Props>();

const activeName = ref("blockly");
const workspace = ref<WorkspaceSvg>(null);
const script = ref("");

onMounted(() => {
  AddBlocks({ resource: props.resource });

  workspace.value = Blockly.inject("blocklyDiv", {
    media: "/src/assets/test/blockly/media",
    toolbox: toolbox,
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

  if (props.blockly) {
    load(props.blockly);
  }
});

const load = (data: any) => {
  if (workspace.value) {
    try {
      const parsedData = JSON.parse(data);
      const blocks = parsedData.blocks || [];
      Blockly.serialization.workspaces.load(
        { blocks: blocks },
        workspace.value
      );
    } catch (error) {
      console.error("Error loading workspace:", error);
    }
  }
};

const handleClick = (tab: TabsPaneContext, event: Event) => {
  if (activeName.value === "script") {
    script.value =
      "local verse = {}\nlocal is_playing = false\n\n" +
      Blockly.Lua.workspaceToCode(workspace.value);
  }
  console.log(tab, event);
};

const save = async () => {
  if (workspace.value) {
    const data = Blockly.serialization.workspaces.save(workspace.value);

    try {
      const generatedScript =
        "local verse = {}\nlocal is_playing = false\n\n" +
        luaGeneratorInstance.workspaceToCode(workspace.value);

      emit("submit", props.id, JSON.stringify(data), generatedScript, () => {
        ElMessage({
          message: "代码保存成功",
          type: "success",
        });
      });
    } catch (e: any) {
      ElMessage({
        message: e.message,
        type: "error",
      });
    }
  }
};
</script>
