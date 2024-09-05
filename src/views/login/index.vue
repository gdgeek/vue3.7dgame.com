<script setup lang="ts">
import "@/assets/font/font.css";
import { ref, computed, nextTick, onMounted } from "vue";
import { RouterLink, useRouter, LocationQuery, useRoute } from "vue-router";
import { FormInstance } from "element-plus";
import { useUserStore } from "@/store/modules/user";
import { LoginData } from "@/api/auth/model";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import AuthAPI from "@/api/auth/index";
//import { initRoutes } from "@/router";
import CryptoJS from "crypto-js";

const secretKey = "bujiaban"; // 密钥

const userStore = useUserStore();
const route = useRoute();

const form = ref<LoginData>({
  username: "",
  password: "",
});

// 加密
const encryptedPassword = (password: string): string => {
  return CryptoJS.AES.encrypt(password, secretKey).toString();
};
// 解密
const decryptPassword = (encryptedPassword: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// 保存用户数据到本地
const saveLoginData = () => {
  const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24小时有效
  localStorage.setItem("username", form.value.username);
  localStorage.setItem("password", encryptedPassword(form.value.password));
  localStorage.setItem("expirationTime", expirationTime.toString());
};

const rules = computed(() => {
  return {
    username: [
      { required: true, message: "请输入用户名称", trigger: "blur" },
      { min: 5, message: "用户名称长度应该大于5", trigger: "blur" },
    ],
    password: [
      { required: true, message: "请输入密码", trigger: "blur" },
      { min: 6, message: "密码长度应该大于6", trigger: "blur" },
    ],
  };
});

const router = useRouter();
const formRef = ref<FormInstance>();
const isShow = ref(false);
const title = ref<string | Record<string, string>>("");

const succeed = (data: any) => {
  ElMessage.success("登录成功");
  const token = data.access_token;
  if (token) {
    setToken(token);
    saveLoginData();
    const res = localStorage.getItem(TOKEN_KEY);
    console.log("Token set successfully", res);
    nextTick(() => {
      router.push("/");
      console.log("Routing to home");
    });
  } else {
    failed("登录响应中缺少 access_token");
  }
};

const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, "Bearer " + token);
};

function parseRedirect(): {
  path: string;
  queryParams: Record<string, string>;
} {
  const query: LocationQuery = route.query;
  const redirect = (query.redirect as string) ?? "/";

  const url = new URL(redirect, window.location.origin);
  const path = url.pathname;
  const queryParams: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  return { path, queryParams };
}

const failed = (message: any) => {
  error(message);
};

const submit = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const res = await AuthAPI.login(form.value);
        // await initRoutes();
        await window.location.reload();
        await succeed(res.data);
        const userin = await userStore.getUserInfo();
        console.log("userin:", userin);
        const { path, queryParams } = await parseRedirect();
        console.log("path:", path, "queryParams:", queryParams);
        await router.push({ path: path, query: queryParams });
      } catch (error) {
        failed(error);
      }
    } else {
      ElMessage({ type: "error", message: "表单校验未通过" });
    }
  });
};

const error = (msg: string | Record<string, string>) => {
  title.value =
    typeof msg === "string"
      ? msg
      : Object.keys(msg)
          .map((key) => `${key} : ${msg[key]}`)
          .join("\n");
  isShow.value = true;
};

onMounted(() => {
  const savedUsername = localStorage.getItem("username");
  const savedPassword = localStorage.getItem("password");
  const savedExpirationTime = localStorage.getItem("expirationTime");

  if (savedExpirationTime) {
    const expirationTime = parseInt(savedExpirationTime, 10);
    if (Date.now() > expirationTime) {
      // 密码已过期，清除保存的密码
      // localStorage.removeItem("username");
      localStorage.removeItem("password");
      localStorage.removeItem("expirationTime");
    } else {
      if (savedUsername) {
        form.value.username = savedUsername;
      }
      if (savedPassword) {
        form.value.password = decryptPassword(savedPassword);
      }
    }
  }
});
</script>

