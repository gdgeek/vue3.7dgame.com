export type MessageType = {
  action: string;
  data: any;
};
export function GetCurrentUrl() {
  let currentUrl = window.location.href;
  let index = currentUrl.indexOf('?');

  if (index !== -1) {
    currentUrl = currentUrl.substring(0, index);
  }

  if (currentUrl.endsWith('/')) {
    currentUrl = currentUrl.slice(0, -1)
  }
  return currentUrl
}


export const VueAppleLoginConfig = {
  clientId: "com.mrpp.www",
  scope: "name email",
  redirectURI: GetCurrentUrl(),
  state: Date.now().toString(),
  usePopup: true
};
