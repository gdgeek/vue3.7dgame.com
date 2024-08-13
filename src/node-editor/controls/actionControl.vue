<template>
  <el-form :inline="true" size="mini">
    <el-form-item class="el-form-item" :inline="true" :label="data.title">
      <el-input v-model="value" :readonly="data.readonly"></el-input>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  props: ["data", "root", "emitter", "getData", "putData"],

  data() {
    return {
      value_: "",
    };
  },
  computed: {
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
