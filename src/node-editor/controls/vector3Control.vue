<template>
  <div>
    <el-form size="mini" :inline="true">
      <el-form-item class="tranform-item" :label="data.title">
        <input
          v-model.number="x"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-left"
          style="width: 45px; display: inline"
          placeholder="x"
        />
        <input
          v-model.number="y"
          step="0.01"
          :readonly="data.readonly"
          type="number"
          class="input-min"
          style="width: 45px; display: inline"
          placeholder="y"
        />
        <input
          v-model.number="z"
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
        x: 0,
        y: 0,
        z: 0,
      },
    };
  },
  computed: {
    x: {
      get() {
        return this.value_.x;
      },
      set(value) {
        this.value_.x = value;
        console.log(this.value_);
        this.refresh();
      },
    },
    y: {
      get() {
        return this.value_.y;
      },
      set(value) {
        this.value_.y = value;
        console.log(this.value_);
        this.refresh();
      },
    },
    z: {
      get() {
        return this.value_.z;
      },
      set(value) {
        this.value_.z = value;
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
