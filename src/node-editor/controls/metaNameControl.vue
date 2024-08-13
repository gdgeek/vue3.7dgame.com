<template>
  <el-form :inline="true" size="mini">
    <el-form-item class="el-form-item" :inline="true" :label="data.title">
      <el-tag type="success" size="small" @click="changeMetaName()">
        {{ value.name }}
      </el-tag>
    </el-form-item>
  </el-form>
</template>

<script>
import { putMeta } from "@/api/v1/meta";
export default {
  props: ["data", "root", "emitter", "getData", "putData"],
  data() {
    return {
      value: {
        name: "名称",
        id: -1,
      },
    };
  },
  computed: {
    metaName: {
      get() {
        return this.root.metaData.name;
      },
      set(value) {
        this.root.$store.commit("setMetaName", value);
        this.refresh();
      },
    },
  },
  mounted() {
    this.value.name = this.root.metaData.name;
    this.value.id = this.root.metaData.id;
    this.refresh();
  },

  methods: {
    changeMetaName() {
      const id = this.root.metaData.id;
      const self = this;
      this.$prompt("请输入新的名称", "修改【元】名称", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        closeOnClickModal: false,
        inputValue: self.value.name,
      })
        .then(({ value }) => {
          putMeta(id, { name: value }).then(() => {
            this.root.$store.commit("meta/setMetaName", value);
            self.value.name = value;
            this.$message({
              type: "success",
              message: "新的名称是: " + value,
            });
            this.refresh();
          });
        })
        .catch(() => {
          this.$message({
            type: "info",
            message: "取消输入",
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
