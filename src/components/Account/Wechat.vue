<template>
  <el-button style="width: 100%; height: 28px;" type="success" @click="login">
    <el-icon>
      <ChatRound />
    </el-icon>&nbsp;&nbsp; 微信登陆/注册
  </el-button>
  {{ env.auth_api }}
</template>

<script setup lang="ts">
import env from "@/environment";
import { getQrcode } from "@/api/auth/wechat";
const login = async function async() {
  const ret = await getQrcode();
  alert(JSON.stringify(ret.data));
}
</script>