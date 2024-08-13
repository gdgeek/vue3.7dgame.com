<template>
  <el-form :hidden="hidden" :inline="true" size="mini">
    <el-form-item class="el-form-item" :inline="true" :label="data.title">
      <el-popover
        placement="top-start"
        :title="title"
        width="200"
        trigger="hover"
      >
        <el-image
          style="width: 100px; height: 100px"
          :src="image"
          fit="contain"
        ></el-image>
        <template #reference>
          <el-tag>{{ title }}</el-tag>
        </template>
      </el-popover>
    </el-form-item>
  </el-form>
</template>

<script>
import { getMeta } from "@/api/v1/meta";
export default {
  props: ["data", "emitter", "root", "getData", "putData"],

  data() {
    return {
      value: null,
      item: null,
    };
  },
  computed: {
    hidden() {
      if (typeof this.data.hidden !== "undefined" && this.data.hidden) {
        return true;
      }
      return false;
    },
    title() {
      if (this.item === null) {
        return "{空}";
      }
      return this.item.title;
    },
    image() {
      if (this.item === null) {
        return "{空}";
      }
      return this.item.image.url;
    },
  },
  async mounted() {
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
      if (this.value !== null) {
        getMeta(this.value, {
          expand: "image,author",
        }).then((response) => {
          this.item = response.data;
        });
      }
      if (this.data) {
        this.putData(this.data.key, this.value);
      }
      this.emitter.trigger("process", { status: "node" });
    },
  },
};
</script>

<style lang="scss" scoped></style>
