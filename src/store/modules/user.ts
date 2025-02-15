//import AuthAPI from "@/api/auth";
import Auth from "@/api/v1/auth";
import UserAPI from "@/api/user";
//import { resetRouter } from "@/router";
import { store } from "@/store";
import { LoginData, LoginResult } from "@/api/auth/model";
import { getUserInfoData, InfoType } from "@/api/user/model";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { Avatar } from "@/api/user/model";
import Wechat from "@/api/v1/wechat";
import SecureLS from "secure-ls";

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
    const defaultUserInfo: getUserInfoData = {
      username: "",
      data: {
        username: "",
        id: 0,
        nickname: null,
        info: "",
        avatar_id: null,
        avatar: {
          id: 0,
          md5: "",
          type: "jpg",
          url: "",
          filename: "",
          size: 0,
          key: "",
        },
        email: null,
        emailBind: false,
      },
      roles: ["user"],
      perms: [
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
      ],
    };
    const userInfo = ref<getUserInfoData>(defaultUserInfo);

    function setToken(token: any) {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    }
    function getToken() {
      const token = localStorage.getItem(TOKEN_KEY);

      if (token) {
        try {
          return JSON.parse(token);
        } catch (e) {
          console.error("Failed to parse token:", e);
          return null;
        }
      } else {
      }
    }
    async function loginByWechat(data: any) {
      const response = await Wechat.login(data);
      if (!response.data.success) {
        throw new Error("Login failed, please try again later.");
      }
      const token = response.data.token;

      if (token) {
        setToken(token);
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
      const response = await Auth.login(loginData);
      if (!response.data.success) {
        throw new Error("Login failed, please try again later.");
      }
      const token = response.data.token;

      if (token) {
        setToken(token);
      } else {
        throw new Error("The login response is missing the access_token");
      }
      return true;
    }

    const refreshInterval = ref<NodeJS.Timeout | null>(null);
    const getUserInfo = async () => {
      try {
        const res = await UserAPI.getInfo();

        // 确保数据存在
        if (!res.data) {
          console.error("Verification failed, please Login again.");
          return;
        }
        if (!res.data.roles || res.data.roles.length <= 0) {
          console.error("getUserInfo: roles must be a non-null array!");
          return;
        }

        // 将 info 从字符串解析为对象
        let parsedInfo: InfoType | undefined;
        if (res.data.data.info) {
          try {
            parsedInfo = JSON.parse(res.data.data.info);
          } catch (e) {
            console.error("Failed to parse info:", e);
          }
        }

        // 更新 userInfo
        userInfo.value.username = res.data.username;
        userInfo.value.roles = res.data.roles;
        const data: any = res.data.data;
        const avatar: Avatar | null = data.avatar
          ? {
              id: data.avatar.id,
              md5: data.avatar.md5,
              type: data.avatar.type,
              url: data.avatar.url,
              filename: data.avatar.filename,
              size: data.avatar.size,
              key: data.avatar.key,
            }
          : null;
        userInfo.value.data = {
          username: data.username,
          id: data.id,
          nickname: data.nickname,
          info: data.info,
          parsedInfo: parsedInfo, // 存储解析后的 info 对象
          avatar_id: data.avatar_id,
          avatar: avatar,
          email: data.email,
          emailBind: data.emailBind,
        };
        return userInfo.value;
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    const setupRefreshInterval = (form: LoginData) => {
      /*
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value); // 清除现有的定时器
      }

      refreshInterval.value = setInterval(async () => {
        try {
          const token = localStorage.getItem(TOKEN_KEY);
          if (token) {
            const newTokenResponse = await AuthAPI.login(form);
            const newToken = newTokenResponse.data.auth;
            localStorage.setItem(TOKEN_KEY, newToken); // 更新 token
            console.log("Token refreshed:", newToken);
            const res = await getUserInfo(); // 刷新用户数据
            console.log("User data refreshed:", res);
          }
        } catch (e) {
          console.error("Failed to refresh user data:", e);
        }
      }, 3600000); // 每小时刷新一次
      */
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
        username: "",
        data: {
          username: "",
          id: 0,
          nickname: "",
          info: "",
          avatar_id: "",
          avatar: {
            id: 0,
            md5: "",
            type: "jpg",
            url: "",
            filename: "",
            size: 0,
            key: "",
          },
          email: "",
          emailBind: false,
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
      logout,
      resetToken,
      form,
      refreshInterval,
      setupRefreshInterval,
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
