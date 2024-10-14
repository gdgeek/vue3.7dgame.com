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

export const convertToLocalTime = (
  utcDateString: string,
  timeZone?: string
) => {
  // 获取用户所在的时区，作为默认时区
  const userTimeZone =
    timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const utcDate = new Date(utcDateString + "Z"); // 添加 'Z' 表示 UTC 时间
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
