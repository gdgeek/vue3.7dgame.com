<template>
  <el-form :inline="true" size="mini">
    <el-form-item class="el-form-item" :inline="true" label="名称">
      <el-tag size="small" v-if="root.saveable" @click="changeVerseName()">
        {{ value.name }}
      </el-tag>
      <el-tag size="small" v-else>
        {{ value.name }}
      </el-tag>
    </el-form-item>
  </el-form>
</template>

<script>
import { putVerse } from "@/api/v1/verse";
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
    verseName: {
      get() {
        return this.root.verse.name;
      },
      set(value) {
        this.root._setVerseName(value);
        this.refresh();
      },
    },
  },
  mounted() {
    this.value.name = this.root.verse.name;
    this.value.id = this.root.verse.id;
    this.refresh();
  },

  methods: {
    async changeVerseName() {
      const id = this.root.verse.id;
      const self = this;
      try {
        const input = await this.$prompt("请输入新的名称", "修改【宇宙】名称", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          closeOnClickModal: false,
          inputValue: self.value.name,
        });

        await putVerse(id, { name: input.value });
        self.value.name = r.value;
        this.root._setVerseName(r.value);
        this.$message({
          type: "success",
          message: "新的名称是: " + r.value,
        });
        this.refresh();
      } catch (e) {
        console.error(e);
        this.$message({
          type: "info",
          message: "取消输入",
        });
      }
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
