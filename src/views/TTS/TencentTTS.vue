<template>
  <div class="tencent-tts" :class="{ 'leaving': isLeaving, 'entering': isEntering }">
    <div class="page-header">
      <el-page-header @back="goBack" content="腾讯云语音合成" />
    </div>

    <div class="main-content">
      <div class="voice-select-section">
        <el-select v-model="selectedVoiceType" placeholder="请选择音色" class="voice-select">
          <el-option v-for="voice in availableVoices" :key="voice.value" :label="voice.label" :value="voice.value" />
        </el-select>
      </div>

      <div class="params-section">
        <div class="param-row">
          <div class="param-item">
            <span class="param-label">音量</span>
            <el-slider v-model="volume" :min="-10" :max="10" :step="1" show-stops />
          </div>
          <div class="param-item">
            <span class="param-label">语速</span>
            <el-slider v-model="speed" :min="-2" :max="6" :step="0.5" show-stops />
          </div>
        </div>
        <div class="param-row">
          <div class="param-item">
            <span class="param-label">音频格式</span>
            <el-radio-group v-model="codec">
              <el-radio label="wav">WAV</el-radio>
              <el-radio label="mp3">MP3</el-radio>
              <el-radio label="pcm">PCM</el-radio>
            </el-radio-group>
          </div>
          <div class="param-item">
            <span class="param-label">采样率</span>
            <el-radio-group v-model="sampleRate">
              <el-radio :label="8000">8k</el-radio>
              <el-radio :label="16000">16k</el-radio>
              <el-radio :label="24000">24k</el-radio>
            </el-radio-group>
          </div>
        </div>
      </div>

      <div class="input-section">
        <el-input id="word" type="textarea" placeholder="请输入要转换的文本内容..." v-model="text" maxlength="150" :rows="4"
          show-word-limit :disabled="isLoading" />
      </div>

      <div class="preview-section" v-if="audioUrl">
        <audio :src="audioUrl" controls class="audio-player"></audio>
      </div>

      <div class="action-section">
        <el-button type="primary" size="large" @click="synthesizeSpeech" :loading="isLoading" class="action-button">
          {{ isLoading ? '合成中...' : '合成语音' }}
        </el-button>
      </div>

      <div class="tips-section">
        <el-alert title="使用提示" type="info" description="中文最大支持150个汉字（全角标点符号算一个汉字）；英文最大支持500个字母（半角标点符号算一个字母）。"
          :closable="false" show-icon class="tips-alert" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import CryptoJS from 'crypto-js'
import axios from 'axios'

// 定义状态
const text = ref('')
const isLoading = ref(false)
const isLeaving = ref(false)
const isEntering = ref(true)
const router = useRouter()
const audioUrl = ref('')

// 腾讯云TTS参数
const selectedVoiceType = ref(1001) // 默认音色
const volume = ref(0) // 音量，范围[-10, 10]
const speed = ref(0) // 语速，范围[-2, 6]
const codec = ref('mp3') // 音频格式：wav, mp3, pcm
const sampleRate = ref(16000) // 采样率：8000, 16000, 24000

const secretKey = 'JRN6rU3Thmw0ugMrBMROMGzXwJdu2120'

// 可用音色列表
const availableVoices = ref([
  { label: '云小宁，亲和女声(默认)', value: 1001 },
  { label: '云小奇，亲和男声', value: 1002 },
  { label: '云小晚，成熟男声', value: 1003 },
  { label: '云小叶，温暖女声', value: 1004 },
  { label: '云小欣，情感女声', value: 1005 },
  { label: '云小龙，情感男声', value: 1006 },
  { label: '云小曼，客服女声', value: 1010 },
  { label: '云小坤，客服男声', value: 1011 },
  { label: '云小媛，温馨女声', value: 1013 },
  { label: '云小闻，情感男声', value: 1014 },
  { label: '云小姜，亲和女声', value: 1015 },
  { label: '云小昆，亲和男声', value: 1017 },
  { label: '云小梦，亲和女声', value: 1018 },
])

// 页面加载完成后
onMounted(() => {
  setTimeout(() => {
    isEntering.value = false
  }, 300)
})

