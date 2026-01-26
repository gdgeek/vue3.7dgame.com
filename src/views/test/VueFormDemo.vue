<template>
  <div class="vue-form-demo-wrapper">
    <VueForm v-model="formData" :schema="schema"> </VueForm>
    <div class="vue-form-demo">
      <h1>VueForm 测试页面</h1>

      <el-card class="demo-card">
        <template #header>
          <span>基础表单示例</span>
        </template>

        <div class="schema-display">
          <h4>当前 Schema：</h4>
          <pre>{{ JSON.stringify(schema, null, 2) }}</pre>
        </div>

        <el-divider></el-divider>

        <div class="form-container">
          <h4>表单：</h4>
          <VueForm
            v-if="schema"
            v-model="formData"
            :schema="schema"
            :form-footer="formFooter"
            @submit="handleSubmit"
            @cancel="handleCancel"
            @change="handleChange"
          ></VueForm>
        </div>

        <el-divider></el-divider>

        <div class="data-display">
          <h4>表单数据：</h4>
          <pre>{{ JSON.stringify(formData, null, 2) }}</pre>
        </div>
      </el-card>

      <el-card class="demo-card" style="margin-top: 20px">
        <template #header>
          <span>切换不同的 Schema</span>
        </template>

        <el-button-group>
          <el-button type="primary" @click="useSchema1"
            >Schema 1: 粒子</el-button
          >
          <el-button type="success" @click="useSchema2"
            >Schema 2: 用户信息</el-button
          >
          <el-button type="warning" @click="useSchema3"
            >Schema 3: 物品配置</el-button
          >
          <el-button type="danger" @click="useSchema4"
            >Schema 4: 综合测试</el-button
          >
        </el-button-group>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import VueForm from "@/components/JsonSchemaForm/index.vue";
import { ref, computed, nextTick, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const formData = ref<Record<string, any>>({});

// 示例 Schema 1: 粒子类型
const schema1 = {
  type: "object",
  required: ["type", "index"],
  properties: {
    type: {
      type: "string",
      title: "类型",
      default: "particle",
      "ui:hidden": true,
    },
    index: {
      type: "string",
      title: "索引",
      default: "normal",
    },
  },
};

// 示例 Schema 2: 用户信息
const schema2 = {
  type: "object",
  required: ["name", "age"],
  properties: {
    name: {
      type: "string",
      title: "姓名",
      default: "",
      "ui:options": {
        placeholder: "请输入姓名",
      },
    },
    age: {
      type: "integer",
      title: "年龄",
      default: 18,
      minimum: 0,
      maximum: 150,
    },
    email: {
      type: "string",
      title: "邮箱",
      format: "email",
      "ui:options": {
        placeholder: "请输入邮箱",
      },
    },
    bio: {
      type: "string",
      title: "简介",
      "ui:options": {
        type: "textarea",
        rows: 3,
        placeholder: "请输入个人简介",
      },
    },
  },
};

// 示例 Schema 3: 物品配置
const schema3 = {
  type: "object",
  required: ["type", "name"],
  properties: {
    type: {
      type: "string",
      title: "类型",
      default: "star",
      "ui:hidden": true,
    },
    name: {
      type: "string",
      title: "物品名称",
      default: "normal",
    },
    count: {
      type: "integer",
      title: "数量",
      default: 1,
      minimum: 1,
    },
    enabled: {
      type: "boolean",
      title: "是否启用",
      default: true,
    },
    category: {
      type: "string",
      title: "分类",
      enum: ["武器", "防具", "道具", "材料"],
      "ui:widget": "SelectWidget",
    },
  },
};

// 示例 Schema 4: 综合测试 (数组, 日期, 颜色)
const schema4 = {
  type: "object",
  title: "综合测试",
  properties: {
    tags: {
      type: "array",
      title: "标签列表 (String Array)",
      items: {
        type: "string",
        title: "标签",
      },
    },
    users: {
      type: "array",
      title: "用户列表 (Object Array)",
      items: {
        type: "object",
        properties: {
          name: { type: "string", title: "姓名" },
          age: { type: "integer", title: "年龄" },
        },
      },
    },
    birthDate: {
      type: "string",
      title: "出生日期 (Date)",
      format: "date",
    },
    meetingTime: {
      type: "string",
      title: "会议时间 (DateTime)",
      format: "date-time",
    },
    themeColor: {
      type: "string",
      title: "主题颜色 (Color)",
      format: "color",
      default: "#409EFF",
    },
  },
};

const schema = ref<any>(schema1);

const formFooter = computed(() => ({
  show: true,
  okBtn: "保存",
  cancelBtn: "取消",
}));

const useSchema1 = () => {
  formData.value = {};
  schema.value = null;
  nextTick(() => {
    schema.value = schema1;
  });
};

const useSchema2 = () => {
  formData.value = {};
  schema.value = null;
  nextTick(() => {
    schema.value = schema2;
  });
};

const useSchema3 = () => {
  formData.value = {};
  schema.value = null;
  nextTick(() => {
    schema.value = schema3;
  });
};

const useSchema4 = () => {
  formData.value = {};
  schema.value = null;
  nextTick(() => {
    schema.value = schema4;
  });
};

const handleSubmit = () => {
  ElMessage.success("表单提交成功！");
  console.log("提交的数据：", formData.value);
};

const handleCancel = () => {
  ElMessage.warning("取消操作");
};

const handleChange = ({
  oldValue,
  newValue,
}: {
  oldValue: any;
  newValue: any;
}) => {
  console.log("数据变化：", { oldValue, newValue });
};
</script>

<style scoped>
.vue-form-demo {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.demo-card {
  margin-bottom: 20px;
}

.schema-display,
.data-display {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
}

.schema-display pre,
.data-display pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
}

.form-container {
  padding: 10px 0;
}

h4 {
  margin: 0 0 10px 0;
  color: #666;
}
</style>
