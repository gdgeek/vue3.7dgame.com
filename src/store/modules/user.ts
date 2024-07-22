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

  // 获取信息(用户昵称、头像、角色集合、权限集合)
  // function getUserInfo() {
  //   return new Promise<getUserInfoData>((resolve, reject) => {
  //     UserAPI.getInfo()
  //       .then((data) => {
  //         if (!data) {
  //           reject("Verification failed, please Login again.");
  //           return;
  //         }
  //         if (!data.roles || data.roles.length <= 0) {
  //           reject("getUserInfo: roles must be a non-null array!");
  //           return;
  //         }
  //         Object.assign(userInfo.value!, { ...data });
  //         // 确保 roles 为非空字符数组
  //         if (
  //           !Array.isArray(userInfo.value.roles) ||
  //           userInfo.value.roles.length === 0
  //         ) {
  //           userInfo.value.roles = ["user"]; // 你可以设置一个默认角色
  //         }
  //         console.log("userInfo.value:", userInfo.value);
  //         // commit("setUser", data);
  //         resolve(data);
  //       })
  //       .catch((error) => {
  //         reject(error);
  //       });
  //   });
  // }

  const getUserInfo = async () => {
    const res = await UserAPI.getInfo();
    userInfo.value.username = res.data.username;
    userInfo.value.roles = res.data.roles;
    userInfo.value.data = {
      username: res.data.data.username,
      id: res.data.data.id,
      nickname: res.data.data.nickname,
      info: res.data.data.info,
      avatar_id: res.data.data.avatar_id,
      email: res.data.data.email,
      emailBind: res.data.data.emailBind,
    };
    if (!res.data) {
      console.error("Verification failed, please Login again.");
      return;
    }
    if (!res.data.roles || res.data.roles.length <= 0) {
      console.error("getUserInfo: roles must be a non-null array!");
      return;
    }
    return userInfo.value;
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
