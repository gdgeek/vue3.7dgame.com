/**
 * 日期时间工具模块
 * 使用 dayjs 替代 moment.js，减少约 68KB 的包体积
 *
 * 安装命令: pnpm add dayjs
 */
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";

// 注册插件
dayjs.extend(relativeTime);

// 设置默认语言
dayjs.locale("zh-cn");

/**
 * 格式化日期时间
 * @param date 日期字符串或 Date 对象
 * @param format 格式字符串，默认 "YYYY-MM-DD HH:mm:ss"
 */
export function formatDateTime(
  date: string | Date,
  format: string = "YYYY-MM-DD HH:mm:ss"
): string {
  return dayjs(date).format(format);
}

/**
 * 格式化日期
 * @param date 日期字符串或 Date 对象
 * @param format 格式字符串，默认 "YYYY-MM-DD"
 */
export function formatDate(
  date: string | Date,
  format: string = "YYYY-MM-DD"
): string {
  return dayjs(date).format(format);
}

/**
 * 获取相对时间（如：3 分钟前）
 * @param date 日期字符串或 Date 对象
 */
export function fromNow(date: string | Date): string {
  return dayjs(date).fromNow();
}

/**
 * 获取两个日期之间的差值
 * @param date1 日期1
 * @param date2 日期2
 * @param unit 单位，默认 "day"
 */
export function diff(
  date1: string | Date,
  date2: string | Date,
  unit: dayjs.UnitType = "day"
): number {
  return dayjs(date1).diff(dayjs(date2), unit);
}

/**
 * 判断日期是否在今天之前
 * @param date 日期字符串或 Date 对象
 */
export function isBefore(date: string | Date): boolean {
  return dayjs(date).isBefore(dayjs());
}

/**
 * 判断日期是否在今天之后
 * @param date 日期字符串或 Date 对象
 */
export function isAfter(date: string | Date): boolean {
  return dayjs(date).isAfter(dayjs());
}

/**
 * 获取 dayjs 实例，用于更复杂的操作
 */
export { dayjs };

export default dayjs;
