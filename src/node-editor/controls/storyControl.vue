<template>
  <el-form :inline="true" size="mini">
    <el-form-item class="el-form-item" :inline="true" label="故事">
      <el-switch
        v-model="content.contactor"
        active-color="#13ce66"
        inactive-color="#ff4949"
      ></el-switch>

      <el-timeline v-if="content.contactor">
        <div v-if="scripts">
          <el-timeline-item
            v-for="data in scripts"
            :key="data.id"
            :timestamp="data.title"
            placement="top"
          >
            <el-button-group>
              <el-button
                size="mini"
                icon="el-icon-edit"
                @click="editScript(data)"
              ></el-button>
              <el-button
                size="mini"
                icon="el-icon-edit-outline"
                @click="enterScript(data)"
              ></el-button>
              <el-button
                size="mini"
                @click="up(data.id)"
                icon="el-icon-arrow-up"
              ></el-button>
              <el-button
                size="mini"
                @click="down(data.id)"
                icon="el-icon-arrow-down"
              ></el-button>
              <el-button
                size="mini"
                icon="el-icon-delete"
                @click="del(data.id)"
              ></el-button>
            </el-button-group>
          </el-timeline-item>
        </div>
        <el-button
          type="success"
          icon="el-icon-plus"
          size="mini"
          @click="addScript"
        >
          增加脚本
        </el-button>
      </el-timeline>
    </el-form-item>
  </el-form>
</template>

<script>
import {
  getVerseScripts,
  postVerseScript,
  delVerseScripts,
  putVerseScript,
} from "@/api/v1/verse-script";

import { v4 as uuidv4 } from "uuid";
export default {
  props: ["data", "root", "emitter", "getData", "putData"],

  data() {
    return {
      id: this.root.$route.query.id,
      scripts: [],
      content: {
        sorted: [],
        contactor: false,
      },
    };
  },
  computed: {
    value: {
      get() {
        return JSON.stringify(this.content);
      },
    },
  },
  watch: {
    content: {
      handler(val) {
        if (this.data) {
          this.putData(this.data.key, JSON.stringify(val));
        }
        this.emitter.trigger("process", { status: "node" });
      },
      deep: true,
    },
  },
  async mounted() {
    const val = this.getData(this.data.key);

    //alert(JSON.stringify(val))
    if (typeof val !== "undefined") {
      this.content = JSON.parse(val);
    } else if (typeof this.data.default !== "undefined") {
      this.content = JSON.parse(this.data.default);
    }
    await this.refresh();
  },
  methods: {
    async enterScript(item) {
      this.root.$router.push({
        path: "/verse/verse-script",
        query: {
          id: item.id,
        },
      });
    },
    async editScript(item) {
      try {
        const input = await this.$prompt("请输入脚本新名称", "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          closeOnClickModal: false,
          inputPattern: /^.{2,10}$/,
          inputValue: item.title,
          inputErrorMessage: "请输入2-10个字符",
        });
        const response = await putVerseScript(item.id, {
          title: input.value,
        });

        await this.refresh();
        this.$message({
          type: "success",
          message: "修改成功!",
        });
      } catch (e) {
        console.error(e);
        this.$message({
          type: "info",
          message: "取消输入",
        });
      }
    },
    async addScript() {
      try {
        const input = await this.$prompt("请输入脚本名称", "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          closeOnClickModal: false,
          inputPattern: /^.{2,10}$/,

          inputErrorMessage: "请输入2-10个字符",
        });
        const response = await postVerseScript({
          verse_id: this.id,
          title: input.value,
          uuid: uuidv4(),
        });

        await this.refresh();
        this.$message({
          type: "success",
          message: "添加成功!",
        });
      } catch (e) {
        console.error(e);
        this.$message({
          type: "info",
          message: "取消输入",
        });
      }
    },
    moveElementForward(arr, value) {
      let index = arr.indexOf(value);
      if (index > 0) {
        // 如果元素不在数组第一位
        // 交换元素至前一位置
        let temp = arr[index - 1];
        arr[index - 1] = arr[index];
        arr[index] = temp;
      }
      return arr;
    },
    moveElementBackward(arr, value) {
      let index = arr.indexOf(value);
      if (index < arr.length - 1) {
        // 如果元素不在数组最后一位
        // 交换元素至后一位置
        let temp = arr[index + 1];
        arr[index + 1] = arr[index];
        arr[index] = temp;
      }
      return arr;
    },
    async up(id) {
      this.content = {
        contactor: this.content.contactor,
        sorted: this.moveElementForward(this.content.sorted, id),
      };
      //  this.content.sorted = this.moveElementForward(this.content.sorted, id)
      this.refresh();
    },
    async down(id) {
      this.content = {
        contactor: this.content.contactor,
        sorted: this.moveElementBackward(this.content.sorted, id),
      };
      this.refresh();
    },
    async del(id) {
      try {
        await this.$confirm("此操作将永久删除该脚本, 是否继续?", "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
        });
        const response = await delVerseScripts(id);

        await this.refresh();
        this.$message({
          type: "success",
          message: "删除成功!",
        });
      } catch (e) {
        this.$message({
          type: "info",
          message: "已取消删除",
        });
      }
    },
    async refresh() {
      const response = await getVerseScripts(this.root.$route.query.id);
      // this.content.sorted = [46, 46, 48, 49]
      const map = new Map();
      response.data.forEach((item) => {
        if (!this.content.sorted.includes(item.id)) {
          this.content.sorted.push(item.id);
        }
        map[item.id] = item;
      });
      this.scripts = [];
      this.content.sorted.forEach((index) => {
        if (map.hasOwnProperty(index)) {
          this.scripts.push(map[index]);
        }
      });
    },
  },
};
</script>
