export const BeijingData = (utcDateString: string) => {
  const utcDate = new Date(utcDateString + "Z"); // 添加 'Z' 表示 UTC 时间
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return utcDate.toLocaleString("zh-CN", options); // 转换为北京时间并格式化
};

export const convertToLocalTime = (dateString: string, timeZone?: string) => {
  // 判断是否为UTC时间（以Z或+00:00结尾）
  const isUTC = /Z$|(\+|-)\d{2}:?\d{2}$/.test(dateString);

  if (!isUTC) {
    // 如果不是UTC时间，直接返回原始时间字符串的格式化结果
    const localDate = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return localDate.toLocaleString(undefined, options);
  }

  // 如果是UTC时间，进行时区转换
  const userTimeZone =
    timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const utcDate = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: userTimeZone, // 使用用户时区或指定时区
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  return utcDate.toLocaleString(undefined, options); // 转换为指定时区并格式化
};

export const formatFileSize = (size: number) => {
  if (size < 1024) return size + " B";
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  return (size / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};

/**
 * Identify if a URL is a video file and append COS snapshot parameters if needed.
 * @param url The image/video URL
 * @returns The snapshot URL if it's a video, otherwise the original URL
 */
export const getVideoCover = (url?: string) => {
  if (!url) return "";
  // Check if it already has snapshot params
  if (url.includes("ci-process=snapshot")) return url;

  // Check extensions
  const cleanUrl = url.split("?")[0];
  const isVideo = /\.(mp4|webm|mov|avi|mkv)$/i.test(cleanUrl);

  if (isVideo) {
    const separator = url.includes("?") ? "&" : "?";
    // Use time=1 presumably to skip black frame at 0s?
    // Or maybe 0 is fine. Code uses 1 in my test.
    return `${url}${separator}ci-process=snapshot&time=1&format=jpg`;
  }
  return url;
};