<template>
  <body>
    <div class="header">
      <RouterLink to="/" class="logo">
        <img src="/favicon.ico" alt="" />
        <span class="project_title">苹果AR元气项目</span>
      </RouterLink>
      <div class="header-right">
        <el-button>平台注册/登录</el-button>
      </div>
      <div class="blog">
        <a>开发博客</a>
      </div>
    </div>
    <div class="content">
      <div class="box1">
        <div class="box2">
          <h1>欢迎!</h1>
          <h4>准备好出发了么？</h4>
          <div class="box3">
            <h2 class="login-title">登录账号</h2>
            <el-form
              ref="formRef"
              class="login-form"
              :rules="rules"
              :model="form"
              label-width="75px"
            >
              <el-form-item label="用户名" prop="username">
                <el-input v-model="form.username" suffix-icon="User"></el-input>
              </el-form-item>
              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="form.password"
                  type="password"
                  suffix-icon="Lock"
                ></el-input>
              </el-form-item>

              <el-form-item class="login-button">
                <el-button style="width: 100%" type="primary" @click="submit">
                  登录平台
                </el-button>
              </el-form-item>
            </el-form>
            <!-- <div class="login-link">
          <router-link to="/site/signup">
            <el-link type="primary" :underline="false">注册用户</el-link>
          </router-link>
          <br />
          <router-link to="/site/request-password-reset">
            <el-link type="primary" :underline="false">找回密码</el-link>
          </router-link>
          <br />
        </div> -->
            <!-- <div v-if="isShow" class="error-message">{{ title }}</div> -->
          </div>
          <el-button style="width: 100%" size="small"> 下载相关程序 </el-button>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="copyright">
        <RouterLink
          to="https://bujiaban.com"
          target="_blank"
          :underline="false"
        >
          <el-icon>
            <HomeFilled></HomeFilled>
          </el-icon>
          上海不加班网络有限公司(Apple Reality Spirit) |
        </RouterLink>
        <a href="https://beian.miit.gov.cn/" target="_blank" :underline="false">
          <el-icon>
            <Grid></Grid>
          </el-icon>
          沪ICP备15039333号 |
        </a>
        <a href="#">
          <el-icon>
            <InfoFilled></InfoFilled>
          </el-icon>
          202408
        </a>
      </div>
    </div>
  </body>
</template>

<style scoped lang="scss">
body {
  position: fixed;
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0;
}

.header,
.footer {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 7%;
  margin-right: 10px;
  background-color: #f1f1f1;
}

.logo {
  position: absolute;
  left: 10px;

  img {
    width: 32px;
    height: 32px;
    margin-left: 12px;
    vertical-align: middle;
  }

  .project_title {
    margin-left: 10px;
    font-family: "KaiTi", sans-serif;
    /* 添加通用字体族 */
    font-size: 14px;
    font-weight: 400;
    color: #909399;
  }
}

.blog {
  position: absolute;
  height: 60px;
  margin-left: 300px;
  font-size: 14px;
  font-weight: 400;
  line-height: 60px;
  color: #909399;

  &:hover {
    color: #000;
  }
}

.header-right {
  position: absolute;
  right: 10px;
}

.content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  background-image: url("/media/bg/02.jpg");
  background-size: 100% auto;

  .box1 {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 450px;
    height: 600px;
    background-color: #fff;

    .box2 {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 90%;
      height: 90%;
      padding: 25px;
      border: 1px solid #ebeefe;
      border-radius: 4px;

      &:hover {
        box-shadow: 0 0 10px rgb(0 0 0 / 10%);
        transition: all 0.4s;
      }

      h1 {
        margin-top: 0;
        font-family: "KaiTi", sans-serif;
        /* 添加通用字体族 */
        font-size: 36px;
        font-weight: 400;
        color: #666;
      }

      h4 {
        margin-top: 0;
        font-family: "KaiTi", sans-serif;
        /* 添加通用字体族 */
        font-size: 18px;
        font-weight: 400;
        color: #494949;
      }

      .box3 {
        align-self: center;
        width: 350px;
        height: 300px;
        margin-top: 20px;
        margin-bottom: 20px;
        background-color: #fff;
        border: 1px solid #ebeefe;

        &:hover {
          box-shadow: 0 0 10px rgb(0 0 0 / 20%);
          transition: all 0.4s;
        }
      }

      el-button {
        align-self: center;
        /* 水平居中 */
        margin-top: 2px;
        /* 上下间隔10px */
      }
    }
  }

  .login-title {
    margin: 20px 0;
    font-family: "KaiTi", sans-serif;
    /* 添加通用字体族 */
    font-weight: bold;
    color: #444;
    text-align: center;
  }

  .login-form {
    max-width: 100%;
    height: 100%;
    padding: 10px 40px 0 10px;
    margin-top: 36px;
  }

  .login-button {
    text-align: right;
  }

  .login-link {
    padding: 0 10px;
    margin-bottom: 20px;
  }

  .login-link a {
    font-family: "KaiTi", sans-serif;
    /* 添加通用字体族 */
    font-size: 16px;
    color: rgb(28 160 212);
  }

  .error-message {
    margin-top: 10px;
    font-family: "KaiTi", sans-serif;
    /* 添加通用字体族 */
    color: red;
    text-align: center;
  }
}

.footer {
  margin: 0 30px;
  font-size: 12px;
  line-height: 80px;
  text-align: center;

  .copyright {
    position: absolute;
    right: 10px;
  }

  .copyright a {
    font-family: "KaiTi", sans-serif;
    /* 添加通用字体族 */
    font-size: 14px;
    color: rgb(3 3 3);
  }

  .copyright a:hover {
    color: rgb(11 175 240);
  }
}

.fixed-footer {
  position: fixed;
  bottom: 0;
  z-index: 1;
  width: 100%;
}
</style>
