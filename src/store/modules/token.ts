import { logger } from "@/utils/logger";
import type { TokenInfo } from "@/api/v1/types/auth";

import { TOKEN_KEY } from "@/enums/CacheEnum";
import { createSecureLS } from "@/utils/secureLs";

const ls = createSecureLS({ encodingType: "aes" });

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
    const token = ls.get<TokenInfo | null>(TOKEN_KEY);
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
