import { onActivated, onBeforeUnmount, onDeactivated, watch } from "vue";

type PublicationOwner = {
  sceneId: number;
  sessionId: string;
  actorId: string;
  editorTarget: string;
};

/** Keep a late publication receipt, but never apply its UI to a replacement. */
export const useScenePublicationScope = (getOwner: () => PublicationOwner) => {
  let generation = 0;
  let active = true;
  const invalidate = () => {
    generation += 1;
  };
  watch(
    [
      () => getOwner().sceneId,
      () => getOwner().sessionId,
      () => getOwner().actorId,
      () => getOwner().editorTarget,
    ],
    invalidate,
    { flush: "sync" }
  );
  onActivated(() => {
    active = true;
  });
  onDeactivated(() => {
    active = false;
    invalidate();
  });
  onBeforeUnmount(() => {
    active = false;
    invalidate();
  });

  return () => {
    const owner = getOwner();
    const ownerGeneration = generation;
    return () => {
      const current = getOwner();
      return (
        active &&
        ownerGeneration === generation &&
        owner.sceneId === current.sceneId &&
        owner.sessionId === current.sessionId &&
        owner.actorId === current.actorId &&
        owner.editorTarget === current.editorTarget
      );
    };
  };
};