// 生成腾讯云API签名
const generateSignature = (params: any) => {
  // 1. 对参数按照键进行字典序排序
  const sortedKeys = Object.keys(params).sort()

  // 2. 拼接请求字符串
  let requestStr = 'POST' + 'tts.tencentcloudapi.com' + '/' + '?'

  for (const key of sortedKeys) {
    requestStr += `${key}=${params[key]}&`
  }

  // 去掉最后一个&
  requestStr = requestStr.slice(0, -1)

  // 3. 计算签名
  const hmac = CryptoJS.HmacSHA1(requestStr, secretKey)
  const signature = CryptoJS.enc.Base64.stringify(hmac)

  return signature
}

// 合成语音
const synthesizeSpeech = async () => {
  if (!text.value) {
    ElMessage.warning("请输入文本")
    return
  }

  try {
    isLoading.value = true

    // 准备请求参数
    const params = {
      Text: text.value,
      SessionId: 'session-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      Volume: volume.value,
      Speed: speed.value,
      VoiceType: selectedVoiceType.value,
      Codec: codec.value,
      SampleRate: sampleRate.value,
      PrimaryLanguage: 1, // 中文
    }

    // 调用云函数API
    const response = await axios.post('https://game-9ghhigyq57e00dc3-1251022382.ap-shanghai.app.tcloudbase.com/TencentTTS', params, {
      headers: {
        'Content-Type': 'application/json',
      }
    })
    console.log(response.data)

    if (response.data && response.data.Audio) {
      // 将Base64编码的音频数据转换为Blob
      const audioData = atob(response.data.Audio)
      const arrayBuffer = new ArrayBuffer(audioData.length)
      const uint8Array = new Uint8Array(arrayBuffer)

      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i)
      }

      const blob = new Blob([arrayBuffer], { type: `audio/${codec.value}` })

      // 创建音频URL
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value)
      }
      audioUrl.value = URL.createObjectURL(blob)

      ElMessage.success('语音合成成功')
    } else {
      throw new Error('语音合成失败，未返回音频数据')
    }
  } catch (error) {
    console.error('语音合成错误:', error)
    ElMessage.error('语音合成失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 返回方法
const goBack = () => {
  isLeaving.value = true
  setTimeout(() => {
    router.push({ path: "/tts" })
  }, 300)
}
</script>

<style scoped lang="scss">
.tencent-tts {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background-color: #f9fafc;
  transition: all 0.3s ease;
  opacity: 1;
  transform: translateX(0);

  &.leaving {
    opacity: 0.5;
    transform: translateX(30px);
  }

  &.entering {
    opacity: 0;
    transform: translateX(-30px);
  }
}

.page-header {
  width: 100%;
  max-width: 60%;
  margin-bottom: 2rem;

  :deep(.el-page-header__content) {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  :deep(.el-page-header__icon) {
    font-size: 1.2rem;
  }
}

.main-content {
  width: 60%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  background-color: #fff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.voice-select-section {
  width: 100%;
  margin-bottom: 1rem;
}

.voice-select {
  width: 100%;

  :deep(.el-input__wrapper) {
    border-radius: 12px;
    padding: 0.5rem;

    &:hover {
      border-color: #409eff;
    }

    &.is-focus {
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
    }
  }
}

.params-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1rem;

  .param-row {
    display: flex;
    gap: 2rem;
    width: 100%;

    .param-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .param-label {
        font-size: 0.9rem;
        font-weight: 500;
        color: #606266;
      }
    }
  }
}

.input-section {
  width: 100%;

  :deep(.el-textarea__inner) {
    border-radius: 12px;
    padding: 1rem;
    font-size: 1rem;
    border: 1px solid #dcdfe6;
    transition: all 0.3s ease;

    &:focus {
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
    }
  }
}

.preview-section {
  width: 100%;
  margin: 1rem 0;
  display: flex;
  justify-content: center;

  .audio-player {
    width: 100%;
    border-radius: 12px;
    outline: none;
  }
}

.action-section {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.action-button {
  min-width: 180px;
  height: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 16px rgba(64, 158, 255, 0.3);
  }

  &:disabled {
    opacity: 0.8;
  }
}

.tips-section {
  width: 100%;

  .tips-alert {
    border-radius: 12px;

    :deep(.el-alert__title) {
      font-weight: 600;
    }

    :deep(.el-alert__description) {
      margin-top: 0.5rem;
      line-height: 1.5;
    }
  }
}

@media (max-width: 1200px) {

  .page-header,
  .main-content {
    width: 80%;
  }

  .params-section {
    .param-row {
      flex-direction: column;
      gap: 1rem;
    }
  }
}

@media (max-width: 768px) {

  .page-header,
  .main-content {
    width: 95%;
  }
}
</style>