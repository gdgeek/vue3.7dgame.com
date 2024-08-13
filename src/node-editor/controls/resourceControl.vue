<template>
  <div>
    <el-form :inline="true" ref="value" size="mini">
      <el-form-item :inline="true" class="el-form-item" :label="data.title">
        <div v-if="value_ === null">
          <el-button @click="select()" size="mini">未指派2</el-button>
        </div>
        <div v-else>
          <div v-if="item === null">
            <i>载入中</i>
          </div>
          <div v-else>
            <el-popover
              placement="top-start"
              :title="'标题:' + item.name"
              width="200"
              trigger="hover"
            >
              <el-image
                v-if="item.image"
                style="width: 100px; height: 100px"
                :src="item.image.url"
                fit="contain"
              ></el-image>
              <template #reference>
                <el-button-group>
                  <el-button type="primary" plain @click="select()" size="mini">
                    <b class="card-title" nowrap>{{ item.name }}</b>
                  </el-button>
                </el-button-group>
              </template>
            </el-popover>
          </div>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { getResource } from "@/api/resources";
export default {
  props: ["data", "root", "emitter", "getData", "putData"],

  data() {
    return {
      item: null,
      id: null,
      value_: null,
    };
  },
  computed: {
    value: {
      get() {
        return this.value_;
      },
      set(value) {
        if (this.value_ != value) {
          this.value_ = value;
          this.refresh();
        }
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
    self.reload();
  },
  methods: {
    select() {
      this.root.openResources({
        value: this.value,
        callback: this.onResource,
        type: this.data.resource,
      });
    },

    onResource(data) {
      if (data === null) {
        this.value = null;
        this.item = null;
      } else {
        this.value = data.id;
        this.item = data;
      }
      this.reload();
    },
    async reload() {
      const self = this;
      if (
        this.value !== null &&
        (this.item === null || this.value != this.item.id)
      ) {
        try {
          const response = await getResource(self.data.resource, self.value);
          if (response.data !== null) {
            self.item = response.data;
          }
        } catch (e) {
          alert(e.message);
        }
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
<style scoped>
.card-title {
  white-space: nowrap;
  display: block;
  width: 128px;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
