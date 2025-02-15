<template>
  <div v-loading="loading">
    <el-form ref="formRef" class="login-form" :rules="rules" :model="form" label-width="auto">
      <el-form-item :label="$t('login.username')" prop="username">
        <el-input v-model="form.username" suffix-icon="User"></el-input>
      </el-form-item>
      <el-form-item :label="$t('login.password')" prop="password">
        <el-input v-model="form.password" type="password" suffix-icon="Lock"></el-input>
      </el-form-item>

      <el-form-item class="login-button">
        <el-button style="width: 100%" type="primary" @click="submit">
          {{ $t("login.login") }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">

import request from "@/utils/request";
import { getUserInfoData, InfoType } from "@/api/user/model";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import Auth from "@/api/v1/auth";
import "@/assets/font/font.css";
import { FormInstance } from "element-plus";

import { useRouter, LocationQuery, useRoute } from "vue-router";
import { useUserStore } from "@/store";
const formRef = ref<FormInstance>();
const userStore = useUserStore();

const { t } = useI18n();

const router = useRouter();
const route = useRoute();
const { form } = storeToRefs(userStore);



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
const loading = ref<boolean>(false);

const submit = () => {
  formRef.value?.validate(async (valid: boolean) => {
    loading.value = true;
    if (valid) {
      try {
        await userStore.login(form.value);
        /*
        const response = await Auth.login(form.value);
        if (!response.data.success) {
          throw new Error("Login failed, please try again later.");
        }
        ElMessage.success(t("login.success"));
        const token = response.data.token;


        if (token) {
          localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
        } else {
          throw new Error("The login response is missing the access_token");
        }*/
        await nextTick();
        const ret = await request<getUserInfoData>({
          url: "v1/users/get-data",
          method: "get",
        });
        console.error(ret);
        await userStore.getUserInfo();
        userStore.setupRefreshInterval(form.value);
        const { path, queryParams } = parseRedirect();
        console.error({ path: path, query: queryParams });
        router.push({ path: path, query: queryParams });

      } catch (e: any) {

        let errorMessage = "Login failed, please try again later.";
        throw e;
      }
    } else {
      loading.value = false;
      ElMessage({ type: "error", message: t("login.error") });
    }
  });
};
</script>