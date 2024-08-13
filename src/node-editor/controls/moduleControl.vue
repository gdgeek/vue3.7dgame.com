<template>
  <div>
    <el-form :hidden="hidden" :inline="true" size="mini">
      <el-form-item
        v-if="item"
        class="el-form-item"
        :inline="true"
        :label="data.title"
      >
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
            <el-tag @click="setup()">【{{ title }}】</el-tag>
          </template>
        </el-popover>
        <el-button size="small" @click="edit()" v-if="custom"> 编辑 </el-button>
        <el-button size="small" @click="input()" v-else> 输入 </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { convertToHttps } from "@/assets/js/helper";
import { getMeta } from "@/api/v1/meta";
export default {
  props: ["data", "emitter", "root", "getData", "putData", "node"],

  data() {
    return {
      id: null,
      value: null,
      item: null,
    };
  },
  computed: {
    custom() {
      return this.item.custom != 0;
    },
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
      if (this.item === null || this.item.image === null) {
        return null;
      }
      return convertToHttps(this.item.image.url);
    },
  },
  async mounted() {
    const value = this.getData(this.data.key);
    if (typeof value !== "undefined") {
      this.value = value;
    } else if (typeof this.data.default !== "undefined") {
      this.value = this.data.default;
    }

    this.$on("setId", function (id) {
      this.id = id;
    });
    this.refresh();
  },

  methods: {
    setup() {
      this.root.$router.push({
        path: "/knight/edit",
        query: {
          id: this.value,
        },
      });
    },
    edit() {
      this.root.$router.push({
        path: "/meta/scene",
        query: {
          id: this.value,
        },
      });
    },
    input() {
      let data = {};
      try {
        data = JSON.parse(this.getData("data"));
      } catch {
        data = {};
      }

      this.root.metaForm({
        schema: JSON.parse(this.item.data),
        data: data,
        callback: (data) => {
          this.node.controls.get("data").setValue(JSON.stringify(data));
        },
      });
    },
    refresh() {
      if (this.value !== null) {
        getMeta(this.value, {
          expand: "image, author",
        }).then((response) => {
          this.item = response.data;
          console.error("this.item");
          console.error(this.item);
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
