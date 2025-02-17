<template>
  <div>
    <el-card class="box-card">
      <template #header>
        <div class="clearfix">
          <h3>{{ $t("homepage.account.title") }}</h3>
          <small>{{ $t("homepage.account.titleStatement") }}</small>
        </div>
      </template>
      <el-row :gutter="24">
        <el-col :xs="16" :sm="16" :md="12" :lg="10" :xl="10">
          <el-form ref="emailFormRef" :model="emailForm" label-width="auto" style="min-width: 300px">
            <el-form-item v-if="
              typeof email === 'undefined' ||
              email === null ||
              !emailBind
            " :label="$t('homepage.account.label1')" prop="email" :rules="[
              {
                required: true,
                message: $t('homepage.account.rules1.message1'),
                trigger: 'blur',
              },
              {
                type: 'email',
                message: $t('homepage.account.rules1.message2'),
                trigger: ['blur', 'change'],
              },
            ]">
              <el-input v-model="emailForm.email" autocomplete="off" type="email"
                :placeholder="$t('homepage.account.placeholder')">
                <template #append>
                  <el-button v-if="!emailBind" @click="postEmail" :class="{ 'hover-blue': true }">
                    <div v-if="null === email">
                      {{ $t("homepage.account.bind") }}
                    </div>
                    <div v-else>{{ $t("homepage.account.rebind") }}</div>
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item v-else v-model="emailForm.email" :label="$t('homepage.account.label1')" prop="email">
              <el-tag>{{ email }}</el-tag>
            </el-form-item>
          </el-form>
        </el-col>
      </el-row>
      <br />
      <el-row :gutter="24">
        <el-col :xs="16" :sm="16" :md="10" :lg="9" :xl="6">
          <el-form label-width="auto" style="min-width: 300px">
            <el-form-item :label="$t('homepage.account.label2')">
              <el-button-group>
                <el-button type="warning" @click="dialogPasswordVisible = true">
                  {{ $t("homepage.account.change") }}
                </el-button>
                <el-button disabled type="warning" @click="dialogPasswordVisible = true">
                  {{ $t("homepage.account.recover") }}
                </el-button>
              </el-button-group>
            </el-form-item>
          </el-form>
        </el-col>
      </el-row>
      <!-- 修改密码弹窗 -->
      <el-dialog v-model="dialogPasswordVisible" :close-on-click-modal="false" style="min-width: 560px"
        @close="resetForm">
        <template #header> {{ $t("homepage.account.change") }} </template>
        <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="auto">
          <el-row :gutter="24">
            <el-col :xs="20" :sm="20" :md="14" :lg="14" :xl="14" :offset="4">
              <el-form-item :label="$t('homepage.account.label3')" prop="oldPassword" style="margin-bottom: 26px">
                <el-input v-model="passwordForm.oldPassword" type="password" autocomplete="off"></el-input>
              </el-form-item>

              <el-form-item :label="$t('homepage.account.label4')" prop="password" style="margin-bottom: 26px">
                <el-input v-model="passwordForm.password" type="password" autocomplete="off"></el-input>
              </el-form-item>

              <el-form-item :label="$t('homepage.account.label5')" prop="checkPassword" style="margin-bottom: 26px">
                <el-input v-model="passwordForm.checkPassword" type="password" autocomplete="off"></el-input>
              </el-form-item>

              <el-form-item>
                <el-button style="width: 100%" type="primary" @click="resetPassword">
                  {{ $t("homepage.account.confirm") }}
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-dialog>
      <!-- 修改密码弹窗结束 -->
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useUserStore } from "@/store/modules/user";
import {
  bindEmail,
  resetPassword as apiResetPassword,
} from "@/api/user/server";
import type { FormInstance } from "element-plus";

const { t } = useI18n();

const userStore = useUserStore();
const email = ref("email");
const emailBind = ref(true);

const emailForm = ref({
  email: null as string | null,
});

const dialogPasswordVisible = ref(false);
const passwordFormRef = ref<FormInstance>();
const emailFormRef = ref<FormInstance>();

const passwordForm = ref({
  oldPassword: null as string | null,
  password: null as string | null,
  checkPassword: null as string | null,
});

const passwordRules = {
  oldPassword: [
    {
      required: true,
      message: t("homepage.account.rules2.old.message1"),
      trigger: "blur",
    },
    {
      min: 6,
      message: t("homepage.account.rules2.old.message2"),
      trigger: "blur",
    },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value === "") {
          callback(new Error(t("homepage.account.rules2.old.error1")));
        } else if (value === passwordForm.value.password) {
          callback(new Error(t("homepage.account.rules2.old.error2")));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  password: [
    {
      required: true,
      message: t("homepage.account.rules2.new.message1"),
      trigger: "blur",
    },
    {
      min: 6,
      message: t("homepage.account.rules2.new.message2"),
      trigger: "blur",
    },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value === "") {
          callback(new Error(t("homepage.account.rules2.new.error1")));
        } else if (value === passwordForm.value.oldPassword) {
          callback(new Error(t("homepage.account.rules2.new.error2")));
        } else {
          if (passwordForm.value.checkPassword !== "") {
            // 如果 passwordForm.checkPassword 不为空，则手动触发确认密码字段的验证。
            passwordFormRef.value?.validateField("checkPassword");
          }
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  checkPassword: [
    {
      required: true,
      message: t("homepage.account.rules2.check.message1"),
      trigger: "blur",
    },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value === "") {
          callback(new Error(t("homepage.account.rules2.check.error1")));
        } else if (value !== passwordForm.value.password) {
          callback(new Error(t("homepage.account.rules2.check.error2")));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

// 关闭弹窗，重置表单
const resetForm = () => {
  passwordForm.value.oldPassword = null;
  passwordForm.value.password = null;
  passwordForm.value.checkPassword = null;
};

const resetPassword = () => {
  passwordFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        await apiResetPassword(
          passwordForm.value.oldPassword!,
          passwordForm.value.password!
        );
        ElMessage.success(t("homepage.account.validate1.success"));
      } catch (error) {
        ElMessage.error(t("homepage.account.validate1.error1"));
      }
    } else {
      ElMessage({
        type: "error",
        message: t("homepage.account.validate1.error2"),
      });
    }
  });
};

const postEmail = async () => {
  emailFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        await bindEmail(emailForm.value.email!);
        ElMessage.success(t("homepage.account.validate2.success"));
      } catch (error) {
        ElMessage.error(t("homepage.account.validate2.error1"));
      }
    } else {
      ElMessage({
        type: "error",
        message: t("homepage.account.validate2.error2"),
      });
    }
  });
};
</script>

<style lang="scss" scoped>
.box-card {
  margin: 1.6% 1.6% 0.6%;
  padding: 0% 1%;
}

.hover-blue:hover {
  background-color: rgb(75, 109, 183) !important;
  color: white !important;
}
</style>
