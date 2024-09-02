<template>
  <!-- <div> -->
  <waterfall
    v-if="viewCards.length > 0"
    :lazyload="true"
    :list="viewCards"
    :gutter="10"
  >
    <template #default="{ item }">
      <el-card style="width: 200px" :body-style="{ padding: '0px' }">
        <LazyImg
          v-if="item.avatar == null"
          style="width: 100%; height: auto"
          fit="contain"
          url="/src/assets/image/author-boy.png"
        ></LazyImg>
        <LazyImg
          v-if="item.avatar"
          style="width: 100%; height: auto"
          fit="contain"
          :url="item.avatar.url"
        ></LazyImg>
        <div style="padding: 14px">
          <span>{{ item.username }}</span>
          <div class="bottom clearfix">
            <el-descriptions
              v-if="!canDelete(item.roles)"
              class="margin-top"
              :title="item.nickname"
              :column="1"
              size="small"
            >
              <el-descriptions-item label="权限:">
                {{ getAblity(item.roles) }}
              </el-descriptions-item>
            </el-descriptions>
            <el-descriptions
              v-else
              class="margin-top"
              :title="item.nickname"
              :column="1"
              size="small"
            >
              <el-descriptions-item label="权限:">
                <el-select
                  v-model="item.selectedRole"
                  placeholder="Select"
                  size="small"
                  style="float: right; width: 125px"
                  @change="handleRoleChange(item)"
                >
                  <el-option
                    v-for="(role, index) in getAbilities(item.roles)"
                    :key="index"
                    :label="role"
                    :value="role"
                  ></el-option>
                </el-select>
              </el-descriptions-item>
            </el-descriptions>
            <!-- 权限选择 -->
            <el-button
              v-if="canDelete(item.roles)"
              type="danger"
              size="small"
              class="button"
              @click="deleted(item)"
            >
              删除
            </el-button>
          </div>
        </div>
      </el-card>
      <br />
      <br />
    </template>
  </waterfall>
  <!-- </div> -->
</template>

<script setup lang="ts">
import { LazyImg, Waterfall } from "vue-waterfall-plugin-next";
import "vue-waterfall-plugin-next/dist/style.css";
import { deletePerson, putPerson, userData } from "@/api/v1/person";
import { useUserStore } from "@/store/modules/user";

const userStore = useUserStore();

const props = defineProps<{
  items: userData[];
}>();

const emit = defineEmits(["refresh"]);

// const getUrl = (item: any) => {
//   //alert(require("@/assets/image/author-boy.png"));
//   return item?.avatar?.url;
// };

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

const getAbilities = (roles: string[]): string[] => {
  const currentUserRoles = userStore.userInfo.roles as (
    | "root"
    | "admin"
    | "manager"
    | "user"
  )[];
  const currentUserLevel = getRoleLevel(currentUserRoles);

  // 过滤出低于当前用户级别的角色,只能赋予比当前用户权限低的权限
  return Object.keys(rolePriority)
    .filter(
      (role) =>
        rolePriority[role as keyof typeof rolePriority] < currentUserLevel
    )
    .map((role) => {
      switch (role) {
        case "root":
          return "根用户";
        case "admin":
          return "超级管理员";
        case "manager":
          return "管理员";
        case "user":
          return "用户";
        default:
          return role;
      }
    });
};

const rolePriority = {
  root: 4,
  admin: 3,
  manager: 2,
  user: 1,
};

// 获取角色的最高级别
const getRoleLevel = (
  roles: ("root" | "admin" | "manager" | "user")[]
): number => {
  return Math.max(...roles.map((role) => rolePriority[role]));
};

const canDelete = (
  targetRoles: ("user" | "root" | "admin" | "manager")[]
): boolean => {
  const currentUserRoles = userStore.userInfo.roles as (
    | "root"
    | "admin"
    | "manager"
    | "user"
  )[];
  // console.log("currentUserRoles", currentUserRoles);
  const currentUserLevel = getRoleLevel(currentUserRoles); // 当前用户的角色级别
  const targetUserLevel = getRoleLevel(
    targetRoles as ("user" | "root" | "admin" | "manager")[]
  ); // 目标用户的角色级别
  // 只有当前用户的权限级别高于目标用户才能删除,并显示删除按钮
  return currentUserLevel > targetUserLevel;
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

const handleRoleChange = async (item: ViewCard) => {
  // 获取选中的角色
  const newRole = item.selectedRole;

  const data = {
    id: Number(item.id),
    auth: getAbilitiesFromRole(newRole),
  };
  console.log("roleid", Number(item.id));
  try {
    await putPerson(data); // 调用修改接口
    ElMessage.success("权限更新成功!");
    refresh(); // 刷新数据
  } catch (error) {
    ElMessage.error("权限更新失败!");
  }
};

// 将角色名称转换为实际角色数组
const getAbilitiesFromRole = (role: string): string => {
  switch (role) {
    case "根用户":
      return "root";
    case "超级管理员":
      return "admin";
    case "管理员":
      return "manager";
    case "用户":
      return "user";
    default:
      return "";
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
      email: item.email,
      username: item.username,
      nickname: item.nickname,
      avatar: item.avatar,
      roles: item.roles,
      selectedRole: getAblity(item.roles),
    };
  });
};

const viewCards = computed(() => {
  if (!props.items || props.items.length === 0) return [];
  const cards = transformToViewCard(props.items);
  return cards;
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
  // padding: 0;
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
