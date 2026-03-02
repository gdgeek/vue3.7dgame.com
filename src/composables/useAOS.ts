import AOS from "aos";
import "aos/dist/aos.css";
import { onMounted } from "vue";

const defaultOptions: Parameters<typeof AOS.init>[0] = {
  duration: 1000,
  once: false,
  mirror: true,
};

export function useAOS(options?: Parameters<typeof AOS.init>[0]) {
  onMounted(() => {
    AOS.init({ ...defaultOptions, ...options });
  });
}
