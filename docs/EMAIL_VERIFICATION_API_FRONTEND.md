# 邮箱验证 API 前端开发文档

## 概述

本文档为前端开发者提供完整的邮箱验证功能 API 接口说明，包括发送验证码和验证邮箱两个核心接口。适用于 Vue3 前端项目集成。

## 基础信息

- **API 基础路径**: `https://your-domain.com/v1/email`
- **请求格式**: `application/json`
- **响应格式**: `application/json`
- **字符编码**: `UTF-8`

## API 接口

### 1. 发送邮箱验证码

发送 6 位数字验证码到指定邮箱，用于邮箱验证。

#### 请求信息

- **接口路径**: `/v1/email/send-verification`
- **请求方法**: `POST`
- **认证要求**: 无需认证

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| email | string | 是 | 邮箱地址，必须是已注册的邮箱 | `user@example.com` |

#### 请求示例

```javascript
// 使用 axios
import axios from 'axios';

const sendVerificationCode = async (email) => {
  try {
    const response = await axios.post('/v1/email/send-verification', {
      email: email
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 调用示例
sendVerificationCode('user@example.com')
  .then(data => {
    console.log('验证码发送成功:', data.message);
  })
  .catch(error => {
    console.error('发送失败:', error.error.message);
  });
```

```javascript
// 使用 fetch
const sendVerificationCode = async (email) => {
  const response = await fetch('/v1/email/send-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw data;
  }
  
  return data;
};
```

#### 成功响应

**HTTP 状态码**: `200 OK`

```json
{
  "success": true,
  "message": "验证码已发送到您的邮箱"
}
```

#### 错误响应

##### 1. 参数验证失败 (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "email": [
        "邮箱地址不能为空"
      ]
    }
  }
}
```

可能的验证错误：
- `邮箱地址不能为空` - email 参数缺失
- `邮箱格式不正确` - email 格式无效
- `该邮箱未注册` - 邮箱不存在于系统中

##### 2. 请求频率限制 (429 Too Many Requests)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求过于频繁，请 60 秒后再试",
    "retry_after": 60
  }
}
```

**说明**: 同一邮箱 60 秒内只能发送一次验证码

##### 3. 服务器错误 (500 Internal Server Error)

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "发送验证码失败，请稍后重试"
  }
}
```

---

### 2. 验证邮箱验证码

验证用户输入的验证码是否正确。

#### 请求信息

- **接口路径**: `/v1/email/verify`
- **请求方法**: `POST`
- **认证要求**: 无需认证

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| email | string | 是 | 邮箱地址 | `user@example.com` |
| code | string | 是 | 6 位数字验证码 | `123456` |

#### 请求示例

```javascript
// 使用 axios
import axios from 'axios';

const verifyEmail = async (email, code) => {
  try {
    const response = await axios.post('/v1/email/verify', {
      email: email,
      code: code
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 调用示例
verifyEmail('user@example.com', '123456')
  .then(data => {
    console.log('验证成功:', data.message);
  })
  .catch(error => {
    console.error('验证失败:', error.error.message);
  });
```

```javascript
// 使用 fetch
const verifyEmail = async (email, code) => {
  const response = await fetch('/v1/email/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw data;
  }
  
  return data;
};
```

#### 成功响应

**HTTP 状态码**: `200 OK`

```json
{
  "success": true,
  "message": "邮箱验证成功"
}
```

#### 错误响应

##### 1. 参数验证失败 (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "code": [
        "验证码必须是 6 位数字"
      ]
    }
  }
}
```

可能的验证错误：
- `邮箱地址不能为空` - email 参数缺失
- `验证码不能为空` - code 参数缺失
- `邮箱格式不正确` - email 格式无效
- `验证码必须是 6 位` - code 长度不是 6 位
- `验证码必须是 6 位数字` - code 包含非数字字符

##### 2. 验证码错误 (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "验证码不正确"
  }
}
```

或

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "验证码不存在或已过期"
  }
}
```

**说明**: 验证码有效期为 15 分钟

##### 3. 账户锁定 (429 Too Many Requests)

```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "验证失败次数过多，账户已被锁定，请 900 秒后再试",
    "retry_after": 900
  }
}
```

**说明**: 验证码输入错误 5 次后，账户将被锁定 15 分钟

##### 4. 服务器错误 (500 Internal Server Error)

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "验证失败，请稍后重试"
  }
}
```

---

## 业务规则

### 验证码规则

1. **格式**: 6 位纯数字
2. **有效期**: 15 分钟（900 秒）
3. **发送频率**: 同一邮箱 60 秒内只能发送一次
4. **验证次数**: 最多允许验证失败 5 次
5. **锁定时间**: 失败 5 次后锁定 15 分钟

### 安全机制

1. **速率限制**: 防止恶意频繁发送验证码
2. **失败锁定**: 防止暴力破解验证码
3. **自动过期**: 验证码 15 分钟后自动失效
4. **一次性使用**: 验证成功后验证码立即失效

---

## Vue3 完整示例

### 1. API 服务封装

创建 `src/api/email.js`:

```javascript
import axios from 'axios';

