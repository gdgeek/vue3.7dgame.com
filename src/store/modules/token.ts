import { logger } from "@/utils/logger";
import type { TokenInfo } from "@/api/v1/types/auth";

import { TOKEN_KEY } from "@/enums/CacheEnum";

function setToken(token: TokenInfo) {
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
function getToken(): TokenInfo | null {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    try {
      return JSON.parse(token) as TokenInfo;
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
