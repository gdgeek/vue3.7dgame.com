<template>
  <div v-loading="loading" :class="['box1', { 'dark-theme': isDark }]">
    <div :class="['box2', { 'dark-theme': isDark }]">
      <h1>{{ $t("login.h1") }}</h1>
      <h4>{{ $t("login.h4") }}</h4>
      <br />
      <el-tabs style="width: 100%" type="border-card" :stretch="true">
        <el-tab-pane label="Apple ID">
          <h2 class="login-title">Use Apple Account</h2>

          <br />
          <vue-apple-login
            @click="loading = true"
            class="appleid_button"
            width="100%"
            height="100px"
            mode="center-align"
            type="sign in"
            :color="appleLoginColor"
            :key="isDark"
            :onSuccess="onSuccess"
            :onFailure="onFailure"
          ></vue-apple-login>
          <br />
          <br />
        </el-tab-pane>
        <el-tab-pane label="Name & Password">
          <h2 class="login-title">{{ $t("login.loginTitle") }}</h2>
          <el-form
            ref="formRef"
            class="login-form"
            :rules="rules"
            :model="form"
            label-width="auto"
          >
            <el-form-item :label="$t('login.username')" prop="username">
              <el-input v-model="form.username" suffix-icon="User"></el-input>
            </el-form-item>
            <el-form-item :label="$t('login.password')" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                suffix-icon="Lock"
              ></el-input>
            </el-form-item>

            <el-form-item class="login-button">
              <el-button style="width: 100%" type="primary" @click="submit">
                {{ $t("login.login") }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>
<script setup lang="ts">
import "@/assets/font/font.css";
import { useSettingsStore } from "@/store/modules/settings";
import { FormInstance } from "element-plus";
import { ThemeEnum } from "@/enums/ThemeEnum";
import type { AppleIdReturn } from "@/api/v1/site";
import AuthAPI from "@/api/auth/index";
import { PostSiteAppleId } from "@/api/v1/site";
import { VueAppleLoginConfig } from "@/utils/helper";
import { LoginData } from "@/api/auth/model";
import { useUserStore } from "@/store";

const formRef = ref<FormInstance>();
const settingsStore = useSettingsStore();

const isDark = computed<boolean>(() => settingsStore.theme === ThemeEnum.DARK);
const appleLoginColor = computed(() => (isDark.value ? "black" : "white"));

const loading = ref<boolean>(false);

const { t } = useI18n();
const form = ref<LoginData>({
  username: "",
  password: "",
});

const rules = computed(() => {
  return {
    username: [
      {
        required: true,
        message: t("login.rules.username.message1"),
        trigger: "blur",
      },
      {
        min: 4,
        max: 20,
        message: t("login.rules.username.message2"),
        trigger: "blur",
      },
    ],
    password: [
      {
        required: true,
        message: t("login.rules.password.message1"),
        trigger: "blur",
      },
      {
        min: 6,
        max: 20,
        message: t("login.rules.password.message2"),
        trigger: "blur",
      },
    ],
  };
});
const emit = defineEmits(["register", "enter"]);
const login = async (data: any) => {
  return new Promise<void>((resolve, reject) => {
    emit("enter", data, form, resolve, reject);
  });
};

const submit = () => {
  formRef.value?.validate(async (valid: boolean) => {
    loading.value = true;
    if (valid) {
      try {
        const respose = await AuthAPI.login(form.value);
        console.log(respose.data);
        await login(respose.data);
      } catch (e: any) {
        ElMessage.error(e.message);
        loading.value = false;
      }
    } else {
      loading.value = false;
      ElMessage({ type: "error", message: t("login.error") });
    }
    //loading.value = false;
  });
};

useUserStore().refreshInterval = setInterval(() => {
  try {
    submit();
    console.log("Refresh login", form.value);
  } catch {
    console.log("Failed to refresh login");
  }
}, 3600000);

const onFailure = async (error: any) => {
  loading.value = false;
  ElMessage({ type: "error", message: t("login.appleLoginFail") });
  console.error(error);
  return;
};
const onSuccess = async (data: any) => {
  const respose = await PostSiteAppleId({
    key: "APPLE_MRPP_KEY_ID",
    url: VueAppleLoginConfig.redirectURI,
    data: data,
  });
  const ret: AppleIdReturn = respose.data;
  if (ret.user === null) {
    emit("register", {
      apple_id: ret.apple_id,
      token: ret.token,
    });
    // 用户不存在，跳转到注册页面
  } else {
    try {
      await login(ret.user);
    } catch (e: any) {
      ElMessage.error(e.message);
      loading.value = false;
    }
    // emit("login", ret.user);
  }
  //loading.value = false;
};
</script>

<style scoped lang="scss">
body {
  position: fixed;
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0;
  background-image: url("/media/bg/02.jpg");
  background-size: 100% auto;
  // transition:  0.3s ease;

  &.dark-theme {
    background-image: url("/media/bg/02.jpg");
    filter: brightness(80%);
  }
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 7%;
  margin-right: 10px;
  background-color: #f1f1f1;

  transition: background-color 0.3s ease;
  padding: 10px;

  &.dark-theme {
    background-color: rgb(37, 37, 37);
  }
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
    font-size: 14px;
    font-weight: 400;
    &:hover {
      color: #3876c2;
    }
  }
}

.header-right {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-right: 20px;
    width: 100%;
    padding: 10px;
  }
}

.content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;

  .box1 {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 450px;
    height: 90%;
    background-color: #fff;

    transition: all 0.3s ease;

    &.dark-theme {
      background-color: rgb(63, 63, 63);
      border-color: #494949;
      color: white;
    }

    .box2 {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 90%;
      height: 90%;
      padding: 25px;
      border: 1px solid #ebeefe;
      border-radius: 4px;

      transition: all 0.3s ease;

      &.dark-theme {
        background-color: rgb(52, 52, 52);
        border-color: #494949;
        color: white;
      }

      &:hover {
        box-shadow: 0 0 10px rgb(0 0 0 / 10%);
        transition: all 0.4s;
      }

      h1 {
        margin-top: 0;
        font-family: "KaiTi", sans-serif;
        font-size: 36px;
        font-weight: 400;
      }

      h4 {
        margin-top: 0;
        font-family: "KaiTi", sans-serif;
        font-size: 18px;
        font-weight: 400;
      }

      el-button {
        align-self: center;
        margin-top: 2px;
      }
    }
  }

  .login-title {
    margin: 20px 0;
    font-family: "KaiTi", sans-serif;
    font-weight: bold;
    text-align: center;
  }

  .login-form {
    max-width: 100%;
    height: 100%;
    // padding: 10px 0px 10px 0px;
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
    font-size: 16px;
    color: rgb(28 160 212);
  }

  .error-message {
    margin-top: 10px;
    font-family: "KaiTi", sans-serif;
    color: red;
    text-align: center;
  }
}
</style>