// 配置 axios 实例
const apiClient = axios.create({
  baseURL: 'https://your-domain.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 响应拦截器
apiClient.interceptors.response.use(
  response => response,
  error => {
    // 统一错误处理
    if (error.response) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: '网络错误，请检查您的网络连接'
      }
    });
  }
);

/**
 * 发送邮箱验证码
 * @param {string} email - 邮箱地址
 * @returns {Promise<Object>} 响应数据
 */
export const sendVerificationCode = async (email) => {
  const response = await apiClient.post('/v1/email/send-verification', {
    email
  });
  return response.data;
};

/**
 * 验证邮箱验证码
 * @param {string} email - 邮箱地址
 * @param {string} code - 验证码
 * @returns {Promise<Object>} 响应数据
 */
export const verifyEmailCode = async (email, code) => {
  const response = await apiClient.post('/v1/email/verify', {
    email,
    code
  });
  return response.data;
};
```

### 2. Composable 函数

创建 `src/composables/useEmailVerification.js`:

```javascript
import { ref, computed } from 'vue';
import { sendVerificationCode, verifyEmailCode } from '@/api/email';

export function useEmailVerification() {
  // 状态
  const loading = ref(false);
  const error = ref(null);
  const countdown = ref(0);
  const isLocked = ref(false);
  const lockTime = ref(0);
  
  // 计算属性
  const canSendCode = computed(() => {
    return !loading.value && countdown.value === 0;
  });
  
  const canVerify = computed(() => {
    return !loading.value && !isLocked.value;
  });
  
  // 倒计时定时器
  let countdownTimer = null;
  let lockTimer = null;
  
  /**
   * 开始倒计时
   * @param {number} seconds - 倒计时秒数
   */
  const startCountdown = (seconds) => {
    countdown.value = seconds;
    
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }
    
    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }, 1000);
  };
  
  /**
   * 开始锁定倒计时
   * @param {number} seconds - 锁定秒数
   */
  const startLockCountdown = (seconds) => {
    isLocked.value = true;
    lockTime.value = seconds;
    
    if (lockTimer) {
      clearInterval(lockTimer);
    }
    
    lockTimer = setInterval(() => {
      lockTime.value--;
      if (lockTime.value <= 0) {
        clearInterval(lockTimer);
        lockTimer = null;
        isLocked.value = false;
      }
    }, 1000);
  };
  
  /**
   * 发送验证码
   * @param {string} email - 邮箱地址
   * @returns {Promise<boolean>} 是否成功
   */
  const sendCode = async (email) => {
    if (!canSendCode.value) {
      return false;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const result = await sendVerificationCode(email);
      
      if (result.success) {
        // 开始 60 秒倒计时
        startCountdown(60);
        return true;
      }
      
      return false;
    } catch (err) {
      error.value = err.error?.message || '发送验证码失败';
      
      // 处理速率限制
      if (err.error?.code === 'RATE_LIMIT_EXCEEDED' && err.error?.retry_after) {
        startCountdown(err.error.retry_after);
      }
      
      return false;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 验证验证码
   * @param {string} email - 邮箱地址
   * @param {string} code - 验证码
   * @returns {Promise<boolean>} 是否成功
   */
  const verifyCode = async (email, code) => {
    if (!canVerify.value) {
      return false;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const result = await verifyEmailCode(email, code);
      
      if (result.success) {
        // 验证成功，清除倒计时
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }
        countdown.value = 0;
        return true;
      }
      
      return false;
    } catch (err) {
      error.value = err.error?.message || '验证失败';
      
      // 处理账户锁定
      if (err.error?.code === 'ACCOUNT_LOCKED' && err.error?.retry_after) {
        startLockCountdown(err.error.retry_after);
      }
      
      return false;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * 清理定时器
   */
  const cleanup = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (lockTimer) {
      clearInterval(lockTimer);
      lockTimer = null;
    }
  };
  
  return {
    // 状态
    loading,
    error,
    countdown,
    isLocked,
    lockTime,
    
    // 计算属性
    canSendCode,
    canVerify,
    
    // 方法
    sendCode,
    verifyCode,
    cleanup
  };
}
```

### 3. Vue 组件示例

创建 `src/components/EmailVerification.vue`:

```vue
<template>
  <div class="email-verification">
    <h2>邮箱验证</h2>
    
    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <!-- 锁定提示 -->
    <div v-if="isLocked" class="lock-message">
      账户已被锁定，请 {{ lockTime }} 秒后再试
    </div>
    
    <form @submit.prevent="handleSubmit">
      <!-- 邮箱输入 -->
      <div class="form-group">
        <label for="email">邮箱地址</label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          placeholder="请输入邮箱地址"
          required
          :disabled="loading"
        />
      </div>
      
      <!-- 验证码输入 -->
      <div class="form-group">
        <label for="code">验证码</label>
        <div class="code-input-group">
          <input
            id="code"
            v-model="formData.code"
            type="text"
            placeholder="请输入 6 位验证码"
            maxlength="6"
            pattern="\d{6}"
            required
            :disabled="loading || isLocked"
          />
          <button
            type="button"
            class="send-code-btn"
            :disabled="!canSendCode || !formData.email"
            @click="handleSendCode"
          >
            {{ sendCodeButtonText }}
          </button>
        </div>
      </div>
      
      <!-- 提交按钮 -->
      <button
        type="submit"
        class="submit-btn"
        :disabled="loading || isLocked || !formData.email || !formData.code"
      >
        {{ loading ? '验证中...' : '验证邮箱' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { useEmailVerification } from '@/composables/useEmailVerification';

// 表单数据
const formData = ref({
  email: '',
  code: ''
});

// 使用邮箱验证 composable
const {
  loading,
  error,
  countdown,
  isLocked,
  lockTime,
  canSendCode,
  canVerify,
  sendCode,
  verifyCode,
  cleanup
} = useEmailVerification();

// 发送验证码按钮文本
const sendCodeButtonText = computed(() => {
  if (countdown.value > 0) {
    return `${countdown.value}秒后重试`;
  }
  return '发送验证码';
});

// 发送验证码
const handleSendCode = async () => {
  if (!formData.value.email) {
    return;
  }
  
  const success = await sendCode(formData.value.email);
  
  if (success) {
    // 可以添加成功提示
    console.log('验证码已发送');
  }
};

// 提交验证
const handleSubmit = async () => {
  if (!formData.value.email || !formData.value.code) {
    return;
  }
  
  const success = await verifyCode(formData.value.email, formData.value.code);
  
  if (success) {
    // 验证成功，执行后续操作
    console.log('邮箱验证成功');
    // 例如：跳转到其他页面、显示成功提示等
  }
};

// 组件卸载时清理定时器
onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
.email-verification {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.error-message {
  padding: 10px;
  margin-bottom: 15px;
  background-color: #fee;
  color: #c33;
  border-radius: 4px;
}

.lock-message {
  padding: 10px;
  margin-bottom: 15px;
  background-color: #ffeaa7;
  color: #d63031;
  border-radius: 4px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.code-input-group {
  display: flex;
  gap: 10px;
}

.code-input-group input {
  flex: 1;
}

.send-code-btn {
  padding: 10px 15px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 14px;
}

.send-code-btn:hover:not(:disabled) {
  background-color: #66b1ff;
}

.send-code-btn:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background-color: #67c23a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.submit-btn:hover:not(:disabled) {
  background-color: #85ce61;
}

.submit-btn:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}
</style>
```

---

## 错误处理最佳实践

### 1. 统一错误处理

```javascript
const handleApiError = (error) => {
  const errorCode = error.error?.code;
  const errorMessage = error.error?.message;
  
  switch (errorCode) {
    case 'VALIDATION_ERROR':
      // 显示表单验证错误
      return '请检查输入的信息是否正确';
      
    case 'RATE_LIMIT_EXCEEDED':
      // 显示速率限制提示
      return errorMessage || '请求过于频繁，请稍后再试';
      
    case 'INVALID_CODE':
      // 显示验证码错误
      return errorMessage || '验证码不正确或已过期';
      
    case 'ACCOUNT_LOCKED':
      // 显示账户锁定提示
      return errorMessage || '验证失败次数过多，请稍后再试';
      
    case 'INTERNAL_ERROR':
      // 显示服务器错误
      return '服务器错误，请稍后重试';
      
    case 'NETWORK_ERROR':
      // 显示网络错误
      return '网络连接失败，请检查网络';
      
    default:
      return errorMessage || '操作失败，请重试';
  }
};
```

### 2. 用户体验优化

```javascript
// 1. 自动清除错误提示
const showError = (message, duration = 3000) => {
  error.value = message;
  setTimeout(() => {
    error.value = null;
  }, duration);
};

// 2. 验证码输入自动格式化
const formatCode = (value) => {
  // 只保留数字
  return value.replace(/\D/g, '').slice(0, 6);
};

// 3. 验证码输入完成自动提交
watch(() => formData.value.code, (newCode) => {
  if (newCode.length === 6) {
    // 自动提交验证
    handleSubmit();
  }
});
```

---

## 测试建议

### 1. 正常流程测试

1. 输入有效邮箱地址
2. 点击"发送验证码"按钮
3. 检查是否显示倒计时（60秒）
4. 输入收到的验证码
5. 点击"验证邮箱"按钮
6. 验证是否成功

### 2. 异常流程测试

1. **无效邮箱格式**: 输入 `invalid-email`，检查错误提示
2. **未注册邮箱**: 输入未注册的邮箱，检查错误提示
3. **频繁发送**: 60秒内多次点击发送，检查倒计时
4. **错误验证码**: 输入错误的验证码，检查错误提示
5. **过期验证码**: 等待15分钟后验证，检查过期提示
6. **多次失败**: 连续输入错误验证码5次，检查锁定提示

---

## 常见问题

### Q1: 验证码多久过期？
A: 验证码有效期为 15 分钟（900 秒）。

### Q2: 多久可以重新发送验证码？
A: 同一邮箱 60 秒内只能发送一次验证码。

### Q3: 验证码输入错误几次会被锁定？
A: 验证码输入错误 5 次后，账户将被锁定 15 分钟。

### Q4: 验证码是否区分大小写？
A: 验证码只包含数字（0-9），不区分大小写。

### Q5: 如何处理网络超时？
A: API 请求超时时间为 10 秒，超时后会返回网络错误，建议提示用户检查网络连接。

### Q6: 是否支持国际邮箱？
A: 支持所有符合 RFC 5322 标准的邮箱地址格式。

---

## 更新日志

### v1.0.0 (2026-01-21)
- 初始版本
- 支持发送验证码
- 支持验证验证码
- 实现速率限制和账户锁定机制

---

## 技术支持

如有问题，请联系后端开发团队或查看项目文档。
