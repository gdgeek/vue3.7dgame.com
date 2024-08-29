<template>
  <div>
    <waterfall
      v-if="viewCards.length > 0"
      :lazyload="true"
      :breakpoints="breakpoints"
      :gutter="10"
      :list="viewCards"
      :column-count="3"
    >
      <template #default="{ item }">
        <el-card style="width: 150px" :body-style="{ padding: '0px' }">
          <LazyImg :url="getUrl(item)" class="image"></LazyImg>
          <div style="padding: 14px">
            <span>{{ item.username }}</span>
            <div class="bottom clearfix">
              <el-descriptions
                class="margin-top"
                :title="item.nickname"
                :column="1"
                size="small"
              >
                <el-descriptions-item label="权限">
                  {{ getAblity(item.roles) }}
                </el-descriptions-item>
              </el-descriptions>
              <el-button type="text" class="button" @click="deleted(item)">
                删除
              </el-button>
            </div>
          </div>
        </el-card>
        <br />
        <br />
      </template>
    </waterfall>
  </div>
</template>

<script setup lang="ts">
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { deletePerson, userData } from "@/api/v1/person";

const props = defineProps<{
  items: userData[];
}>();

const emit = defineEmits(["refresh"]);

const getUrl = (item: any) => {
  //alert(require("@/assets/image/author-boy.png"));
  return item?.avatar?.url;
};

const getAblity = (roles: string[]) => {
  if (roles.includes("root")) {
    return "根用户";
  } else if (roles.includes("admin")) {
    return "超级管理员";
  } else if (roles.includes("manager")) {
    return "管理员";
  } else if (roles.includes("user")) {
    return "用户";
  }
  return JSON.stringify(roles);
};

const refresh = () => {
  emit("refresh");
};

const deleted = async (item: any) => {
  try {
    await ElMessageBox.confirm("此操作将永久删除该用户, 是否继续?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      closeOnClickModal: false,
      type: "warning",
    });
    await deletePerson(item.id);
    ElMessage.success("删除成功!");
    refresh();
  } catch {
    ElMessage.info("已取消删除");
  }
};

type ViewCard = {
  src: string;
  id?: string;
  name?: string;
  star?: boolean;
  backgroundColor?: string;
  [attr: string]: any;
};

// 瀑布流数据类型转换
const transformToViewCard = (items: userData[]): ViewCard[] => {
  return items.map((item) => {
    return {
      src: item.avatar?.url,
      id: item.id ? item.id.toString() : undefined,
      username: item.username,
      nickname: item.nickname,
      roles: item.roles,
    };
  });
};

const viewCards = computed(() => {
  console.log("props.items:", props.items);
  if (!props.items || props.items.length === 0) return [];
  const cards = transformToViewCard(props.items);
  console.log("viewCards", cards);
  return cards;
});

const breakpoints = ref({
  3200: {
    //当屏幕宽度大于等于3200
    rowPerView: 8, // 一行8图
  },
  2400: {
    //当屏幕宽度大于等于2400
    rowPerView: 6, // 一行6图
  },
  1600: {
    //当屏幕宽度小于等于1600
    rowPerView: 4, // 一行4图
  },
  1200: {
    //当屏幕宽度小于等于1350
    rowPerView: 3, // 一行3图
  },
  800: {
    //当屏幕宽度小于等于900
    rowPerView: 2, // 一行2图
  },
  600: {
    //当屏幕宽度小于等于450
    rowPerView: 1, // 一行1图
  },
});
</script>

<style lang="scss" scoped>
.time {
  font-size: 13px;
  color: #999;
}

.bottom {
  margin-top: 13px;
  line-height: 12px;
}

.button {
  padding: 0;
  float: right;
}

.image {
  width: 100%;
  display: block;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}

.clearfix:after {
  clear: both;
}
</style>
