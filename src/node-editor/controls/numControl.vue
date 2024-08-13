<template>
  <el-form :hidden="hidden" :inline="true" size="mini">
    <el-form-item class="el-form-item" :inline="true" :label="data.title">
      <el-input
        v-model="value"
        step="0.01"
        type="number"
        :readonly="data.readonly"
      ></el-input>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  props: ["data", "emitter", "root", "getData", "putData"],

  data() {
    return {
      value_: 0,
    };
  },
  computed: {
    value: {
      get() {
        return parseFloat(this.value_);
      },
      set(value) {
        this.value_ = value;
        this.refresh();
      },
    },
    hidden() {
      if (typeof this.data.hidden !== "undefined" && this.data.hidden) {
        return true;
      }
      return false;
    },
  },
  mounted() {
    const value = this.getData(this.data.key);
    if (typeof value !== "undefined") {
      this.value = value;
    } else if (typeof this.data.default !== "undefined") {
      this.value = this.data.default;
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

<style lang="scss" scoped></style>
