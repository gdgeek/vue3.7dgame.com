<template>
  <div>
    <el-form :inline="true" size="mini">
      <el-form-item :inline="true" class="el-form-item" :label="label">
        <el-button :type="style" plain @click="click">{{ title }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  props: ["data", "root", "emitter", "getData", "putData"],

  computed: {
    style() {
      if (typeof this.data.style !== "undefined") {
        return this.data.style;
      }
      return "primary";
    },
    title() {
      if (typeof this.data.title !== "undefined") {
        return this.data.title;
      }
      return "选择";
    },
    label() {
      if (typeof this.data.label !== "undefined") {
        return this.data.label;
      }
      return "按钮";
    },
  },
  methods: {
    click() {
      if (typeof this.data.callback !== "undefined") {
        this.data.callback(this.root);
      }
    },
    refresh() {},
  },
};
</script>
