<template>
  <el-form :inline="true" size="mini" label-width="40px">
    <el-form-item :inline="true" class="el-form-item" :label="data.title">
      <el-select v-model="value" placeholder="请选择">
        <template #prefix>
          <font-awesome-icon
            :icon="['fas', value]"
            style="color: #55f"
          ></font-awesome-icon>
        </template>
        <el-option
          v-for="item in options"
          :key="item.value"
          :value="item.key"
          :label="item.key"
        >
          <span style="float: left">
            <font-awesome-icon :icon="item.key"></font-awesome-icon>
          </span>
          <span style="float: right; color: #8492a6; font-size: 13px">
            {{ item.key }}
          </span>
        </el-option>
      </el-select>
    </el-form-item>
  </el-form>
</template>

<script>
import font from "@/assets/js/fontok";
// import outfont from '@/assets/js/outfont'
export default {
  props: ["data", "root", "emitter", "getData", "putData"],
  data() {
    return {
      value_: "book",
    };
  },
  computed: {
    options() {
      return font;
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
