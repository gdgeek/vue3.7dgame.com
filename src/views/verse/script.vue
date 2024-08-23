<template>
  <div class="script">
    <el-container>
      <el-main>
        <el-card :loading="loading" class="box-card">
          <template #header>
            <div v-if="verse" class="clearfix">
              {{ verse.name }} / {{ verse.script!.title }} / 【脚本】

              <el-button-group style="float: right">
                <el-button
                  v-if="saveable"
                  type="primary"
                  size="small"
                  @click="save"
                >
                  <font-awesome-icon icon="save"></font-awesome-icon>
                  保存脚本
                </el-button>
              </el-button-group>
            </div>
          </template>
          <!-- <blockly-script
            v-if="script !== null && verse !== null"
            ref="blockly"
            :blockly="script.workspace"
            :resource="resource"
            :id="script.id"
            @submit="submit"
          ></blockly-script> -->
          <el-container>
            <el-main style="margin: 0; padding: 0; height: 70vh">
              <iframe
                style="margin: 0; padding: 0; height: 100%; width: 100%"
                id="editor"
                :src="blocklyUrl"
              ></iframe>
            </el-main>
          </el-container>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
// import BlocklyScript from "@/components/Script.vue";
import {
  getVerseScript,
  postVerseScript,
  putVerseScript,
} from "@/api/v1/verse-script";
import { v4 as uuidv4 } from "uuid";
import { getVerse, postVerse, Script, VerseData } from "@/api/v1/verse";

const loading = ref(false);
const script = ref<Script>();
const verse = ref<VerseData>();
const route = useRoute();
const id = computed(() => parseInt(route.query.id as string));
const blocklyUrl = import.meta.env.VITE_APP_BLOCKLY_URL;
const ready = ref<boolean>(false);
const saveable = computed(() => script.value !== null && verse.value!.editable);
let map = new Map<string, any>();

const postScript = async (message: any) => {
  if (verse.value === null) {
    ElMessage({
      message: "没有信息",
      type: "error",
    });
    return;
  }
  if (!verse.value!.editable) {
    ElMessage({
      message: "没有编辑权限",
      type: "error",
    });
    return;
  }

  script.value = verse.value!.script!;
  if (!script.value) {
    const response = await postVerseScript({
      meta_id: verse.value!.id,
      data: JSON.stringify(message.data),
      script: message.script,
    });
    verse.value!.script = response.data;
  } else {
    const response = await putVerseScript(script.value.id, {
      data: JSON.stringify(message.data),
      script: message.script,
    });
    verse.value!.script = response.data;
  }

  ElMessage({
    message: "保存成功",
    type: "success",
  });
};

const handleMessage = async (e: MessageEvent) => {
  console.error(e.data);
  const data: any = JSON.parse(e.data);

  if (data.type === "ready") {
    ready.value = true;
    initEditor();
  } else if (data.type === "post") {
    await postScript(data.message);
  } else if (data.type === "post:no-change") {
    ElMessage({
      message: "没有修改",
      type: "info",
    });
    //alert("no");
  }
};

const save = () => {
  postMessage({
    type: "save",
    message: { language: "lua", data: {} },
  });
};

const postMessage = (message: any) => {
  const iframe = document.getElementById("editor") as HTMLIFrameElement;
  iframe.contentWindow?.postMessage(message, "*");
};

const initEditor = () => {
  if (verse.value === null) return;
  if (!ready.value) return;

  const data = verse.value!.script
    ? JSON.parse(verse.value!.script.script)
    : {};
  postMessage({
    type: "init",
    message: {
      language: ["lua", "js"],
      style: ["base", "meta"],
      data: data,
      parameters: {
        index: verse.value!.id,
        // resource: getResource(meta.value),
        resource: resource.value,
      },
    },
  });
};

const resource = computed(() => {
  const inputs: any[] = [];
  const outputs: any[] = [];

  verse.value!.metas!.forEach((meta: any) => {
    let events = JSON.parse(meta.events || "{}");
    events.inputs = events.inputs || [];
    events.outputs = events.outputs || [];

    events.inputs.forEach((input: any) => {
      const data = map.get(meta.id);
      inputs.push({
        title: `${data.title}:${input.title}`,
        index: data.uuid,
        uuid: input.uuid,
      });
    });

    events.outputs.forEach((output: any) => {
      const data = map.get(meta.id);
      outputs.push({
        title: `${data.title}:${output.title}`,
        index: data.uuid,
        uuid: output.uuid,
      });
    });
  });

  return {
    events: { inputs, outputs },
  };
});

// onMounted(async () => {
//   loading.value = true;

//   const response = await getVerse(id.value, "metas, module, share, script");
//   verse.value = response.data;

//   if (!verse.value!.script) {
//     const vresponse = await postVerseScript({
//       verse_id: id.value,
//       title: "script",
//       uuid: uuidv4(),
//     });
//     script.value = vresponse.data;
//   } else {
//     script.value = verse.value!.script;
//   }

//   const data = JSON.parse(verse.value?.data || "{}");
//   if (data?.children?.modules) {
//     data.children.modules.forEach((module: any) => {
//       map.set(module.parameters.meta_id, {
//         uuid: module.parameters.uuid,
//         title: module.parameters.title,
//       });
//     });
//   }

//   loading.value = false;
// });

// onBeforeUnmount(() => {
//   if (saveable.value) {
//     save();
//   }
// });

// const save = () => {
//   if (script.value) {
//     const blockly = script.value.workspace;
//     const code = ""; // 从 blockly 获取生成的代码
//     submit(script.value.id, blockly, code);
//   }
// };

// const submit = async (
//   id: number,
//   blockly: any,
//   code: string,
//   end?: Function
// ) => {
//   const response = await putVerseScript(id, {
//     script: code,
//     workspace: blockly,
//   });
//   script.value = response.data;
//   if (end) end();
// };

onMounted(async () => {
  window.addEventListener("message", handleMessage);

  try {
    loading.value = true;
    const response = await getVerse(id.value, "metas, module, share, script");

    verse.value = response.data;
    initEditor();
  } catch (error: any) {
    ElMessage({
      message: error.message,
      type: "error",
    });
  } finally {
    loading.value = false;
  }
});
</script>
