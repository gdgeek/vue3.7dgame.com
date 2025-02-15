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
import Qrcode from "./Qrcode.vue";

import { useRouter } from "vue-router";
const router = useRouter();
import { getQrcode, refresh } from "@/api/auth/wechat";
let url = ref("");

const dialogVisible = ref(false)
let intervalId: NodeJS.Timeout | string | number | undefined = undefined;
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
  if (response.data.result) {


    close();
    if (response.data.message === 'signup') {

      router.push({ name: "register" });

      alert('注册');
    } else if (response.data.message === 'signin')
      alert('登陆');
  }
  // 登陆成功
  //跳转到注册页面

  console.error('扫描成功');
};
let token: string | null = null;
const login = async function async() {


  const ret = await getQrcode();
  console.error('!!!!', ret);
  intervalId = setInterval(fetchRefresh, 3000);// 返回什么类型
  url.value = ret.data.qrcode.url;
  token = ret.data.token;
  dialogVisible.value = true;

}
</script>