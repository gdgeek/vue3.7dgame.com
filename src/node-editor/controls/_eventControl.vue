<template>
  <div>
    <el-form :inline="true" size="mini">
      <el-form-item :inline="true" class="el-form-item" :label="label">
        <el-button-group>
          <el-button :type="style" plain @click="open()">
            编辑
            <i class="el-icon-edit el-icon--right"></i>
          </el-button>
        </el-button-group>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  props: ["data", "root", "emitter", "getData", "putData"],
  data() {
    return {
      metaId: -1,
    };
  },

  computed: {
    style() {
      if (typeof this.data.style !== "undefined") {
        return this.data.style;
      }
      return "primary";
    },
    title() {
      if (typeof this.data.title !== "undefined") {
        return this.data.title;
      }
      return "选择";
    },
    label() {
      if (typeof this.data.label !== "undefined") {
        return this.data.label;
      }
      return "按钮";
    },
  },
  mounted() {
    const self = this;
    this.$on("setId", function (id) {
      self.metaId = id;
    });
  },
  methods: {
    open() {
      // this.root._doMetaEvent(this.metaId)
    },

    click() {
      if (typeof this.data.callback !== "undefined") {
        this.data.callback(this.root);
      }
    },
    refresh() {},
  },
};
</script>
