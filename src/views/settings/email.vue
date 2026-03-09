<template>
  <TransitionWrapper>
    <div>
      <br />
      <el-card class="box-card">
        <el-row>
          <el-col>
            <div class="box-title">
              <h3 class="font-color">
                {{ $t("homepage.edit.emailVerification") }}
              </h3>
              <small>{{
                $t("homepage.edit.emailVerificationStatement")
              }}</small>
            </div>
          </el-col>
          <el-col style="text-align: right">
            <router-link to="/settings/edit">
              <el-button size="small">{{ $t("common.back") }}</el-button>
            </router-link>
          </el-col>
        </el-row>

        <el-divider></el-divider>

        <el-row :gutter="24">
          <el-col
            :xs="23"
            :sm="16"
            :md="14"
            :lg="12"
            :xl="10"
            class="section-margin-left box-margin-bottom"
          >
            <EmailVerificationPanel></EmailVerificationPanel>
          </el-col>
        </el-row>
      </el-card>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import EmailVerificationPanel from "@/components/Account/EmailVerificationPanel.vue";
</script>

<style lang="scss" scoped>
@media screen and (min-width: 900px) {
  .section-margin-left {
    margin-left: 12%;
  }
}

.box-card {
  margin: 1.6% 1.6% 0.6%;
}

.box-title {
  line-height: 10px;
  padding: 2px 0;
  margin-left: 1%;

  small {
    color: #6f6f6f;
  }
}

.box-margin-bottom {
  margin-bottom: 28px;
}

.font-color {
  font-weight: 500;
}
</style>
