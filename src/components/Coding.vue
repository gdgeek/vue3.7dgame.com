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
import "blockly/lua";
import toolbox from "@/assets/js/blockly/toolbox";
import { AddBlocks } from "@/assets/js/blockly/blocks";
import { cybersType, putCyber } from "@/api/v1/cyber";
import { metaInfo } from "@/api/v1/meta";
import { LuaGenerator } from "blockly/lua";

const luaGeneratorInstance = new LuaGenerator() as any;

const props = defineProps<{
  cyber: cybersType;
  meta: metaInfo;
  id: number;
  index: string;
}>();

const activeName = ref("blockly");
const script = ref("");
// const workspace = ref<Blockly.WorkspaceSvg | null>(null);
const workspace = ref<any>(null);

onMounted(() => {
  if (props.meta.data) {
    AddBlocks({
      index: props.index,
      resource: getResource(props.meta),
    });
  }

  workspace.value = Blockly.inject("blocklyDiv", {
    media: "resource/blockly/media/",
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
  }) as Blockly.WorkspaceSvg;

  if (props.cyber && props.cyber.data) {
    load(props.cyber.data);
  }
  console.log(workspace.value);
});

const getResource = (meta: metaInfo) => {
  const data = JSON.parse(meta.data!);

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
  addMetaData(data, ret);
  return ret;
};

const addMetaData = (data: any, ret: any) => {
  const action = testAction(data);
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
  if (
    data &&
    data.parameters &&
    typeof data.parameters.action !== "undefined"
  ) {
    return {
      uuid: data.parameters.uuid,
      name: data.parameters.action,
      parameter: data.parameters.parameter,
    };
  }
};

const testPoint = (data: any, typeList: string[]) => {
  return typeList.find((type) => data.type.toLowerCase() === type.toLowerCase())
    ? {
        uuid: data.parameters.uuid,
        name: data.parameters.name,
      }
    : undefined;
};

const load = (data: string) => {
  if (workspace.value) {
    (Blockly as any).serialization.workspaces.load(
      JSON.parse(data),
      workspace.value
    );
  }
};

const handleClick = (tab: any, event: any) => {
  if (activeName.value === "script") {
    script.value =
      "local meta = {}\nindex = ''\n" +
      luaGeneratorInstance.workspaceToCode(workspace.value!);
    // luaGenerator.workspaceToCode(workspace.value!);
  }
  console.log(tab, event);
};

const save = async () => {
  if (!workspace.value) return;

  const data = (Blockly as any).serialization.workspaces.save(workspace.value);
  if (props.cyber.data === JSON.stringify(data)) return;

  try {
    const scriptValue =
      "local meta = {}\nindex = ''\n" +
      luaGeneratorInstance.workspaceToCode(workspace.value);
    // luaGenerator.workspaceToCode(workspace.value);

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
