import { ref, computed, watch } from "vue";
import { availableVoices as voicesList } from "@/store/modules/availableVoices";

export interface VoiceOption {
  value: number;
  label: string;
  type: string;
  scene: string;
  language: string;
  emotions: string[];
  sampleRate: string[];
}

export function useVoiceSelection() {
  // State
  const selectedVoiceType = ref(101002); // Default: 智聆
  const voiceType = ref("");
  const voiceScene = ref("");
  const voiceLanguage = ref("");
  const autoSwitchLanguage = ref(true);
  const emotionCategory = ref("");
  const emotionIntensity = ref(100);

  // Computed: Available Scenes
  const availableScenes = computed(() => {
    const scenes = new Set<string>();
    voicesList.forEach((voice) => scenes.add(voice.scene));
    return Array.from(scenes);
  });

  // Computed: Filtered Voices
  const filteredVoices = computed(() => {
    return voicesList.filter((voice) => {
      if (voiceType.value && voice.type !== voiceType.value) return false;
      if (voiceScene.value && voice.scene !== voiceScene.value) return false;
      if (voiceLanguage.value && voice.language !== voiceLanguage.value)
        return false;
      return true;
    });
  });

  // Computed: Grouped Voices
  const groupedVoices = computed(() => {
    const groups: { type: string; voices: VoiceOption[] }[] = [];
    const typeMap = new Map<string, VoiceOption[]>();

    filteredVoices.value.forEach((voice) => {
      if (!typeMap.has(voice.type)) {
        typeMap.set(voice.type, []);
      }
      typeMap.get(voice.type)?.push(voice);
    });

    typeMap.forEach((voices, type) => {
      groups.push({ type, voices });
    });

    return groups;
  });

  // Computed: Available Emotions for selected voice
  const availableEmotions = computed(() => {
    const selectedVoice = voicesList.find(
      (voice) => voice.value === selectedVoiceType.value
    );
    return selectedVoice ? selectedVoice.emotions : ["中性"];
  });

  // Computed: Filtered Emotions (excluding '中性' if other options exist)
  const filteredEmotions = computed(() => {
    if (availableEmotions.value.length === 1) {
      return availableEmotions.value;
    }
    return availableEmotions.value.filter((emotion) => emotion !== "中性");
  });

  // Computed: Support High Sample Rate
  const supportHighSampleRate = computed(() => {
    const selectedVoice = voicesList.find(
      (voice) => voice.value === selectedVoiceType.value
    );
    return selectedVoice?.sampleRate.includes("24k") || false;
  });

  // Watchers

  // Watch selected voice to reset emotion and validate sample rate
  watch(selectedVoiceType, () => {
    if (
      emotionCategory.value &&
      !availableEmotions.value.includes(emotionCategory.value)
    ) {
      emotionCategory.value = "";
    }
    // Note: sampleRate resetting logic (if needed) typically belongs in the component that owns sampleRate,
    // or we can expose supportHighSampleRate and let the consumer handle it.
  });

  // Watch filters to auto-select first available voice
  watch([voiceType, voiceScene, voiceLanguage], () => {
    const firstVoice = filteredVoices.value[0];
    if (firstVoice) {
      selectedVoiceType.value = firstVoice.value;
    }
  });

  return {
    selectedVoiceType,
    voiceType,
    voiceScene,
    voiceLanguage,
    autoSwitchLanguage,
    emotionCategory,
    emotionIntensity,
    availableScenes,
    filteredVoices,
    groupedVoices,
    availableEmotions,
    filteredEmotions,
    supportHighSampleRate,
  };
}
