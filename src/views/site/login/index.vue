<template>

  <div class="content">
    <login-form :isMobile="isMobile" ref="loginFormRef" @enter="enter"></login-form>

  </div>

</template>

<script setup lang="ts">
import "@/assets/font/font.css";
import { useRouter, LocationQuery, useRoute } from "vue-router";
import { AppleIdToken } from "@/api/auth/model";
import LoginForm from "@/components/LoginForm.vue";
import { useUserStore, useScreenStore } from "@/store";
import { TOKEN_KEY } from "@/enums/CacheEnum";


const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { t } = useI18n();
const loginFormRef = ref<InstanceType<typeof LoginForm>>();
const screenStore = useScreenStore();
const isMobile = computed(() => screenStore.isMobile);

const parseRedirect = (): {
  path: string;
  queryParams: Record<string, string>;
} => {
  const query: LocationQuery = route.query;
  const redirect = (query.redirect as string) ?? "/";
  const url = new URL(redirect, window.location.origin);
  const path = url.pathname;
  const queryParams: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  return { path, queryParams };
};

const enter = async (
  user: any,
  form: any,
  resolve: () => void,
  reject: (message: string) => void
) => {
  try {
    ElMessage.success(t("login.success"));
    const token = user.auth;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      nextTick();
    } else {
      ElMessage.error("The login response is missing the access_token");
    }
    await userStore.getUserInfo();

    userStore.setupRefreshInterval(form.value);

    const { path, queryParams } = parseRedirect();
    router.push({ path: path, query: queryParams });
    resolve();
  } catch (e: any) {
    reject(e.message);
  }
};

const appleIdToken = ref<AppleIdToken | null>(null);
const register = (idToken: AppleIdToken) => {
  appleIdToken.value = idToken;
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
  width: 102%;
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
    width: 30px;
    height: 30px;
    margin-left: 20px;
    vertical-align: middle;
  }
}

.project_title {
  margin-left: 10px;
  font-family: "KaiTi", sans-serif;
  // font-size: 14px;
  font-weight: 600;

  &:hover {
    color: #3876c2;
  }
}

.header-right {
  position: absolute;
  top: 0px;
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

    &.mobile {
      margin-right: 0px;
    }
  }
}

.content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;

  .login-title {
    margin: 20px 0;
    font-family: "KaiTi", sans-serif;
    font-weight: bold;
    text-align: center;
  }

  .login-form {
    max-width: 100%;
    height: 100%;
    padding: 10px 0px 10px 0px;
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

.box {
  position: relative;
  height: auto;
  width: 400px;
  max-width: 100%;
  padding: 10px 10px 10px 10px;
  margin: 0 auto;
  margin-bottom: 20px;
  border-radius: 5px;
  background-color: #fff;
  overflow: hidden;

  transition: all 0.3s ease;

  &.dark-theme {
    background-color: rgb(63, 63, 63);
    border-color: #494949;
    color: white;
  }
}

.logout-head {
  padding: 10px;
  max-width: 100%;
}

.logout-title {
  font-size: 14px;
  padding: 10px;
  text-align: center;
  color: #666;
}

.logout-welcome {
  margin-top: 20px;
  font-size: 36px;
  font-weight: normal;
  color: #666;
}

.logout-text {
  font-size: 21px;
  font-weight: lighter;
  color: #666;
}

.logout-lead {
  font-size: 21px;
  font-weight: lighter;
  color: #666;
}
</style>
