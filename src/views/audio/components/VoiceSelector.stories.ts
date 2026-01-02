import type { Meta, StoryObj } from "@storybook/vue3-vite";
import VoiceSelector from "./VoiceSelector.vue";
import { ref } from "vue";

const meta: Meta<typeof VoiceSelector> = {
  title: "Audio/VoiceSelector",
  component: VoiceSelector,
  tags: ["autodocs"],
  argTypes: {
    // Define controls for props
    availableScenes: { control: "object" },
    availableEmotions: { control: "object" },
  },
};

export default meta;
type Story = StoryObj<typeof VoiceSelector>;

const mockVoices = [
  {
    value: 101002,
    label: "智聆，通用女声(精品)",
    type: "精品音色",
    scene: "通用女声",
    language: "中文",
    emotions: ["中性"],
    sampleRate: ["8k", "16k"],
  },
  {
    value: 101003,
    label: "WeJack，英文男声(精品)",
    type: "精品音色",
    scene: "英文男声",
    language: "英文",
    emotions: ["中性"],
    sampleRate: ["8k", "16k"],
  },
];

const mockGroupedVoices = [{ type: "精品音色", voices: mockVoices }];

export const Default: Story = {
  render: (args) => ({
    components: { VoiceSelector },
    setup() {
      // Mock v-models
      const voiceType = ref("");
      const voiceScene = ref("");
      const voiceLanguage = ref("");
      const selectedVoiceType = ref(101002);
      const emotionCategory = ref("");
      const emotionIntensity = ref(100);
      const autoSwitchLanguage = ref(true);

      return {
        args,
        voiceType,
        voiceScene,
        voiceLanguage,
        selectedVoiceType,
        emotionCategory,
        emotionIntensity,
        autoSwitchLanguage,
      };
    },
    template: `
      <VoiceSelector 
        v-bind="args"
        v-model:voiceType="voiceType"
        v-model:voiceScene="voiceScene"
        v-model:voiceLanguage="voiceLanguage"
        v-model:selectedVoiceType="selectedVoiceType"
        v-model:emotionCategory="emotionCategory"
        v-model:emotionIntensity="emotionIntensity"
        v-model:autoSwitchLanguage="autoSwitchLanguage"
      />
    `,
  }),
  args: {
    groupedVoices: mockGroupedVoices,
    availableScenes: ["通用女声", "英文男声"],
    availableEmotions: ["中性", "高兴", "悲伤"],
    filteredEmotions: ["高兴", "悲伤"],
    isDark: false,
  },
};
