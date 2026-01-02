<template>
  <div class="params-section">
    <div class="param-row">
      <div class="param-item">
        <span class="param-label">{{ $t("tts.volume") }}</span>
        <el-slider
          v-model="localVolume"
          :min="-10"
          :max="10"
          :step="1"
          show-stops
        ></el-slider>
      </div>
      <div class="param-item">
        <span class="param-label">{{ $t("tts.speed") }}</span>
        <el-slider
          v-model="localSpeed"
          :min="-2"
          :max="6"
          :step="0.5"
          show-stops
        ></el-slider>
      </div>
    </div>
    <div class="param-row">
      <div class="param-item">
        <span class="param-label">{{ $t("tts.audioFormat") }}</span>
        <el-radio-group v-model="localCodec">
          <el-radio :value="'wav'">WAV</el-radio>
          <el-radio :value="'mp3'">MP3</el-radio>
          <el-radio :value="'pcm'">PCM</el-radio>
        </el-radio-group>
      </div>
      <div class="param-item">
        <span class="param-label">{{ $t("tts.sampleRate") }}</span>
        <el-radio-group v-model="localSampleRate">
          <el-radio :value="8000">8k</el-radio>
          <el-radio :value="16000">16k</el-radio>
          <el-radio v-if="supportHighSampleRate" :value="24000">24k</el-radio>
        </el-radio-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  volume: number;
  speed: number;
  codec: string;
  sampleRate: number;
  supportHighSampleRate: boolean;
}>();

const emit = defineEmits<{
  "update:volume": [value: number];
  "update:speed": [value: number];
  "update:codec": [value: string];
  "update:sampleRate": [value: number];
}>();

const localVolume = computed({
  get: () => props.volume,
  set: (val) => emit("update:volume", val),
});

const localSpeed = computed({
  get: () => props.speed,
  set: (val) => emit("update:speed", val),
});

const localCodec = computed({
  get: () => props.codec,
  set: (val) => emit("update:codec", val),
});

const localSampleRate = computed({
  get: () => props.sampleRate,
  set: (val) => emit("update:sampleRate", val),
});
</script>

<style scoped lang="scss">
.params-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.param-row {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.param-item {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}
</style>
