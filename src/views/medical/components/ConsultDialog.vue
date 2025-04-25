<template>
  <div>
    <el-dialog v-model="dialogVisible" title="预约医疗咨询" width="500px" :close-on-click-modal="false"
      :close-on-press-escape="true" destroy-on-close>
      <div class="consult-form">
        <div class="form-header">
          <div class="form-icon">
            <el-icon class="icon-wrapper">
              <Clock />
            </el-icon>
          </div>
          <div class="form-title">
            <h3>填写您的信息</h3>
            <p>我们将尽快与您联系安排咨询</p>
          </div>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <el-form-item label="您的姓名" prop="name">
            <el-input v-model="form.name" placeholder="请输入您的姓名"></el-input>
          </el-form-item>

          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入您的联系电话"></el-input>
          </el-form-item>

          <el-form-item label="电子邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入您的电子邮箱"></el-input>
          </el-form-item>

          <el-form-item label="咨询类型" prop="serviceType">
            <el-select v-model="form.serviceType" placeholder="请选择咨询类型" style="width: 100%">
              <el-option label="牙科AR应用" value="dental"></el-option>
              <el-option label="外科手术AR辅助" value="surgery"></el-option>
              <el-option label="医学培训AR系统" value="training"></el-option>
              <el-option label="医疗设备AR维护" value="maintenance"></el-option>
              <el-option label="其他医疗AR应用" value="other"></el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="咨询内容" prop="message">
            <el-input v-model="form.message" type="textarea" :rows="3" placeholder="请简要描述您的需求或问题"></el-input>
          </el-form-item>

          <el-form-item label="预约时间" prop="appointmentDate">
            <el-date-picker v-model="form.appointmentDate" type="datetime" placeholder="选择预约时间"
              format="YYYY-MM-DD HH:mm" style="width: 100%" :disabled-date="disabledDate"
              :disabled-hours="disabledHours"></el-date-picker>
          </el-form-item>

          <div class="form-privacy">
            <el-checkbox v-model="form.agreement">
              我同意根据<el-link type="primary" href="#" class="privacy-link">隐私政策</el-link>处理我的个人信息
            </el-checkbox>
          </div>
        </el-form>

        <div class="form-actions">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitForm">提交预约</el-button>
        </div>
      </div>

      <!-- 提交成功提示 -->
      <el-dialog v-model="successVisible" width="400px" :append-to-body="true" align-center center>
        <div class="success-message">
          <el-icon class="success-icon">
            <CircleCheck />
          </el-icon>
          <h3>预约成功！</h3>
          <p>我们已收到您的咨询请求，将在1-2个工作日内与您联系确认详情。</p>
          <el-button type="primary" @click="handleSuccess">确定</el-button>
        </div>
      </el-dialog>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Clock, CircleCheck } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';

// 对话框可见性控制
const dialogVisible = ref(false);
const successVisible = ref(false);
const submitting = ref(false);

// 表单引用
const formRef = ref<FormInstance>();

// 表单数据
const form = reactive({
  name: '',
  phone: '',
  email: '',
  serviceType: '',
  message: '',
  appointmentDate: '',
  agreement: false
});

// 表单验证规则
const rules = reactive<FormRules>({
  name: [
    { required: true, message: '请输入您的姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度应为2到20个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入您的联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入您的电子邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  serviceType: [
    { required: true, message: '请选择咨询类型', trigger: 'change' }
  ],
  message: [
    { required: true, message: '请输入咨询内容', trigger: 'blur' },
    { min: 10, max: 500, message: '长度应为10到500个字符', trigger: 'blur' }
  ],
  appointmentDate: [
    { required: true, message: '请选择预约时间', trigger: 'change' }
  ]
});

// 不可选择的日期（今天之前的日期）
const disabledDate = (time: Date) => {
  return time.getTime() < Date.now() - 8.64e7; // 不能选择今天之前的日期
};

// 不可选择的小时（非工作时间）
const disabledHours = () => {
  const hours = [];
  for (let i = 0; i < 9; i++) {
    hours.push(i);
  }
  for (let i = 18; i < 24; i++) {
    hours.push(i);
  }
  return hours;
};

// 打开对话框
const openDialog = () => {
  dialogVisible.value = true;
};

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate((valid, fields) => {
    if (valid) {
      if (!form.agreement) {
        ElMessage.warning('请先同意隐私政策');
        return;
      }

      submitting.value = true;

      // 模拟请求提交
      setTimeout(() => {
        submitting.value = false;
        successVisible.value = true;
      }, 1500);
    }
  });
};

// 处理成功提交
const handleSuccess = () => {
  successVisible.value = false;
  dialogVisible.value = false;

  // 重置表单
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// 导出方法
defineExpose({
  openDialog
});
</script>

<style scoped>
.consult-form {
  padding: 0 15px;
}

.form-header {
  display: flex;
  align-items: center;
  margin-bottom: 25px;
}

.form-icon {
  margin-right: 15px;
}

.icon-wrapper {
  font-size: 28px;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  border-radius: 50%;
  padding: 10px;
}

.form-title h3 {
  margin: 0 0 5px;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.form-title p {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.form-privacy {
  margin: 20px 0;
  font-size: 14px;
}

.privacy-link {
  font-weight: 500;
  margin-left: 3px;
  margin-right: 3px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.success-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  font-size: 60px;
  color: var(--el-color-success);
  margin-bottom: 20px;
}

.success-message h3 {
  margin: 0 0 15px;
  font-size: 22px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.success-message p {
  margin: 0 0 25px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
</style>