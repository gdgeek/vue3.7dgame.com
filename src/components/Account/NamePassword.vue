<template>
  <div v-loading="loading">
    <el-form ref="formRef" class="login-form" :rules="rules" :model="form" label-width="auto">
      <el-form-item :label="$t('login.username')" prop="username">
        <el-input v-model="form.username" suffix-icon="Message"></el-input>
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
import { UserInfoReturnType } from "@/api/user/model";

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

import type { FormItemRule } from "element-plus";

const rules = computed<Record<string, FormItemRule[]>>(() => {
  return {
    username: [
      {
        required: true,
        message: t("login.rules.username.message1"),
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
        max: 32,
        message: t("login.rules.password.message2"),
        trigger: "blur",
      },
      {
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/i,
        message: t("login.rules.password.message3"),
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


        await userStore.getUserInfo();
        const { path, queryParams } = parseRedirect();
        router.push({ path: path, query: queryParams });
      } catch (e: any) {
        let errorMessage = "Login failed, please try again later.";
        throw e;
      }
    } else {
      loading.value = false;
      ElMessage({ type: "error", message: "Login failed, please try again later." });
    }
  });
};
</script>
