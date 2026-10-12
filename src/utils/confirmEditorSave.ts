import { watch } from "vue";
import { ElMessageBox, type ElMessageBoxOptions } from "element-plus";

/** A requested save can wait for the editor; discard and close never wait. */
export const confirmEditorSave = (
  message: string,
  options: ElMessageBoxOptions,
  getLoadingState: () => { loading: boolean; blocked: boolean }
) => {
  let stopWaiting = () => {};
  const stop = () => {
    stopWaiting();
    stopWaiting = () => {};
  };
  return ElMessageBox.confirm(message, "", {
    ...options,
    beforeClose(action, instance, done) {
      stop();
      if (action !== "confirm" || !getLoadingState().blocked) {
        done();
        return;
      }
      const update = () => {
        const state = getLoadingState();
        instance.confirmButtonLoading = state.loading;
        instance.confirmButtonDisabled = state.blocked;
        if (!state.blocked) {
          stop();
          done();
        }
      };
      stopWaiting = watch(
        () => {
          const state = getLoadingState();
          return [state.loading, state.blocked];
        },
        update,
        { flush: "sync" }
      );
      update();
    },
  }).finally(stop);
};
