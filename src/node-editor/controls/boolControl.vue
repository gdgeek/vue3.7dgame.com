<template>
  <el-form :hidden="hidden" size="mini" :inline="true">
    <el-form-item :inline="true" class="tranform-item" :label="data.title">
      <el-checkbox
        v-model="value"
        size="mini"
        label="是否打开"
        border
      ></el-checkbox>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  props: ["data", "emitter", "root", "getData", "putData"],

  data() {
    return {
      value_: true,
    };
  },
  computed: {
    hidden() {
      if (typeof this.data.hidden !== "undefined" && this.data.hidden) {
        return true;
      }
      return false;
    },
    value: {
      get() {
        return this.value_;
      },
      set(value) {
        this.value_ = value;
        this.refresh();
      },
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

<style></style>
