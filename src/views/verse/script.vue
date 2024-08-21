<template>
  <div class="script">
    <el-container>
      <el-main>
        <el-card :loading="loading" class="box-card">
          <template #header>
            <div v-if="script && verse" class="clearfix">
              {{ verse.name }} / {{ script.title }} / 【脚本】

              <el-button-group style="float: right">
                <el-button
                  v-if="saveable"
                  type="primary"
                  size="mini"
                  @click="save"
                >
                  <font-awesome-icon icon="save"></font-awesome-icon>
                  保存脚本
                </el-button>
              </el-button-group>
            </div>
          </template>
          <blockly-script
            v-if="script !== null && verse !== null"
            ref="blockly"
            :blockly="script.workspace"
            :resource="resource"
            :id="script.id"
            @submit="submit"
          ></blockly-script>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import BlocklyScript from "@/components/Script.vue";
import {
  getVerseScript,
  postVerseScript,
  putVerseScript,
} from "@/api/v1/verse-script";
import { v4 as uuidv4 } from "uuid";
import { AbilityEditable } from "@/ability/ability";
import { getVerse, postVerse, VerseData } from "@/api/v1/verse";

const loading = ref(false);
const script = ref<any>(null);
const verse = ref<any>();
const titles = ref(new Map<string, string>());
const route = useRoute();

const id = computed(() => parseInt(route.query.id as string));
const resource = computed(() => {
  const inputs: any[] = [];
  const outputs: any[] = [];

  verse.value!.metas.forEach((meta: any) => {
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

const saveable = computed(() => script.value !== null && verse.value!.editable);

let map = new Map<string, any>();

onMounted(async () => {
  loading.value = true;

  const response = await getVerse(id.value, "metas, module, share, script");
  verse.value = response.data;

  if (!verse.value!.script) {
    const vresponse = await postVerseScript({
      verse_id: id.value,
      title: "script",
      uuid: uuidv4(),
    });
    script.value = vresponse.data;
  } else {
    script.value = verse.value!.script;
  }

  const data = JSON.parse(verse.value!.data!);
  data.children.modules.forEach((module: any) => {
    map.set(module.parameters.meta_id, {
      uuid: module.parameters.uuid,
      title: module.parameters.title,
    });
  });

  loading.value = false;
});

onBeforeUnmount(() => {
  if (saveable.value) {
    save();
  }
});

const save = () => {
  if (script.value) {
    const blockly = script.value.workspace;
    const code = ""; // 从 blockly 获取生成的代码
    submit(script.value.id, blockly, code);
  }
};

const submit = async (
  id: number,
  blockly: any,
  code: string,
  end?: Function
) => {
  const response = await putVerseScript(id, {
    script: code,
    workspace: blockly,
  });
  script.value = response.data;
  if (end) end();
};
</script>
