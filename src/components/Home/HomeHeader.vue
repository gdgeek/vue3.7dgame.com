<template>
  <div class="home-header">


    <el-row :gutter="10">
      <el-col :md="14" :span="24">

        <div :class="['home-avatar-container', { mobile: isMobile }]">
          <el-avatar shape="square" class="home-avatar-child" icon="avatar" :src="avatarUrl" :size="100"
            style="float: left" @click="showQRCode()"></el-avatar>

          <div>
            <div class="home-avatar-info">
              <h3 class="home-avatar-name">{{ greeting }} {{ name }}</h3>
              <small v-if="textarea != ''" style="color: #777777">
                {{ textarea }}
              </small>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :md="10" :span="24">
        <div class="hidden-sm-and-down hidden-box"></div>
        <div :class="['home-header-button', { mobile: isMobile }]">

          <!--一个二维码icon按钮 -->
          <el-button size="small" type="primary" :icon="Menu" @click="showQRCode()">
            {{ t("login.loginCode") }}
          </el-button>
          <el-button size="small" type="primary" @click="gotoEdit">{{
            $t("homepage.edit.title")
          }}</el-button>
        </div>
      </el-col>
    </el-row>
  </div>

  <QRCodeDialog ref="codeDialog" />

</template>

<script setup lang="ts">
import QRCodeDialog from "./QRCodeDialog.vue";
import LocalPage from "@/components/Home/LocalPage.vue";
import QrcodeVue from "qrcode.vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/store/modules/user";
import { useScreenStore } from "@/store";


import { Menu } from "@element-plus/icons-vue";
const codeDialog = ref<any>(null);

const userStore = useUserStore();
const router = useRouter();
const { t } = useI18n();
const screenStore = useScreenStore();
const isMobile = computed(() => screenStore.isMobile);

const name = computed(() => {
  if (userStore.userInfo === null || userStore.userInfo.userData === null) {
    return "";
  }
  if (userStore.userInfo.userData.nickname) {
    return userStore.userInfo.userData.nickname;
  } else {
    return userStore.userInfo.userData.username;
  }
});

const greeting = computed(() => {
  const hours = new Date().getHours();
  if (6 < hours && hours < 12) {
    return t("homepage.greeting.morning");
  } else if (hours < 13) {
    return t("homepage.greeting.noon");
  } else if (hours < 18) {
    return t("homepage.greeting.afternoon");
  } else {
    return t("homepage.greeting.evening");
  }
});

// 头像
const avatarUrl = computed(() => {
  if (!userStore?.userInfo?.userInfo) {
    return "";
  }
  return userStore.userInfo.userInfo.avatar?.url ?? "";
});

// 个人简介
const textarea = computed(() => {
  if (!userStore?.userInfo?.userInfo) {
    return "";
  }
  return userStore.userInfo.userInfo.info?.textarea ?? "";
});
const showQRCode = () => {
  codeDialog.value.openDialog();
}
const gotoEdit = () => {
  router.push("/settings/edit");
};
</script>

<style lang="scss" scoped>
.home-avatar-name {
  margin: 16px 0 10px;
  font-size: 18px;
  font-weight: 700;
  color: #555;
}

.home-header {
  min-height: 150px;
  width: auto;
  // background-image: url("/media/image/header_bg.jpg");
  background-image: url("/media/image/bgcsky.jpg");
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
}

.hidden-box {
  height: 90px;
}

.home-header-button {
  float: right;
  margin: 22px 50px 18px 0;

  &.mobile {
    margin: 20px 15px 18px 0;
  }
}

.home-avatar-container {
  // outline: dashed 1px black;

  /* Setup */
  position: relative;
  height: 100px;
  margin-top: 25px;
  margin-right: 50px;
  margin-left: 50px;

  &.mobile {
    margin-left: 15px;
  }
}

.home-avatar-info {
  position: absolute;
  margin-top: 10px;
  margin-left: 120px;
}

.home-avatar-child {
  position: absolute;
  top: 50%;
  left: 0%;
  width: 100px;
  height: 100px;
  margin-top: -50px;
  /* Half this element's height */
  // margin-left: -50px; /* Half this element's height */
}

.el-col {
  border-radius: 4px;
}

.bg-purple-dark {
  background: #99a9bf;
}

.bg-purple {
  background: #d3dce6;
}

.bg-purple-light {
  background: #e5e9f2;
}

.grid-content {
  min-height: 36px;
  border-radius: 4px;
}
</style>
