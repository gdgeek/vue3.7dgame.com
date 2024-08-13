<template>
  <div>
    <el-form :inline="true" ref="value" size="mini">
      <el-form-item :inline="true" class="el-form-item" label="场景">
        <div v-if="id === -1">
          <el-button @click="select()" size="mini">未指派</el-button>
          <el-button
            @click="click()"
            size="mini"
            icon="el-icon-edit"
          ></el-button>
        </div>
        <div v-else>
          <div v-if="item === null">
            <i>载入中{{ id }}</i>
          </div>
          <div v-else>
            <el-popover
              placement="top-start"
              :title="'场景:' + item.title"
              width="200"
              trigger="hover"
            >
              <el-image
                style="width: 100px; height: 100px"
                :src="item.image.url"
                fit="contain"
              ></el-image>
              <el-checkbox v-model="occlusion" border>模型遮挡</el-checkbox>
              <template #reference>
                <el-button-group>
                  <el-button type="primary" plain @click="select()" size="mini">
                    {{ id }}:{{ item.title }}
                  </el-button>

                  <el-button
                    @click="click()"
                    size="mini"
                    icon="el-icon-edit"
                  ></el-button>
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
import { getSpace } from "@/api/v1/space";
export default {
  props: ["data", "root", "emitter", "getData", "putData"],

  data() {
    return {
      item: null,
      id_: -1,
      occlusion_: false,
    };
  },
  computed: {
    occlusion: {
      get() {
        return this.occlusion_;
      },
      set(value) {
        this.occlusion_ = value;
        this.refresh();
      },
    },

    id: {
      get() {
        return this.id_;
      },
      set(value) {
        this.id_ = value;
        this.reload();
        this.refresh();
      },
    },
    value: {
      get() {
        return { id: this.id_, occlusion: this.occlusion_ };
      },
      set(value) {
        if (this.id_ != value.id) {
          this.id_ = value.id;
          this.reload();
        }
        this.occlusion_ = value.occlusion;

        this.refresh();
      },
    },
  },
  mounted() {
    const value = this.getData(this.data.key);

    if (typeof value === "object") {
      this.value = value;
    } else if (typeof this.data.default !== "undefined") {
      this.value = this.data.default;
    } else {
      this.refresh();
    }
  },
  methods: {
    click() {
      this.root.$router.push({
        path: "/verse/scene",
        query: { id: this.root.$route.query.id },
      });
    },
    select() {
      this.root.openSpace({ value: this.value, callback: this.onSpace }); //$store.commit('spaceCallback', this.onSpace)
    },

    onSpace(data) {
      if (data === null) {
        this.id = -1;
        this.item = null;
      } else {
        this.id = data.id;
        this.item = data;
      }
      this.refresh();
    },
    reload() {
      const self = this;
      if (
        self.value.id !== -1 &&
        (this.item === null || this.value.id != this.item.id)
      ) {
        getSpace(self.value.id, {
          expand: "author,image",
        }).then((response) => {
          if (response.data !== null) {
            self.item = response.data;
          }
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
