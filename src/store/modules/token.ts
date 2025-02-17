import { store } from "@/store";

import { TOKEN_KEY } from "@/enums/CacheEnum";
function setToken(token: any) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}
function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    try {
      return JSON.parse(token);
    } catch (e) {
      console.error("Failed to parse token:", e);
      return null;
    }
  } else {
  }
}
export default {
  setToken,
  getToken,
};
