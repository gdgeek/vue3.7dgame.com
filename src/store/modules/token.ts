import SecureLS from "secure-ls";
import { logger } from "@/utils/logger";
import type { TokenInfo } from "@/api/v1/types/auth";

import { TOKEN_KEY } from "@/enums/CacheEnum";

const ls = new SecureLS({ encodingType: "aes" });

function setToken(token: TokenInfo) {
  ls.set(TOKEN_KEY, token);
}
function hasToken() {
  return getToken() !== null;
}
function removeToken() {
  ls.remove(TOKEN_KEY);
}
function getToken(): TokenInfo | null {
  try {
    const token = ls.get(TOKEN_KEY);
    return token || null;
  } catch (e) {
    logger.error("Failed to parse token:", e);
    return null;
  }
}
export default {
  setToken,
  getToken,
  hasToken,
  removeToken,
};
