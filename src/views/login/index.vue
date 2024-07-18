<script setup lang="ts">
import { ref, computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { FormInstance } from "element-plus";
import { useUserStore } from "@/store/modules/user";
import { LoginData } from "@/api/auth/model";
import { TOKEN_KEY } from "@/enums/CacheEnum";

const userStore = useUserStore();

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
  console.log(data);
  const token = data.access_token;
  console.log(token);
  if (token) {
    setToken(token);
    router.push("/"); // 登录成功后重定向到首页
  } else {
    failed("登录响应中缺少 access_token");
  }
};

// 设置token
const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, "Bearer " + token);
};

// 登录失败
const failed = (message: any) => {
  error(message);
};

// 提交登录表单
function submit() {
  formRef.value?.validate((valid: boolean) => {
    if (valid) {
      userStore
        .login(form.value)
        .then((data) => {
          succeed(data);
        })
        .catch((error) => {
          failed(error);
        });
    }
  });
}
// const submit = () => {
//   formRef.value?.validate(async (valid: boolean) => {
//     if (valid) {
//       const res = await AuthAPI.login(form.value);
//       console.log("res:", res.data.access_token);
//     }
//   });
// };

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
        <img src="/public/favicon.ico" alt="" />
        <span class="project_title">Voxel Party</span>
      </RouterLink>
      <div class="header-right">
        <el-button>平台注册/登录</el-button>
      </div>
      <div class="blog">
        <a>开发博客</a>
      </div>
    </div>
    <div class="content">
      <div>
        <h2 class="login-title">登录账号</h2>
        <el-form
          ref="formRef"
          class="login-body"
          :rules="rules"
          :model="form"
          label-width="75px"
        >
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" suffix-icon="User" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              suffix-icon="Lock"
            />
          </el-form-item>

          <el-form-item class="login-button">
            <el-button style="width: 120px" type="primary" @click="submit">
              进入
            </el-button>
          </el-form-item>
        </el-form>
        <div class="login-link">
          <router-link to="/site/signup">
            <el-link type="primary" :underline="false">注册用户</el-link>
          </router-link>
          <br />
          <router-link to="/site/request-password-reset">
            <el-link type="primary" :underline="false">找回密码</el-link>
          </router-link>
          <br />
        </div>
        <div v-if="isShow" class="error-message">{{ title }}</div>
      </div>
    </div>
    <div class="footer">
      <div class="copyright">
        <a href="https://bujiaban.com/" target="_blank" :underline="false">
          <el-icon><HomeFilled /> </el-icon>
          上海不加班网络有限公司（https://bujiaban.com）
        </a>
        <!-- <br> -->
        <a href="https://beian.miit.gov.cn/" target="_blank" :underline="false">
          <el-icon><Document /></el-icon>
          沪ICP备15039333号
        </a>
        <a href="#">
          <el-icon><InfoFilled /></el-icon>
          2024
        </a>
      </div>
    </div>
  </body>
</template>

<style scoped lang="scss">
body {
  height: 100%;
  margin: 0;
  position: fixedg;
}

body {
  display: flex;
  flex-direction: column;
}

.header,
.footer {
  height: 7%;
  width: 100%;
  background-color: #f1f1f1;
  position: relative;
  display: flex;
  align-items: center;
  margin-right: 10px;
}

.logo {
  position: absolute;
  left: 10px;
  img {
    width: 32px;
    height: 32px;
    vertical-align: middle;
    margin-left: 12px;
  }
  .project_title {
    margin-left: 10px;
    color: #909399;
    font-size: 14px;
    font-family: "SourceHanSansSC-VF";
    font-weight: 400;
  }
}

.blog {
  position: absolute;
  margin-left: 300px;
  height: 60px;
  line-height: 60px;
  color: #909399;
  font-size: 14px;
  font-family: "SourceHanSansSC-VF";
  font-weight: 400;
  &:hover {
    color: #000000;
  }
}

.header-right {
  position: absolute;
  right: 10px;
}

.content {
  flex: 1;
  width: 100%;
  background-image: url("/public/media/bg/02.jpg");
  background-size: 100% auto;
  display: flex;
  align-items: center;
  justify-content: center;

  .login-title {
    margin: 20px 0;
    font-weight: bold;
    color: #444;
    text-align: center;
  }

  .login-body {
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
    font-size: 16px;
    color: rgb(28 160 212);
  }

  .error-message {
    margin-top: 10px;
    color: red;
    text-align: center;
  }
}

.footer {
  text-align: center;
  font-size: 12px;
  margin: 0 30px;
  line-height: 80px;
  .copyright {
    position: absolute;
    right: 10px;
  }
  .copyright a {
    color: rgb(3, 3, 3);
    padding: 0 20px;
    font-size: 14px;
  }
  .copyright a:hover {
    color: rgb(11, 175, 240);
  }
}
.fixed-footer {
  position: fixed;
  bottom: 0;
  width: 100%;
  z-index: 1;
}
</style>
