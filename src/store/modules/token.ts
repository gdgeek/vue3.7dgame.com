import { logger } from "@/utils/logger";
import { store } from "@/store";

import { TOKEN_KEY } from "@/enums/CacheEnum";
function setToken(token: any) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}
function hasToken() {
  const token = getToken();
  if (token !== null) {
    return true;
  }
  return false;
}
function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}
function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    try {
      return JSON.parse(token);
    } catch (e) {
      logger.error("Failed to parse token:", e);
      return null;
    }
  }
  return null;
}
export default {
  setToken,
  getToken,
  hasToken,
  removeToken,
};
