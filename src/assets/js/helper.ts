// 定义 Vector2 和 Vector3 类型
type Vector2 = {
  x: number;
  y: number;
}

type Vector3 = {
  x: number;
  y: number;
  z: number;
}

const printVector3 = (vec: Vector3): string => `(${vec.x}, ${vec.y}, ${vec.z})`;

const printVector2 = (vec: Vector2): string => `(${vec.x}, ${vec.y})`;

// 截取字符串
const cutString = (str: string, len: number): string => {
  if (str.length * 2 <= len) return str;

  let strlen = 0;
  let s = '';

  for (let i = 0; i < str.length; i++) {
    s += str.charAt(i);
    if (str.charCodeAt(i) > 128) {
      strlen += 2;
      if (strlen >= len) return s.substring(0, s.length - 1) + '...';
    } else {
      strlen += 1;
      if (strlen >= len) return s.substring(0, s.length - 2) + '...';
    }
  }
  return s;
};

// 检查当前页面是否使用 HTTPS
const isHttps = (): boolean => {
  const protocol = window.location.protocol;
  const isHttps = protocol === 'https:';
  console.log(isHttps ? "这个网页是使用HTTPS" : "这个网页不是使用HTTPS");
  return isHttps;
};

// 将 URL 转换为 HTTPS 或 HTTP
const convertToHttps = (url?: string): string => {
  if (url === undefined || url === null) return '';

  if (isHttps()) {
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
  } else {
    if (url.startsWith('https://')) {
      return url.replace('https://', 'http://');
    }
  }
  return url;
};
 const getCurrentUrl = () => {
  const fullUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}`;
  console.log(`Full URL: ${fullUrl}`);
  return fullUrl;
 }


// 延迟函数
const sleep = (seconds: number): Promise<void> => new Promise(rs => setTimeout(rs, seconds));

export {
  isHttps,
  convertToHttps,
  printVector3,
  printVector2,
  cutString,
  getCurrentUrl,
  sleep
};
