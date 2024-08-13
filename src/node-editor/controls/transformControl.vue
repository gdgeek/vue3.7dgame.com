<template>
  <div>
    <el-form :hidden="hidden" size="mini" :inline="true">
      <el-form-item class="tranform-item" label="位置">
        <input
          v-model.number="position_x"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-left"
          style="width: 45px; display: inline"
          placeholder="x"
        />
        <input
          v-model.number="position_y"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-min"
          style="width: 45px; display: inline"
          placeholder="y"
        />
        <input
          v-model.number="position_z"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-right"
          style="width: 45px; display: inline"
          placeholder="z"
        />
      </el-form-item>
      <br />
      <el-form-item class="tranform-item" label="旋转">
        <input
          v-model.number="rotate_x"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-left"
          style="width: 45px; display: inline"
          placeholder="x"
        />
        <input
          v-model.number="rotate_y"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-min"
          style="width: 45px; display: inline"
          placeholder="y"
        />
        <input
          v-model.number="rotate_z"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-right"
          style="width: 45px; display: inline"
          placeholder="z"
        />
      </el-form-item>

      <br />
      <el-form-item class="tranform-item" label="缩放">
        <input
          v-model.number="scale_x"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-left"
          style="width: 45px; display: inline"
          placeholder="x"
        />
        <input
          v-model.number="scale_y"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-min"
          style="width: 45px; display: inline"
          placeholder="y"
        />
        <input
          v-model.number="scale_z"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-right"
          style="width: 45px; display: inline"
          placeholder="z"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  props: ["data", "root", "emitter", "getData", "putData"],

  data() {
    return {
      value_: {
        position: { x: 0, y: 0, z: 0 },
        rotate: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    };
  },
  computed: {
    hidden() {
      if (typeof this.data.hidden !== "undefined" && this.data.hidden) {
        return true;
      }
      return false;
    },
    position_x: {
      get() {
        return this.value_.position.x;
      },
      set(value) {
        this.value_.position.x = value;
        console.log(this.value_);
      },
    },
    position_y: {
      get() {
        return this.value_.position.y;
      },
      set(value) {
        this.value_.position.y = value;
        console.log(this.value_);
        this.refresh();
      },
    },
    position_z: {
      get() {
        return this.value_.position.z;
      },
      set(value) {
        this.value_.position.z = value;
        console.log(this.value_);
        this.refresh();
      },
    },
    rotate_x: {
      get() {
        return this.value_.rotate.x;
      },
      set(value) {
        this.value_.rotate.x = value;
        console.log(this.value_);
        this.refresh();
      },
    },
    rotate_y: {
      get() {
        return this.value_.rotate.y;
      },
      set(value) {
        this.value_.rotate.y = value;
        console.log(this.value_);
        this.refresh();
      },
    },
    rotate_z: {
      get() {
        return this.value_.rotate.z;
      },
      set(value) {
        this.value_.rotate.z = value;
        console.log(this.value_);
        this.refresh();
      },
    },

    scale_x: {
      get() {
        return this.value_.scale.x;
      },
      set(value) {
        this.value_.scale.x = value;
        console.log(this.value_);
        this.refresh();
      },
    },
    scale_y: {
      get() {
        return this.value_.scale.y;
      },
      set(value) {
        this.value_.scale.y = value;
        console.log(this.value_);
        this.refresh();
      },
    },
    scale_z: {
      get() {
        return this.value_.scale.z;
      },
      set(value) {
        this.value_.scale.z = value;
        console.log(this.value_);
        this.refresh();
      },
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

<style lang="scss" scoped>
.input-left {
  border: solid 1px;
  border-color: darkgray;
  border-top-left-radius: 3px;
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
  border-bottom-left-radius: 3px;
  color: #666;
  font-size: 12px;
  padding: 0px;
  text-align: center;
}

.input-right {
  border: solid 1px;
  border-color: darkgray;
  border-top-left-radius: 0px;
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  border-bottom-left-radius: 0px;
  color: #666;
  font-size: 12px;
  padding: 0px;
  text-align: center;
}

.input-min {
  border: solid 1px;
  border-color: darkgray;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
  border-bottom-left-radius: 0px;
  color: #666;
  font-size: 12px;
  padding: 0px;
  text-align: center;
}

.input-with-select .el-input-group__prepend {
  background-color: #fff;
}

.tranform-item {
  max-height: 0px;
  max-height: 20px;
}
</style>
