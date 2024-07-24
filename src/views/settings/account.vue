<template>
  <div>
    <el-card class="box-card">
      <template #header>
        <div class="clearfix">
          <h3>账号设置</h3>
          <small>账号具体内容的配置和修改</small>
        </div>
      </template>
      <el-row :gutter="24">
        <el-col :xs="16" :sm="16" :md="12" :lg="10" :xl="10">
          <el-form
            ref="emailFormRef"
            :model="emailForm"
            label-width="100px"
            style="min-width: 300px"
          >
            <el-form-item
              v-if="
                typeof userData.email === 'undefined' ||
                userData.email === null ||
                !userData.emailBind
              "
              label="邮箱"
              prop="email"
              :rules="[
                { required: true, message: '请输入邮箱', trigger: 'blur' },
                {
                  type: 'email',
                  message: '请输入正确的邮箱地址',
                  trigger: ['blur', 'change'],
                },
              ]"
            >
              <el-input
                v-model="emailForm.email"
                autocomplete="off"
                type="email"
                placeholder="绑定邮箱"
              >
                <template #append>
                  <el-button
                    v-if="!userData.emailBind"
                    @click="postEmail"
                    :class="{ 'hover-blue': true }"
                  >
                    <div v-if="null === userData.email">绑定</div>
                    <div v-else>重新绑定</div>
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item
              v-else
              v-model="emailForm.email"
              label="邮箱"
              prop="email"
            >
              <el-tag>{{ userData.email }}</el-tag>
            </el-form-item>
          </el-form>
        </el-col>
      </el-row>
      <br />
      <el-row :gutter="24">
        <el-col :xs="16" :sm="16" :md="10" :lg="6" :xl="6">
          <el-form label-width="100px" style="min-width: 300px">
            <el-form-item label="账户密码">
              <el-button-group>
                <el-button type="warning" @click="dialogPasswordVisible = true">
                  修改密码
                </el-button>
                <el-button
                  disabled
                  type="warning"
                  @click="dialogPasswordVisible = true"
                >
                  找回密码
                </el-button>
              </el-button-group>
            </el-form-item>
          </el-form>
        </el-col>
      </el-row>
      <!-- 修改密码弹窗 -->
      <el-dialog
        title="修改密码"
        v-model="dialogPasswordVisible"
        :close-on-click-modal="false"
        style="min-width: 560px"
        @close="resetForm"
      >
        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-width="80px"
        >
          <el-row :gutter="24">
            <el-col :xs="20" :sm="20" :md="14" :lg="14" :xl="14" :offset="4">
              <el-form-item
                label="旧的密码"
                prop="oldPassword"
                style="margin-bottom: 26px"
              >
                <el-input
                  v-model="passwordForm.oldPassword"
                  type="password"
                  autocomplete="off"
                ></el-input>
              </el-form-item>

              <el-form-item
                label="新的密码"
                prop="password"
                style="margin-bottom: 26px"
              >
                <el-input
                  v-model="passwordForm.password"
                  type="password"
                  autocomplete="off"
                ></el-input>
              </el-form-item>

              <el-form-item
                label="确认密码"
                prop="checkPassword"
                style="margin-bottom: 26px"
              >
                <el-input
                  v-model="passwordForm.checkPassword"
                  type="password"
                  autocomplete="off"
                ></el-input>
              </el-form-item>

              <el-form-item>
                <el-button
                  style="width: 100%"
                  type="primary"
                  @click="resetPassword"
                >
                  确认修改
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

const userStore = useUserStore();

const userData = computed(() => userStore.userInfo.data);

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
    { required: true, message: "请输入旧密码", trigger: "blur" },
    { min: 6, message: "密码长度应该大于6", trigger: "blur" },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value === "") {
          callback(new Error("旧密码不能为空"));
        } else if (value === passwordForm.value.password) {
          callback(new Error("新密码不能和旧密码一致!"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度应该大于6", trigger: "blur" },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value === "") {
          callback(new Error("请输入密码"));
        } else if (value === passwordForm.value.oldPassword) {
          callback(new Error("新密码不能和旧密码一致!"));
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
    { required: true, message: "请输入校验密码", trigger: "blur" },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value === "") {
          callback(new Error("请再次输入密码"));
        } else if (value !== passwordForm.value.password) {
          callback(new Error("两次输入密码不一致!"));
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
        ElMessage.success("密码修改成功");
      } catch (error) {
        ElMessage.error("密码修改失败");
      }
    } else {
      ElMessage({ type: "error", message: "表单校验未通过" });
    }
  });
};

const postEmail = async () => {
  emailFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        await bindEmail(emailForm.value.email!);
        ElMessage.success("绑定成功");
      } catch (error) {
        ElMessage.error("绑定失败");
      }
    } else {
      ElMessage({ type: "error", message: "表单校验未通过" });
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
