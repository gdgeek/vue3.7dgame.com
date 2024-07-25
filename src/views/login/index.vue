<script setup lang="ts">
import "@/assets/font/font.css";
import { ref, computed } from "vue";
import { RouterLink, useRouter, LocationQuery, useRoute } from "vue-router";
import { FormInstance } from "element-plus";
import { useUserStore } from "@/store/modules/user";
import { LoginData } from "@/api/auth/model";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import AuthAPI from "@/api/auth/index";

const userStore = useUserStore();
const route = useRoute();

const form = ref<LoginData>({
  username: "huyuelong",
  password: "123456hu",
});

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

// 登录成功
const succeed = (data: any) => {
  ElMessage.success("登录成功");
  const token = data.access_token;
  console.log("token:", token);
  if (token) {
    setToken(token);
    const res = localStorage.getItem(TOKEN_KEY);
    console.log("Token set successfully", res);
    nextTick(() => {
      router.push("/"); // 确保目标路径正确
      console.log("Routing to home"); // 确认路由跳转
    });
    // const { path, queryParams } = parseRedirect();
    // console.log("路由：", path, queryParams);
    // router.push({ path: path, query: queryParams });
  } else {
    failed("登录响应中缺少 access_token");
  }
};

// 设置token
const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, "Bearer " + token);
};

// 解析 redirect 字符串 为 path 和  queryParams
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

// 登录失败
const failed = (message: any) => {
  error(message);
};

// 提交登录表单
// function submit() {
//   formRef.value?.validate((valid: boolean) => {
//     if (valid) {
//       AuthAPI.login(form.value)
//         .then((data) => {
//           console.log("data", data.data);
//           succeed(data.data);
//           userStore.getUserInfo();
//           const { path, queryParams } = parseRedirect();
//           console.log("path:", path, "queryParams:", queryParams);
//           router.push({ path: path, query: queryParams });
//         })
//         .catch((error) => {
//           failed(error);
//         });
//     }
//   });
// }

const submit = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const res = await AuthAPI.login(form.value);
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

// 显示错误信息
const error = (msg: string | Record<string, string>) => {
  title.value =
    typeof msg === "string"
      ? msg
      : Object.keys(msg)
          .map((key) => `${key} : ${msg[key]}`)
          .join("\n");
  isShow.value = true;
};
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
            <div v-if="isShow" class="error-message">{{ title }}</div>
          </div>
          <el-button
            style="width: 100%"
            @click="$router.push({ path: '/site/download' })"
            size="small"
          >
            下载相关程序
          </el-button>
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
          上海不加班网络有限公司(Apple Reality Spirit)
        </RouterLink>
        <!-- <br> -->
        <a href="https://beian.miit.gov.cn/" target="_blank" :underline="false">
          <el-icon><List></List></el-icon>
          沪ICP备15039333号
        </a>
        <a href="#">
          <el-icon>
            <InfoFilled></InfoFilled>
          </el-icon>
          2024
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
    font-family: SourceHanSansSC-VF, sans-serif;
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
        font-family: SourceHanSansSC-VF, sans-serif;
        /* 添加通用字体族 */
        font-size: 36px;
        font-weight: 400;
        color: #666;
      }

      h4 {
        margin-top: 0;
        font-family: SourceHanSansSC-VF, sans-serif;
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
    font-family: SourceHanSansSC-VF, sans-serif;
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
    font-family: SourceHanSansSC-VF, sans-serif;
    /* 添加通用字体族 */
    font-size: 16px;
    color: rgb(28 160 212);
  }

  .error-message {
    margin-top: 10px;
    font-family: SourceHanSansSC-VF, sans-serif;
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
    padding: 0 10px;
    font-family: SourceHanSansSC-VF, sans-serif;
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
