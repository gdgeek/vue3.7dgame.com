export const useHoverStore = defineStore("hover", () => {
  const hovering = ref(false);

  const setHovering = (value: boolean) => {
    hovering.value = value;
  };

  return { hovering, setHovering };
});
