//import AuthAPI from "@/api/auth";
import AuthAPI from "@/api/v1/auth";
//import { resetRouter } from "@/router";
import { store } from "@/store";
import { LoginData, LoginResult } from "@/api/auth/model";
import { UserInfoType, _UserDataType } from "@/api/user/model";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import Wechat from "@/api/v1/wechat";
import SecureLS from "secure-ls";
import Token from "@/store/modules/token";
import UserAPI from "@/api/v1/user";

const ls = new SecureLS({
  isCompression: false,
  encryptionSecret: "38c31684-d00d-30dc-82e0-fad9eec46d1d",
});

const st: Pick<Storage, "getItem" | "setItem"> = {
  setItem(key: string, value: string) {
    ls.set(key, value);
  },
  getItem(key: string): string | null {
    return ls.get(key);
  },
};

export const useUserStore = defineStore(
  "user",
  () => {
    const defaultUserInfo: UserInfoType | null = null;
    const userInfo = ref<UserInfoType | null>(defaultUserInfo);

    async function loginByWechat(data: any) {
      const response = await Wechat.login(data);
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
      const response = await AuthAPI.login(loginData);
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

    const refreshInterval = ref<NodeJS.Timeout | null>(null);
    const setUserInfo = async (data: any) => {
      try {
        const response = await UserAPI.putUserData(data);
        console.error("getUserInfo response:", response);
        // 确保数据存在
        if (!response.data || !response.data.success) {
          console.error("Verification failed, please Login again.");
          return;
        }
        const user = response.data.data;
        if (!user.roles) {
          console.error("getUserInfo: roles must be a non-null array!");
          return;
        }

        userInfo.value = user;
        // 更新 userInfo
        userInfo.value.id = user.id;
        userInfo.value.roles = user.roles;
        userInfo.value.userInfo = user.userInfo;
        userInfo.value.userData = user.userData;
        userInfo.value.perms = perms;

        return userInfo.value;
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };
    const perms: string[] = [
      "sys:menu:delete",
      "sys:dept:edit",
      "sys:dict_type:add",
      "sys:dict:edit",
      "sys:dict:delete",
      "sys:dict_type:edit",
      "sys:menu:add",
      "sys:user:add",
      "sys:role:edit",
      "sys:dept:delete",
      "sys:user:edit",
      "sys:user:delete",
      "sys:user:password:reset",
      "sys:dept:add",
      "sys:role:delete",
      "sys:dict_type:delete",
      "sys:menu:edit",
      "sys:dict:add",
      "sys:role:add",
      "sys:user:query",
      "sys:user:export",
      "sys:user:import",
    ];

    const getUserInfo = async () => {
      try {
        const response = await UserAPI.info();
        console.error("getUserInfo response:", response);
        // 确保数据存在
        if (!response.data || !response.data.success) {
          console.error("Verification failed, please Login again.");
          return;
        }
        const user = response.data.data;
        if (!user.roles) {
          console.error("getUserInfo: roles must be a non-null array!");
          return;
        }

        // 更新 userInfo
        userInfo.value = user;
        userInfo.value.perms = perms;

        return userInfo.value;
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    const form = ref<LoginData>({
      username: "",
      password: "",
    });

    const logout = async () => {
      await localStorage.setItem(TOKEN_KEY, "");
      // location.reload(); // 清空路由
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
      // location.reload(); // 清空路由
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
        refreshInterval.value = null;
      }
    };

    // remove token
    function resetToken() {
      console.log("resetToken");
      return new Promise<void>((resolve) => {
        localStorage.setItem(TOKEN_KEY, "");
        //   resetRouter();
        resolve();
      });
    }

    return {
      userInfo,
      login,
      loginByWechat,
      getUserInfo,
      setUserInfo,
      logout,
      resetToken,
      form,
      getRole,
      isUserPermissionGreater,
      RoleEnum,
      refreshInterval,
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
