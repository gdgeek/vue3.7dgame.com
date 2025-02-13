<template>
  <el-button style="width: 100%; height: 28px;" type="success" @click="login">
    <el-icon>
      <ChatRound />
    </el-icon>&nbsp;&nbsp; 微信登陆/注册
  </el-button>

  <el-dialog v-model="dialogVisible" title="微信扫码" width="400">

    <qrcode style="width:100%" :text="url" />

  </el-dialog>
</template>

<script setup lang="ts">
import Qrcode from "./Qrcode.vue";

const dialogVisible = ref(false)
import env from "@/environment";
import { getQrcode } from "@/api/auth/wechat";
let url = ref("a");
const login = async function async() {

  const ret = await getQrcode();

  url.value = ret.data.qrcode.url;
  dialogVisible.value = true;
  //const ret = await getQrcode();

  // url.value = ret.data.qrcode.url;
}
</script>