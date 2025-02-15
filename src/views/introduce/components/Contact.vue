<template>
  <div class="portal-main-background">
    <div class="content" align="center">
      <h1 style="color: whitesmoke">请即刻联系我们，开展定制业务</h1>
    </div>
    <div class="content-contact" align="right">
      <p class="text font-text">
        <img
          src="/media/bg/phone-icon.png"
          align="absmiddle"
          alt=""
          height="36px"
        />
        服务电话 15000159790
      </p>
      <p class="text font-text">
        <img
          src="/media/bg/wechat-icon.png"
          align="absmiddle"
          alt=""
          height="36px"
        />
        服务微信 15000159790
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/font/font.css";

defineOptions({
  name: "Contact",
});
</script>

<style lang="scss" scoped>
.portal-main-background {
  width: 100%;
  height: 455px;
  background: url("/media/bg/Contact.jpg") center no-repeat;
  background-size: cover;
  // background-size: 100%;
}

.text {
  color: whitesmoke;
}

.content {
  padding-top: 36px;
}

.content-contact {
  align-items: center;
  padding: 150px 112px 0 0;
  font-size: 20px;
  line-height: 20px;
}
</style>
