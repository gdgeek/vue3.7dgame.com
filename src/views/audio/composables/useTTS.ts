import { ref, Ref, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";
import { emotionMap } from "@/store/modules/availableVoices";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { postAudio } from "@/api/v1/resources/index";
import type { UploadFileType } from "@/api/user/model";

interface UseTTSProps {
  text: Ref<string>;
  volume: Ref<number>;
  speed: Ref<number>;
  selectedVoiceType: Ref<number>;
  codec: Ref<string>;
  sampleRate: Ref<number>;
  voiceLanguage: Ref<string>;
  voiceType: Ref<string>;
  emotionCategory: Ref<string>;
  emotionIntensity: Ref<number>;
  checkTextLanguage: () => void;
}

export function useTTS(props: UseTTSProps) {
  const { t } = useI18n();
  const router = useRouter();
  const fileStore = useFileStore();

  const isLoading = ref(false);
  const isUploading = ref(false);
  const isPlaying = ref(false);
  const audioUrl = ref("");
  const currentAudioBlob = ref<Blob | null>(null);

  const audioPlayerRef = ref<HTMLAudioElement | null>(null);
  const textContainerRef = ref<HTMLElement | null>(null);

  const highlightedText = ref("");
  const normalText = ref("");
  const currentCharIndex = ref(0);
  const isManualScrolling = ref(false);
  const isMouseHovering = ref(false);

  const updateHighlight = () => {
    if (!audioPlayerRef.value || !props.text.value) return;

    const progress =
      audioPlayerRef.value.currentTime / audioPlayerRef.value.duration;
    const charCount = Math.floor(props.text.value.length * progress);

    currentCharIndex.value = charCount;
    highlightedText.value = props.text.value.substring(0, charCount);
    normalText.value = props.text.value.substring(charCount);

    nextTick(() => {
      if (textContainerRef.value) {
        const container = textContainerRef.value;
        const highlightedElement = container.querySelector(".highlighted-text");

        if (
          highlightedElement &&
          !isManualScrolling.value &&
          !isMouseHovering.value
        ) {
          const containerRect = container.getBoundingClientRect();
          const highlightedRect = highlightedElement.getBoundingClientRect();
          const lineHeight = parseFloat(
            getComputedStyle(highlightedElement).lineHeight
          );
          const reserveSpace = 2 * lineHeight;

          if (
            highlightedRect.bottom > containerRect.bottom - reserveSpace ||
            highlightedRect.top < containerRect.top
          ) {
            container.scrollTo({
              top:
                container.scrollTop +
                (highlightedRect.bottom -
                  (containerRect.bottom - reserveSpace)),
              behavior: "smooth",
            });
          }
        }
      }
    });
  };

  const synthesizeSpeech = async () => {
    if (!props.text.value) {
      ElMessage.warning(t("tts.noText"));
      return;
    }

    try {
      isLoading.value = true;

      const params = {
        Text: props.text.value,
        SessionId: `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        Volume: props.volume.value,
        Speed: props.speed.value,
        VoiceType: props.selectedVoiceType.value,
        Codec: props.codec.value,
        SampleRate: props.sampleRate.value,
        PrimaryLanguage:
          props.voiceLanguage.value === "中文"
            ? 1
            : props.voiceLanguage.value === "英文"
              ? 2
              : 3,
        ModelType: props.voiceType.value === "精品音色" ? 1 : 0,
        ...(props.emotionCategory.value && {
          EmotionCategory: emotionMap[props.emotionCategory.value] || "neutral",
          EmotionIntensity: props.emotionIntensity.value,
        }),
      };

      const response = await axios.post(
        "https://sound.bujiaban.com/tencentTTS",
        params,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data?.Audio) {
        const audioData = atob(response.data.Audio);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < audioData.length; i++) {
          uint8Array[i] = audioData.charCodeAt(i);
        }

        const blob = new Blob([arrayBuffer], {
          type: `audio/${props.codec.value}`,
        });
        currentAudioBlob.value = blob;

        if (audioUrl.value) {
          URL.revokeObjectURL(audioUrl.value);
        }
        audioUrl.value = URL.createObjectURL(blob);

        highlightedText.value = "";
        normalText.value = props.text.value;
        currentCharIndex.value = 0;
        isPlaying.value = true;

        await nextTick();

        if (audioPlayerRef.value) {
          audioPlayerRef.value.addEventListener("timeupdate", updateHighlight);
          audioPlayerRef.value.play();
        }

        ElMessage.success(t("tts.synthesisSuccess"));
      } else {
        throw new Error(t("tts.synthesisError"));
      }
    } catch (error) {
      console.error("语音合成错误:", error);
      ElMessage.error(t("tts.synthesisError"));
    } finally {
      isLoading.value = false;
    }
  };

  const uploadAudio = async () => {
    if (!currentAudioBlob.value) {
      ElMessage.warning(t("tts.noAudio"));
      return;
    }

    try {
      const { value: audioName } = (await ElMessageBox.prompt(
        t("tts.enterAudioName"),
        t("tts.uploadAudio"),
        {
          confirmButtonText: t("tts.confirm"),
          cancelButtonText: t("tts.cancel"),
          inputPattern: /.+/,
          inputErrorMessage: t("tts.nameRequired"),
          inputValue: props.text.value.slice(0, 20) + "...",
        }
      )) as { value: string };

      if (!audioName) return;

      isUploading.value = true;
      const fileName = `tts_${Date.now()}.${props.codec.value}`;
      const file = new File([currentAudioBlob.value], fileName, {
        type: `audio/${props.codec.value}`,
      });

      const handler = await fileStore.store.publicHandler();
      const md5 = await fileStore.store.fileMD5(file, (p: number) => {
        console.log("MD5计算进度:", p);
      });
      const extension = `.${props.codec.value}`;

      const has = await fileStore.store.fileHas(
        md5,
        extension,
        handler,
        "audio"
      );
      if (!has) {
        await fileStore.store.fileUpload(
          md5,
          extension,
          file,
          (p: number) => {
            console.log("上传进度:", p);
          },
          handler,
          "audio"
        );
      }

      const data: UploadFileType = {
        filename: fileName,
        md5,
        key: md5 + extension,
        url: fileStore.store.fileUrl(md5, extension, handler, "audio"),
      };

      const fileResponse = await postFile(data);

      if (fileResponse.data?.id) {
        const audioResponse = await postAudio({
          name: audioName,
          file_id: fileResponse.data.id,
        });

        if (audioResponse.data?.id) {
          ElMessage.success(t("tts.uploadSuccess"));
          await router.push({
            path: "/resource/audio/view",
            query: { id: audioResponse.data.id },
          });
        } else {
          throw new Error(t("tts.uploadError"));
        }
      } else {
        throw new Error(t("tts.uploadError"));
      }
    } catch (error) {
      if (error === "cancel") {
        ElMessage.info(t("tts.uploadCanceled"));
        return;
      }
      console.error("上传错误:", error);
      ElMessage.error(t("tts.uploadError"));
    } finally {
      isUploading.value = false;
    }
  };

  const onTextInput = () => {
    highlightedText.value = "";
    normalText.value = props.text.value;

    if (audioPlayerRef.value) {
      audioPlayerRef.value.pause();
    }
    isPlaying.value = false;

    props.checkTextLanguage();
  };

  const onAudioPlayerPlay = () => (isPlaying.value = true);
  const onAudioPlayerPause = () => { };
  const onAudioPlayerEnded = () => {
    isPlaying.value = false;
    highlightedText.value = props.text.value;
    normalText.value = "";
  };

  return {
    isLoading,
    isUploading,
    isPlaying,
    audioUrl,
    currentAudioBlob,
    audioPlayerRef,
    textContainerRef,
    highlightedText,
    normalText,
    isManualScrolling,
    isMouseHovering,
    synthesizeSpeech,
    uploadAudio,
    onTextInput,
    onAudioPlayerPlay,
    onAudioPlayerPause,
    onAudioPlayerEnded,
  };
}
