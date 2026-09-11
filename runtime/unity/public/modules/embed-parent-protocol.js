(function install(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.XRUGCEmbedParentProtocol = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const SESSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{15,255}$/;
  const BUILD_PATTERN = /^sha256:[a-f0-9]{64}$/;
  const record = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  function createEmbedParentProtocol(options) {
    const sessions = options.searchParams.getAll('sessionId');
    const sessionId = sessions.length === 1 && SESSION_PATTERN.test(sessions[0]) ? sessions[0] : '';
    const parentOrigin = options.parentOrigin;
    let phase = options.embedded && options.parentWindow && sessionId ? 'open' : 'invalid';
    let identity = null;
    let ready = false;
    let sceneAccepted = false;
    const terminalTypes = new Set(['unity-web-preview-disposed', 'unity-web-preview-dispose-error']);
    function setIdentity(value) {
      if (!record(value) || value.protocolVersion !== 1 || !/^[a-f0-9]{24}$/.test(value.runtimeReleaseId) || !BUILD_PATTERN.test(value.buildId)) {
        throw new Error('Invalid runtime release identity');
      }
      if (identity && (identity.buildId !== value.buildId || identity.runtimeReleaseId !== value.runtimeReleaseId)) {
        throw new Error('Runtime identity cannot change during a session');
      }
      identity = { protocolVersion: 1, sessionId, runtimeReleaseId: value.runtimeReleaseId, buildId: value.buildId };
    }
    function accept(event, message) {
      if (phase !== 'open' || !identity || !record(message) || event.source !== options.parentWindow || event.origin !== parentOrigin) return false;
      if (Object.keys(identity).some((key) => message[key] !== identity[key])) return false;
      if (message.type === 'unity-web-preview-dispose') { phase = 'closing'; return true; }
      if (message.type === 'webgl-preview-locale-change') return true;
      if (!ready) return false;
      if (message.type === 'load-scene-json' || message.type === 'xrugc-load-scene-json') {
        if (sceneAccepted) return false;
        sceneAccepted = true;
        return true;
      }
      return ['unity-web-preview-ping', 'unity-web-preview-camera-mode', 'unity-web-preview-runtime-confirmed'].includes(message.type);
    }
    function post(message) {
      if (!identity || !record(message) || phase === 'closed' || phase === 'invalid') return false;
      const terminal = terminalTypes.has(message.type);
      if (phase === 'closing' && !terminal) return false;
      const outbound = { ...message, ...identity };
      try {
        if (options.postMessage) options.postMessage(outbound, parentOrigin);
        else options.parentWindow.postMessage(outbound, parentOrigin);
      } catch { return false; }
      if (message.type === 'unity-web-preview-ready') ready = true;
      if (terminal) phase = 'closed';
      return true;
    }
    return Object.freeze({ accept, post, setIdentity, get phase() { return phase; }, get session() { return sessionId; }, get parentOrigin() { return parentOrigin; } });
  }
  return Object.freeze({ createEmbedParentProtocol, isValidSession: (value) => typeof value === 'string' && SESSION_PATTERN.test(value) });
});
