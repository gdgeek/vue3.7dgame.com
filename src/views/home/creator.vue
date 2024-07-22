<template>
  <el-card>
    <el-tabs lazy style="min-height: 500px">
      <el-tab-pane label="我的创作">
        <!-- <mr-p-p-creator @refresh="refreshAuthor"></mr-p-p-creator> -->
      </el-tab-pane>
      <el-tab-pane label="我点赞的">
        <!-- <mr-p-p-creator @refresh="refreshLiker"></mr-p-p-creator> -->
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useUserStore } from "@/store/modules/user";
// import MrPPCreator from "@/components/MrPP/";
import { getMessagesWithLiker } from "@/api/v1/like";
import { getMessagesWithAuthor } from "@/api/v1/message";

const userstore = useUserStore();

const userData = computed(() => userstore.getUserInfo);

// const refreshLiker = (data, callback) => {
//   callback(
//     getMessagesWithLiker(userData.value.id, data.sorted, data.search, data.page)
//   );
// };

// const refreshAuthor = (data, callback) => {
//   callback(
//     getMessagesWithAuthor(
//       userData.value.id,
//       data.sorted,
//       data.search,
//       data.page
//     )
//   );
// };
</script>

<style lang="scss" scoped>
.el-dropdown-link {
  cursor: pointer;
  color: #409eff;
}

.el-icon-arrow-down {
  font-size: 12px;
}
</style>
