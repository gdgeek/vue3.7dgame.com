<template>
  <div>
    <!-- <div>{{ userData.id }}</div> -->
    <el-row class="mrpp-header" :gutter="10">
      <el-col :span="11" style="padding-left: 44px">
        <div class="grid-content"><b>标题</b></div>
      </el-col>
      <el-col :span="6" align="center">
        <div class="grid-content"><b>作者</b></div>
      </el-col>
      <el-col :span="7" align="center">
        <div class="grid-content"><b>更新时间</b></div>
      </el-col>
    </el-row>

    <section v-if="items == ''">
      <br />
      <el-skeleton :rows="10" animated></el-skeleton>
    </section>
    <section v-else>
      <div v-for="item in items" :key="item.id">
        <el-row class="mrpp-row" :gutter="10">
          <el-col :span="10" style="padding-left: 20px">
            <div>
              <div class="grid-content">
                <el-popover placement="top-start" :title="item.title" :open-delay="500" width="400px" trigger="hover"
                  :content="html(item.body)">
                  <template #reference>
                    <el-link :underline="false" type="primary"
                      style="display: inline; color: #2190ac; line-height: 24px" @click="gotoPost(item)">
                      {{ item.title }}
                    </el-link>
                  </template>
                </el-popover>
                <!-- 标签 -->
                <mr-p-p-tags :tags-map="tagsMap" :message="item"></mr-p-p-tags>
                <!-- <span v-for="(tags,tegindex) in item.messageTags" :key="tegindex">
                  <el-tag :type="tagsMap.get(tags.tag_id).type" size="small" :color="tagsMap.get(tags.tag_id).color" style="margin-left:6px">
                    <span class="tagawesome">{{ tagsMap.get(tags.tag_id).name }}</span>
                  </el-tag>
                </span> -->
              </div>
            </div>
          </el-col>

          <el-col :span="1" align="center">
            <span style="color: #fff"> .&nbsp; </span>
          </el-col>
          <el-col :span="6" align="center">
            <div class="grid-content">{{ item.author.nickname }}</div>
          </el-col>
          <el-col :span="7" align="center">
            <div class="grid-content">{{ item.updated_at }}</div>
          </el-col>
        </el-row>
      </div>
    </section>
    <br />
  </div>
</template>

<script>
import { AbilityWorks } from "@/ability/ability";

import { deleteMessage, getMessagesWithAuthor } from "@/api/v1/message";
import MrPPTags from "@/components/MrPP/MrPPTags.vue";
import { mapGetters, mapState, mapActions } from "vuex";

export default {
  name: "MessageTable",
  components: {
    MrPPTags,
  },

  data() {
    return {
      items: null,
    };
  },
  computed: {
    ...mapGetters(["userData"]),
    ...mapState({
      tagsMap: (state) => state.tags.tagsMap,
    }),
  },
  mounted() {
    const self = this;
    if (self.tagsMap === null) {
      self.refreshTags();
    }
    getMessagesWithAuthor(self.userData.id)
      .then((response) => {
        // console.log(response.data, '111')
        self.items = response.data;
      })
      .catch(function (error) {
        console.error(error);
      });
  },
  methods: {
    ...mapActions("tags", {
      refreshTags: "refreshTags",
    }),
    canDelete(author_id) {
      const self = this;
      return self.$can("delete", new AbilityWorks(author_id));
    },

    cutString(str, len) {
      if (str.length * 2 <= len) {
        return str;
      }
      var strlen = 0;
      var s = "";
      for (var i = 0; i < str.length; i++) {
        s = s + str.charAt(i);
        if (str.charCodeAt(i) > 128) {
          strlen = strlen + 2;
          if (strlen >= len) {
            return s.substring(0, s.length - 1) + "...";
          }
        } else {
          strlen = strlen + 1;
          if (strlen >= len) {
            return s.substring(0, s.length - 2) + "...";
          }
        }
      }
      return s;
    },
    gotoPost(item) {
      const self = this;
      self.$router.push({ path: "/community/post", query: { id: item.id } });
    },
    filterHtml(html) {
      return html.replace(/<[^>]*>/g, "");
    },
    html(body) {
      return this.cutString(this.filterHtml(body), 100);
    },
    remove: function (item) {
      const self = this;
      this.$confirm("此操作将永久删除该文件, 是否继续?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        closeOnClickModal: false,
        type: "warning",
      })
        .then(() => {
          self.deleted(item.id);
        })
        .catch(() => {
          this.$message({
            type: "info",
            message: "已取消删除",
          });
        });
    },
    deleted: function (id) {
      deleteMessage(id)
        .then((response) => {
          this.$message({
            type: "success",
            message: "删除成功!",
          });
        })
        .catch(function (error) {
          console.log(error);
        })
        .finally(() => { });
    },
  },
};
</script>

<style lang="scss" scoped>
.tagawesome {
  cursor: pointer;
}

.el-row {
  margin-bottom: 0px;
}

.el-link:hover {
  color: #4db8db !important;
  /* opacity: 0.9; */
}

.mrpp-header {
  border-radius: 0px;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  border-style: solid;
  border-width: 1px;
  border-color: lightgrey;
  background-color: gainsboro;
}

.mrpp-row {
  border-radius: 0px;
  border-style: solid;
  border-width: 0px;
  border-bottom-width: 1px;
  border-left-width: 1px;
  border-right-width: 1px;
  border-color: lightgrey;
}

.grid-content {
  border-radius: 2px;
  height: 50px;
  display: table-cell;
  vertical-align: middle;
  font-size: 14px;
  color: dimgrey;
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
}
</style>
