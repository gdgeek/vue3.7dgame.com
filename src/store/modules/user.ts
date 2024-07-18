import AuthAPI from "@/api/auth";
import UserAPI from "@/api/user";
import { resetRouter } from "@/router";
import { store } from "@/store";

import { LoginData, LoginResult } from "@/api/auth/model";
import { getUserInfoData } from "@/api/user/model";
import { TOKEN_KEY } from "@/enums/CacheEnum";

export const useUserStore = defineStore("user", () => {
  const defaultUserInfo: getUserInfoData = {
    username: "",
    data: {
      username: "",
      id: 0,
      nickname: null,
      info: null,
      avatar_id: null,
      email: null,
      emailBind: false,
    },
    roles: [],
  };
  const userInfo = ref<getUserInfoData>(defaultUserInfo);

  // const userInfo = ref<LoginResult>();

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
          localStorage.setItem(TOKEN_KEY, "Bearer" + " " + access_token); // Bearer eyJhbGciOiJIUzI1NiJ9.xxx.xxx
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  // 获取信息(用户昵称、头像、角色集合、权限集合)
  function getUserInfo() {
    return new Promise<getUserInfoData>((resolve, reject) => {
      UserAPI.getInfo()
        .then((data) => {
          if (!data) {
            reject("Verification failed, please Login again.");
            return;
          }
          if (!data.roles || data.roles.length <= 0) {
            reject("getUserInfo: roles must be a non-null array!");
            return;
          }
          Object.assign(userInfo.value!, { ...data });
          // commit("setUser", data);
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  // user logout
  function logout() {
    return new Promise<void>((resolve, reject) => {
      AuthAPI.logout()
        .then(() => {
          localStorage.setItem(TOKEN_KEY, "");
          location.reload(); // 清空路由
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

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
