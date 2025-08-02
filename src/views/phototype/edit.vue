<template>
  <div>
    <br>
    <el-row :gutter="20" style="margin: 0px 18px 0">
      <el-col :sm="16">
        <el-card class="box-card">
          <template #header>
            <b id="title">{{ $t("polygen.view.title") }}</b>
            <span v-if="polygenData">{{ polygenData.name }}</span>
          </template>

          <json-schema-editor class="schema" :value="tree" disabledType lang="zh_CN" custom :extra="extraSetting" />

        </el-card>
        <br />

        <br />


      </el-col>

      <el-col :sm="8">

        <el-card class="box-card" style="min-height: 500px">
          <codemirror v-model="importJson" :readOnly="false" />
        </el-card>

      </el-col>
    </el-row>
  </div>




</template>

<script>

import Codemirror from "@/components/Codemirror.vue";
import GenerateSchema from "generate-schema";
export default {
  name: "App",
  components: { Codemirror },
  computed: {
    jsonStr: {
      get: function () {
        return JSON.stringify(this.tree, null, 2);
      },
      set: function (newVal) {
        this.tree = JSON.parse(newVal);
      },
    },
  },

  data() {
    return {
      importJson: "aaa",
      visible: false,
      extraSetting: {
        integer: {
          default: {
            name: "默认值",
            type: "integer",
          },
        },
        string: {
          default: {
            name: "默认值",
            type: "integer",
          },
        },
      },
      tree: {
        root: {
          type: "object",
          title: "条件",
          properties: {
            name: {
              type: "string",
              title: "名称",
              maxLength: 10,
              minLength: 2,
            },
            appId: {
              type: "integer",
              title: "应用ID",
              default: 3,
            },
            credate: {
              type: "string",
              title: "创建日期",
              format: "date",
            },
          },
          required: ["name", "appId", "credate"],
        },
      },
    };
  },
  methods: {
    handleImportJson() {
      const t = GenerateSchema.json(JSON.parse(this.importJson));
      delete t.$schema;
      this.tree.root = t;
      this.visible = false;
    },
  },
};
</script>
<style>
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

.title {
  text-align: center;
  font-size: 40px;
  font-weight: bold;
  height: 100px;
  line-height: 100px;
}

.version {
  font-size: 16px;
}

.desc {
  padding: 20px;
  width: 80vw;
  min-width: 800px;
  margin: auto;
  padding: 0 3em;
  font-size: 1.2em;
}

.container {
  display: flex;
  padding: 20px;
  width: 80vw;
  min-width: 800px;
  justify-content: center;
  height: calc(100vh - 150px);
  margin: auto;
}

.code-container {
  max-height: 600px;
  overflow: auto;
}

.schema {
  margin-left: 0px;
  margin-right: 10px;
  width: 100%;
  height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.CodeMirror {
  height: 100% !important;
}

.vue-codemirror {
  flex: 1;
  margin: 0 24px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  min-height: 300px;
  overflow: auto;
  border-radius: 6px;
}
</style>
