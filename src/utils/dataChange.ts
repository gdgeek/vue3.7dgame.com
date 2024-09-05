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
