<template>
  <el-button style="width: 100%; height: 28px;" type="success" @click="login">
    <el-icon>
      <ChatRound />
    </el-icon>&nbsp;&nbsp; 微信登陆/注册
  </el-button>

  <el-dialog v-model="dialogVisible" title="微信扫码" width="400" @close="close">

    <qrcode style="width:100%" :text="url" />

  </el-dialog>
</template>

<script setup lang="ts">

import { useUserStore } from "@/store";
import Qrcode from "./Qrcode.vue";
import { getQrcode, refresh } from "@/api/auth/wechat";
let url = ref("");

import { useRouter, LocationQuery, useRoute } from "vue-router";
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const dialogVisible = ref(false)
let intervalId: NodeJS.Timeout | string | number | undefined = undefined;


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

const close = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
  dialogVisible.value = false;
  // refresh();
};
const fetchRefresh = async () => {
  const response = await refresh(token);
  if (response.data.success) {


    close();
    if (response.data.message === 'signup') {
      router.push({ path: '/site/register', query: { token: response.data.token } });
    } else if (response.data.message === 'signin') {
      await userStore.loginByWechat({ token: response.data.token });

      await userStore.getUserInfo();


      const { path, queryParams } = parseRedirect();
      console.error({ path: path, query: queryParams });
      router.push({ path: path, query: queryParams });
    }

  }
  // 登陆成功
  //跳转到注册页面

  console.error(response.data);
};
let token: string | null = null;
const login = async function async() {


  const ret = await getQrcode();
  //console.error('!!!!', ret);
  intervalId = setInterval(fetchRefresh, 3000);// 返回什么类型
  url.value = ret.data.qrcode.url;
  token = ret.data.token;
  dialogVisible.value = true;

}
</script>
