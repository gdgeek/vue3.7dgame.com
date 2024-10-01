export type MessageType = {
  action: string;
  data: any;
};
export function GetCurrentUrl() {
  const fullUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}`;
  console.log(`Full URL: ${fullUrl}`);
  return fullUrl;
}

export const VueAppleLoginConfig = {
  clientId: "com.mrpp.www",
  scope: "name email",
  redirectURI: GetCurrentUrl(),
  state: Date.now().toString(),
  usePopup: true,
};

