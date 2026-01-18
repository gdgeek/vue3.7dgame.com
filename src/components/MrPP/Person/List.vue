<template>
  <!-- <div> -->
  <waterfall v-if="viewCards.length > 0" :lazyload="true" :list="viewCards" :gutter="10" :width="240" :breakpoints="{
    640: { rowPerView: 1 },
  }" :backgroundColor="'rgba(255, 255, 255, .05)'">
    <template #default="{ item }">
      <el-card style="width: 100%" :body-style="{ padding: '0px' }">
        <LazyImg v-if="item.avatar == null" style="width: 100%; height: auto" fit="contain"
          :url="`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${item.username}`"></LazyImg>
        <LazyImg v-if="item.avatar" style="width: 100%; height: auto" fit="contain" :url="item.avatar.url"></LazyImg>
        <div style="padding: 14px">
          <span>{{ item.username }}</span>
          <div class="bottom clearfix">
            <el-descriptions v-if="!people(item.roles)" class="margin-top" :title="item.nickname" :column="1"
              size="small">
              <el-descriptions-item :label="$t('manager.list.label')">
                {{ getAblity(item.roles) }}
              </el-descriptions-item>
            </el-descriptions>
            <el-descriptions v-else class="margin-top" :title="item.nickname" :column="1" size="small">
              <el-descriptions-item :label="$t('manager.list.label')">
                <el-select v-model="item.selectedRole" placeholder="Select" size="small"
                  style="float: right; width: 118px" @change="handleRoleChange(item)">
                  <el-option v-for="(role, index) in getAbilities(item.roles)" :key="index" :label="role"
                    :value="role"></el-option>
                </el-select>
              </el-descriptions-item>
            </el-descriptions>
            <el-button v-if="people(item.roles)" type="danger" size="small" class="button" @click="deleted(item)">
              {{ $t("manager.list.cancel") }}
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

import { AbilityRole } from "@/utils/ability";
import { useAbility } from "@casl/vue";
const ability = useAbility();
const can = ability.can.bind(ability);
const userStore = useUserStore();
const { t } = useI18n();

const props = defineProps<{
  items: userData[];
}>();

const emit = defineEmits(["refresh"]);

const getAblity = (roles: string[]) => {
  if (roles.includes("root")) {
    return t("manager.list.roles.root");
  } else if (roles.includes("admin")) {
    return t("manager.list.roles.admin");
  } else if (roles.includes("manager")) {
    return t("manager.list.roles.manager");
  } else if (roles.includes("user")) {
    return t("manager.list.roles.user");
  }
  return JSON.stringify(roles);
};

const getAbilities = (roles: string[]): string[] => {
  const userInfo = userStore.userInfo;
  if (userInfo == null) return [];
  const currentUserRoles = userInfo.roles as (
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
          return t("manager.list.roles.root");
        case "admin":
          return t("manager.list.roles.admin");
        case "manager":
          return t("manager.list.roles.manager");
        case "user":
          return t("manager.list.roles.user");
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
const getRoleLevel = (roles: string[]): number => {
  if (roles.find((element) => element === "root") != undefined) {
    return rolePriority["root"];
  }
  if (roles.find((element) => element === "admin") != undefined) {
    return rolePriority["admin"];
  }
  if (roles.find((element) => element === "manager") != undefined) {
    return rolePriority["manager"];
  }
  if (roles.find((element) => element === "user") != undefined) {
    return rolePriority["user"];
  }

  return -1;
};

const people = (roles: string[]): boolean => {
  return can("people", new AbilityRole(roles));
};

const refresh = () => {
  emit("refresh");
};

const deleted = async (item: any) => {
  try {
    await ElMessageBox.confirm(
      t("manager.list.confirm.message1"),
      t("manager.list.confirm.message2"),
      {
        confirmButtonText: t("manager.list.confirm.confirm"),
        cancelButtonText: t("manager.list.confirm.cancel"),
        closeOnClickModal: false,
        type: "warning",
      }
    );
    await deletePerson(item.id);
    ElMessage.success(t("manager.list.confirm.success"));
    refresh();
  } catch {
    ElMessage.info(t("manager.list.confirm.info"));
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
    await putPerson(data);
    ElMessage.success(t("manager.list.success"));
    refresh();
  } catch (error) {
    ElMessage.error(t("manager.list.error"));
  }
};

// 将角色名称转换为实际角色数组
const getAbilitiesFromRole = (role: string): string => {
  switch (role) {
    case t("manager.list.roles.root"):
      return "root";
    case t("manager.list.roles.admin"):
      return "admin";
    case t("manager.list.roles.manager"):
      return "manager";
    case t("manager.list.roles.user"):
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
