import { logger } from "@/utils/logger";
import { login as authLogin, logout as authLogout } from "@/api/v1/auth";
//import { resetRouter } from "@/router";
import { store } from "@/store";
import { LoginData } from "@/api/auth/model";
import { UserInfoType, _UserDataType } from "@/api/user/model";
import { login as wechatLogin } from "@/api/v1/wechat";
import type { WechatLoginRequest } from "@/api/v1/types/wechat";
import Token from "@/store/modules/token";
import { putUserData, info as fetchUserInfo } from "@/api/v1/user";

export const useUserStore = defineStore(
  "user",
  () => {
    const defaultUserInfo: UserInfoType | null = null;
    const userInfo = ref<UserInfoType | null>(defaultUserInfo);

    async function loginByWechat(data: WechatLoginRequest) {
      const response = await wechatLogin(data);
      if (!response.data.success) {
        throw new Error("Login failed, please try again later.");
      }
      const token = response.data.token;

      if (token) {
        Token.setToken(token);
      } else {
        throw new Error("The login response is missing the access_token");
      }
      return true;
    }
    const RoleEnum = {
      Root: "root",
      Admin: "admin",
      Manager: "manager",
      User: "user",
      None: null,
    };
    function getRoleLevel(role: string | null) {
      switch (role) {
        case RoleEnum.Root:
          return 4;
        case RoleEnum.Admin:
          return 3;
        case RoleEnum.Manager:
          return 2;
        case RoleEnum.User:
          return 1;
        default:
          return 0;
      }
    }
    function isUserPermissionGreater(role: string) {
      const currentRole = getRole();

      const currentLevel = getRoleLevel(currentRole);
      const targetLevel = getRoleLevel(role);
      return currentLevel >= targetLevel;
    }

    function getRole() {
      const roles = userInfo.value?.roles;
      if (roles && roles.length > 0) {
        if (roles.find((element) => element === RoleEnum.Root) != undefined) {
          return RoleEnum.Root;
        }
        if (roles.find((element) => element === RoleEnum.Admin) != undefined) {
          return RoleEnum.Admin;
        }
        if (
          roles.find((element) => element === RoleEnum.Manager) != undefined
        ) {
          return RoleEnum.Manager;
        }
        if (roles.find((element) => element === RoleEnum.User) != undefined) {
          return RoleEnum.User;
        }
      }
      return RoleEnum.None;
    }
    /**
     * 登录
     *
     * @param {LoginData}
     * @returns
     */
    async function login(loginData: LoginData) {
      const response = await authLogin(loginData);
      if (!response.data.success) {
        throw new Error("Login failed, please try again later.");
      }
      const token = response.data.token;

      if (token) {
        Token.setToken(token);
      } else {
        throw new Error("The login response is missing the access_token");
      }
      return true;
    }

    // Token 刷新由 src/utils/request.ts 拦截器按需触发，无需在此维护定时器
    const setUserInfo = async (data: unknown) => {
      try {
        const response = await putUserData(data);
        //  logger.error("getUserInfo response:", response);
        // 确保数据存在
        if (!response.data || !response.data.success) {
          logger.error("Verification failed, please Login again.");
          return;
        }
        const user = response.data.data;
        if (!user.roles) {
          logger.error("getUserInfo: roles must be a non-null array!");
          return;
        }

        userInfo.value = user;
        // 更新 userInfo
        userInfo.value.id = user.id;
        userInfo.value.roles = user.roles;
        userInfo.value.userInfo = user.userInfo;
        userInfo.value.userData = user.userData;
        // 使用服务端返回的权限数据，若未返回则使用空数组
        userInfo.value.perms = user.perms ?? [];

        return userInfo.value;
      } catch (error) {
        logger.error("Error fetching user info:", error);
      }
    };

    const getUserInfo = async () => {
      try {
        const response = await fetchUserInfo();
        // 确保数据存在
        if (!response.data || !response.data.success) {
          logger.error("Verification failed, please Login again.");
          return;
        }
        const user = response.data.data;
        if (!user.roles) {
          logger.error("getUserInfo: roles must be a non-null array!");
          return;
        }

        // 更新 userInfo，使用服务端返回的权限数据
        userInfo.value = user;
        userInfo.value.perms = user.perms ?? [];

        return userInfo.value;
      } catch (error) {
        logger.error("Error fetching user info:", error);
      }
    };

    const form = ref<LoginData>({
      username: "",
      password: "",
    });

    const logout = async () => {
      // 调用后端注销 API（忽略失败，确保本地清理总是执行）
      try {
        if (Token.hasToken()) {
          await authLogout();
        }
      } catch (error) {
        logger.error("Backend logout failed:", error);
      }

      // 正确清除 token
      Token.removeToken();

      // 用户数据清空
      userInfo.value = {
        id: 0,
        userData: {
          username: "",
          nickname: null,
          emailBind: false,
          email: null,
        },
        userInfo: {
          info: {
            sex: "",
            industry: "",
            selectedOptions: [],
            textarea: "",
          },
          gold: 0,
          points: 0,
          avatar: {
            id: 0,
            md5: "",
            type: "",
            url: "",
            filename: "",
            size: 0,
            key: "",
          },
        },
        roles: [],
        perms: [],
      };

    };

    return {
      userInfo,
      login,
      loginByWechat,
      getUserInfo,
      setUserInfo,
      logout,

      form,
      getRole,
      isUserPermissionGreater,
      RoleEnum,
    };
  },
  {
    /*
    persist: {
      key: "userLoginForm",
      storage: st,
      pick: ["form"],
    },*/
  }
);

// 非setup
export function useUserStoreHook() {
  return useUserStore(store);
}
