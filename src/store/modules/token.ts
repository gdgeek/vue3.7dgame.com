import { logger } from "@/utils/logger";
import type { TokenInfo } from "@/api/v1/types/auth";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { AES, enc } from "crypto-js";

const SECRET_KEY =
  import.meta.env.VITE_TOKEN_SECRET || "mrpp-default-token-secret-2024";

function encryptData(data: string): string {
  return AES.encrypt(data, SECRET_KEY).toString();
}

function decryptData(ciphertext: string): string {
  return AES.decrypt(ciphertext, SECRET_KEY).toString(enc.Utf8);
}

function setToken(token: TokenInfo): void {
  const encrypted = encryptData(JSON.stringify(token));
  localStorage.setItem(TOKEN_KEY, encrypted);
}

function hasToken(): boolean {
  return getToken() !== null;
}

function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getToken(): TokenInfo | null {
  const ciphertext = localStorage.getItem(TOKEN_KEY);
  if (!ciphertext) return null;

  try {
    const decrypted = decryptData(ciphertext);
    if (!decrypted) return null;
    return JSON.parse(decrypted) as TokenInfo;
  } catch (e) {
    logger.error("Failed to decrypt token:", e);
    return null;
  }
}

export default {
  setToken,
  getToken,
  hasToken,
  removeToken,
};
