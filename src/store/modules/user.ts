import AuthAPI from "@/api/auth";
import UserAPI from "@/api/user";
import { initRoutes, resetRouter } from "@/router";
import { store } from "@/store";
import { LoginData, LoginResult } from "@/api/auth/model";
import { getUserInfoData, InfoType } from "@/api/user/model";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { Avatar } from "@/api/user/model";
export const useUserStore = defineStore("user", () => {
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

  /**
   * 登录
   *
   * @param {LoginData}
   * @returns
   */
  function login(loginData: LoginData) {
    return new Promise<void>((resolve, reject) => {
      AuthAPI.login(loginData)
        .then((data) => {
          const access_token = data.data.access_token;
          localStorage.setItem(TOKEN_KEY, "Bearer" + " " + access_token);
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

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
      console.log("res", userInfo.value);
      return userInfo.value;
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  // 用户登出
  // function logout() {
  //   return new Promise<void>((resolve, reject) => {
  //     AuthAPI.logout()
  //       .then(() => {
  //         console.log("测试");
  //         localStorage.setItem(TOKEN_KEY, "");
  //         location.reload(); // 清空路由
  //         resolve();
  //       })
  //       .catch((error) => {
  //         reject(error);
  //       });
  //   });
  // }
  const logout = async () => {
    await localStorage.setItem(TOKEN_KEY, "");
    location.reload(); // 清空路由
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
  };

  // remove token
  function resetToken() {
    console.log("resetToken");
    return new Promise<void>((resolve) => {
      localStorage.setItem(TOKEN_KEY, "");
      resetRouter();
      resolve();
    });
  }

  return {
    userInfo,
    login,
    getUserInfo,
    logout,
    resetToken,
  };
});

// 非setup
export function useUserStoreHook() {
  return useUserStore(store);
}
