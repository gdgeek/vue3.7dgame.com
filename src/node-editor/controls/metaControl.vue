<template>
  <div>
    <el-form :inline="true" size="mini">
      <el-form-item :inline="true" label="操作">
        <el-button type="success" plain :disabled="id === -1" @click="editor()">
          进入编辑
        </el-button>
      </el-form-item>
    </el-form>
    <el-form :inline="true" size="mini">
      <el-form-item class="el-form-item" :inline="true" :label="data.title">
        <el-input v-model="value" :readonly="data.readonly"></el-input>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  props: ["data", "root", "emitter", "getData", "putData"],

  data() {
    return {
      title: "",
      id: -1,
    };
  },
  computed: {
    value: {
      get() {
        return this.title;
      },
      set(value) {
        this.title = value;
        this.refresh();
      },
    },
  },
  mounted() {
    const self = this;
    const value = this.getData(this.data.key);
    if (typeof value !== "undefined") {
      this.value = value;
    } else if (typeof this.data.default !== "undefined") {
      this.value = this.data.default;
    }
    this.refresh();

    this.$on("setId", function (id) {
      self.id = id;
    });
  },
  methods: {
    editor() {
      this.root.$router.push({
        path: "/meta/rete-meta",
        query: { id: this.id, title: this.title },
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
