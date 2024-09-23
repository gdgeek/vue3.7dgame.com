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

export const MapNumbers = (a: number, b: number): number => {
  // 确保输入为字符串并长度为6，不足补0
  const a1: string = String(a).padStart(6, "0");
  const b1: string = String(b).padStart(6, "0");

  let c: number = 0;

  for (let i = 0; i < 6; i++) {
    const digitA = parseInt(a1[i], 10);
    const digitB = parseInt(b1[i], 10);

    const digitC = (digitA - digitB + 10) % 10;
    c = c * 10 + digitC;
  }

  return c;
};

export const ReverseMap = (c: number, b: number): number => {
  // 确保输入为字符串并长度为6，不足补0
  const c1: string = String(c).padStart(6, "0");
  const b1: string = String(b).padStart(6, "0");

  let a: number = 0;

  for (let i = 0; i < 6; i++) {
    const digitC = parseInt(c1[i], 10);
    const digitB = parseInt(b1[i], 10);

    const digitA = (digitC + digitB + 10) % 10; // 反算 a
    a = a * 10 + digitA;
  }

  return a;
};
export const EverseAndPad = (str: string): string => {
  //let str = String(num).padStart(6, '0');
  //642135
  const swapped = str[5] + str[3] + str[1] + str[0] + str[2] + str[4];
  return swapped;
};
export const ReverseAndPad = (str: string): string => {
  // 确保输入为6位字符串

  // 按照逆顺序恢复原始位置
  //
  const original = str[3] + str[2] + str[4] + str[1] + str[5] + str[0];

  return original;
};
