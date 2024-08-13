<template>
  <el-form :hidden="true" :inline="true" size="mini">
    <el-form-item class="el-form-item" :inline="true" :label="'UUID'">
      <el-input v-model="value" :readonly="true"></el-input>
    </el-form-item>
  </el-form>
</template>
<script>
import { v4 as uuidv4 } from "uuid";
export default {
  props: ["data", "root", "emitter", "getData", "putData"],
  data() {
    return {
      value: uuidv4(),
    };
  },
  mounted() {
    const value = this.getData(this.data.key);
    if (typeof value !== "undefined") {
      this.value = value;
    }
    this.refresh();
  },
  methods: {
    refresh() {
      if (this.data) {
        this.putData(this.data.key, this.value);
      }
      this.emitter.trigger("process", { status: "node" });
    },
  },
};
</script>
