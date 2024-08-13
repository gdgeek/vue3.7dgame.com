<template>
  <el-form :inline="true" size="mini" label-width="40px">
    <el-form-item :inline="true" class="el-form-item" :label="data.title">
      <el-select v-model="value" placeholder="请选择">
        <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value"></el-option>
      </el-select>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  props: ["data", "root", "emitter", "getData", "putData"],

  data() {
    return {
      options: [],
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
  watch: {
    "root.$store.state.resource.videoList": function () {
      this.setList(this.root.$store.state.resource.videoList);
    },
  },
  mounted() {
    this.setList(this.root.$store.state.resource.videoList);
    const value = this.getData(this.data.key);
    if (typeof value !== "undefined") {
      this.value = value;
    }
  },
  methods: {
    setList(list) {
      const self = this;
      this.options = [];
      list.forEach((item) => {
        self.options.push({
          value: item.id,
          label: item.name,
        });
      });
    },
    refresh() {
      if (this.data) {
        this.putData(this.data.key, this.value);
      }
      this.emitter.trigger("process", { status: "node" });
    },
  },
};
</script>
