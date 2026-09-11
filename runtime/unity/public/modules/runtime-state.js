(function install(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.XRUGCUnityRuntimeState = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  // The runtime callback confirms scene lifecycle only. It is not acceptance
  // evidence for every script, downloaded resource, headset or rendered pixel.
  function isRunningEvidence(evidence) {
    return Boolean(evidence && evidence.kind === 'unity-scene-started-callback' && evidence.sceneAccepted === true && evidence.runtimeStarted === true);
  }
  function createRuntimeState(options) {
    let stage = 'preparing';
    let sceneAccepted = false;
    let terminal = false;
    let timer = null;
    const clear = () => { if (timer !== null) options.clearTimeout(timer); timer = null; };
    function emit(nextStage, progress = { kind: 'indeterminate' }, details = {}) {
      if (terminal) return false;
      if (nextStage === 'running' && (!sceneAccepted || !isRunningEvidence(details.evidence))) return false;
      stage = nextStage;
      options.post({ type: 'unity-web-preview-state', stage, progress, ...details });
      if (['running', 'error', 'stopping', 'closed'].includes(stage)) clear();
      if (['error', 'closed'].includes(stage)) terminal = true;
      return true;
    }
    function sceneForwarded() {
      if (terminal) return;
      sceneAccepted = true;
      emit('loading_scene');
      clear();
      timer = options.setTimeout(() => emit('error', { kind: 'indeterminate' }, {
        failure: { code: 'UNITY_SCENE_CONFIRMATION_TIMEOUT', message: 'Unity has not confirmed scene startup. A visible scene log alone cannot confirm scripts or resources completed.' },
      }), options.sceneTimeoutMs || 120000);
    }
    function dispose() { clear(); terminal = true; }
    return Object.freeze({ emit, sceneForwarded, dispose, get stage() { return stage; } });
  }
  return Object.freeze({ createRuntimeState, isRunningEvidence });
});
