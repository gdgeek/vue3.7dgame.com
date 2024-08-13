<template>
  <div>
    <el-form :inline="false" size="mini">
      <el-form-item :inline="true" class="el-form-item" :label="data.title">
        <el-select v-model="value" placeholder="请选择">
          <el-option
            v-for="item in data.options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
            <span style="float: right; color: #8492a6; font-size: 10px">
              {{ item.label }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </div>
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
