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
    /*
    const setupRefreshInterval = () => {
      //  alert(2);
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value); // 清除现有的定时器
      }
      refreshInterval.value = setInterval(async () => {
        try {
          const token = Token.getToken();
          if (token) {
            console.error(token);
            const newTokenResponse = await AuthAPI.refresh({
              refreshToken: token.refreshToken,
            });
            const newToken = newTokenResponse.data.token;
            Token.setToken(newToken);
            // localStorage.setItem(TOKEN_KEY, newToken); // 更新 token
            // console.log("Token refreshed:", newToken);
            const res = await getUserInfo(); // 刷新用户数据
            console.log("User data refreshed:", res);
          }
        } catch (e) {
          console.error("Failed to refresh user data:", e);
        }
      }, 3600000);
    };
*/
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
      refreshInterval,
      //  setupRefreshInterval,
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
