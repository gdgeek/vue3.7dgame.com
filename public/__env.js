// Development runtime env placeholder.
// Production Docker images generate this file at container startup.
window.__ENV__ = {
  // Defer to the selected Vite mode locally; Docker fills these in production.
  BLOCKLY_URL: null,
  EDITOR_URL: null,
  AUTH_PROVIDER: null,
  VITE_AUTH_PROVIDER: null,
  VITE_APP_AUTH_API: null,
  VITE_APP_WECHAT_AUTH_API: null,
};
