/**
 * 主题系统
 * 支持多风格主题切换（颜色 + 样式 + 装饰）
 * 每个主题是独立的风格，不再区分日间/夜间模式
 */

// 风格变量接口
export interface StyleVariables {
  // 圆角
  radiusSmall: string;
  radiusMedium: string;
  radiusLarge: string;
  radiusFull: string;

  // 阴影
  shadowSmall: string;
  shadowMedium: string;
  shadowLarge: string;
  shadowPrimary: string;

  // 间距
  spacingXs: string;
  spacingSm: string;
  spacingMd: string;
  spacingLg: string;
  spacingXl: string;

  // 字体
  fontFamily: string;
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontWeight: string;
  fontWeightMedium: string;
  fontWeightBold: string;

  // 动画
  transitionFast: string;
  transitionNormal: string;
  transitionSlow: string;

  // 边框
  borderWidth: string;

  // 侧边栏
  sidebarWidth: string;
  sidebarItemRadius: string;
  sidebarBg: string;
  sidebarGradient: string;

  // 卡片
  cardHoverTransform: string;
  cardHoverShadow: string;

  // 装饰
  decorationPattern: string;
  decorationOpacity: string;
  glowEffect: string;
  borderStyle: string;
}

// 颜色变量接口
export interface ColorVariables {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  primaryGradient: string;

  secondary: string;
  secondaryLight: string;

  accent: string;
  accentLight: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  bgPage: string;
  bgPageGradient: string;
  bgCard: string;
  bgCardGradient: string;
  bgHover: string;
  bgActive: string;
  bgSidebar: string;
  bgSidebarGradient: string;

  borderColor: string;
  borderColorHover: string;
  borderColorActive: string;

  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;
}

// 完整主题接口 - 每个主题是独立的风格
export interface Theme {
  name: string;
  displayName: string;
  description: string;
  isDark: boolean;
  style: StyleVariables;
  colors: ColorVariables;
}

// 兼容旧接口
export interface LegacyTheme {
  name: string;
  displayName: string;
  description: string;
  style: StyleVariables;
  light: ColorVariables;
  dark: ColorVariables;
}

// ============================================
// 风格预设
// ============================================

// 现代风格 - 大圆角、柔和阴影、简洁
const modernStyle: StyleVariables = {
  radiusSmall: "12px",
  radiusMedium: "20px",
  radiusLarge: "24px",
  radiusFull: "9999px",

  shadowSmall: "0 1px 3px rgba(0, 0, 0, 0.05)",
  shadowMedium: "0 4px 12px rgba(0, 0, 0, 0.08)",
  shadowLarge: "0 8px 24px rgba(0, 0, 0, 0.12)",
  shadowPrimary: "0 8px 20px -4px rgba(0, 186, 255, 0.3)",

  spacingXs: "4px",
  spacingSm: "8px",
  spacingMd: "16px",
  spacingLg: "24px",
  spacingXl: "32px",

  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSizeXs: "12px",
  fontSizeSm: "13px",
  fontSizeMd: "14px",
  fontSizeLg: "16px",
  fontSizeXl: "18px",
  fontWeight: "400",
  fontWeightMedium: "500",
  fontWeightBold: "600",

  transitionFast: "0.15s ease",
  transitionNormal: "0.2s ease",
  transitionSlow: "0.3s ease",

  borderWidth: "1px",

  sidebarWidth: "280px",
  sidebarItemRadius: "16px",
  sidebarBg: "var(--bg-sidebar)",
  sidebarGradient: "none",

  cardHoverTransform: "translateY(-2px)",
  cardHoverShadow: "0 12px 24px -4px rgba(0, 0, 0, 0.12)",

  decorationPattern: "none",
  decorationOpacity: "0",
  glowEffect: "none",
  borderStyle: "solid",
};

// 深空专业暗黑风格 - 沉浸式深邃感
const deepSpaceStyle: StyleVariables = {
  radiusSmall: "8px",
  radiusMedium: "12px",
  radiusLarge: "16px",
  radiusFull: "9999px",

  shadowSmall: "0 2px 8px rgba(0, 0, 0, 0.3)",
  shadowMedium: "0 4px 16px rgba(0, 0, 0, 0.4)",
  shadowLarge: "0 8px 32px rgba(0, 0, 0, 0.5)",
  shadowPrimary: "0 0 20px rgba(45, 104, 255, 0.3)",

  spacingXs: "4px",
  spacingSm: "8px",
  spacingMd: "16px",
  spacingLg: "24px",
  spacingXl: "32px",

  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSizeXs: "12px",
  fontSizeSm: "13px",
  fontSizeMd: "14px",
  fontSizeLg: "16px",
  fontSizeXl: "18px",
  fontWeight: "400",
  fontWeightMedium: "500",
  fontWeightBold: "600",

  transitionFast: "0.15s ease",
  transitionNormal: "0.2s ease",
  transitionSlow: "0.3s ease",

  borderWidth: "1px",

  sidebarWidth: "260px",
  sidebarItemRadius: "10px",
  sidebarBg: "var(--bg-sidebar)",
  sidebarGradient:
    "linear-gradient(180deg, rgba(45, 104, 255, 0.03) 0%, transparent 100%)",

  cardHoverTransform: "translateY(-2px)",
  cardHoverShadow:
    "0 12px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(45, 104, 255, 0.1)",

  decorationPattern: "none",
  decorationOpacity: "0",
  glowEffect: "0 0 20px rgba(45, 104, 255, 0.2)",
  borderStyle: "solid",
};

// 赛博科技风格
const techStyle: StyleVariables = {
  radiusSmall: "6px",
  radiusMedium: "10px",
  radiusLarge: "14px",
  radiusFull: "6px",

  shadowSmall:
    "0 0 8px rgba(0, 242, 255, 0.15), inset 0 0 0 1px rgba(0, 242, 255, 0.1)",
  shadowMedium:
    "0 0 20px rgba(0, 242, 255, 0.2), inset 0 0 0 1px rgba(0, 242, 255, 0.15)",
  shadowLarge:
    "0 0 40px rgba(0, 242, 255, 0.25), inset 0 0 0 1px rgba(0, 242, 255, 0.2)",
  shadowPrimary: "0 0 30px rgba(0, 242, 255, 0.5)",

  spacingXs: "4px",
  spacingSm: "8px",
  spacingMd: "16px",
  spacingLg: "24px",
  spacingXl: "32px",

  fontFamily:
    '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
  fontSizeXs: "11px",
  fontSizeSm: "12px",
  fontSizeMd: "13px",
  fontSizeLg: "15px",
  fontSizeXl: "17px",
  fontWeight: "400",
  fontWeightMedium: "500",
  fontWeightBold: "600",

  transitionFast: "0.15s ease-out",
  transitionNormal: "0.2s ease-out",
  transitionSlow: "0.3s ease-out",

  borderWidth: "1px",

  sidebarWidth: "260px",
  sidebarItemRadius: "8px",
  sidebarBg: "var(--bg-sidebar)",
  sidebarGradient:
    "linear-gradient(180deg, rgba(0, 242, 255, 0.03) 0%, transparent 100%)",

  cardHoverTransform: "translateY(-2px)",
  cardHoverShadow:
    "0 0 35px rgba(0, 242, 255, 0.35), inset 0 0 0 1px rgba(0, 242, 255, 0.3)",

  decorationPattern: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%2300F2FF' stroke-width='0.3' stroke-opacity='0.06'%3E%3Cpath d='M0 0h40v40H0z'/%3E%3Cpath d='M20 0v40M0 20h40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  decorationOpacity: "1",
  glowEffect: "0 0 15px var(--ar-primary)",
  borderStyle: "solid",
};

// 教育友好风格
const eduStyle: StyleVariables = {
  radiusSmall: "16px",
  radiusMedium: "28px",
  radiusLarge: "36px",
  radiusFull: "9999px",

  shadowSmall: "0 2px 8px rgba(255, 107, 53, 0.08)",
  shadowMedium: "0 8px 24px rgba(255, 107, 53, 0.12)",
  shadowLarge: "0 16px 48px rgba(255, 107, 53, 0.16)",
  shadowPrimary: "0 12px 32px -4px rgba(255, 107, 53, 0.35)",

  spacingXs: "6px",
  spacingSm: "12px",
  spacingMd: "20px",
  spacingLg: "32px",
  spacingXl: "48px",

  fontFamily:
    '"Nunito", "Comic Neue", "Noto Sans SC", -apple-system, sans-serif',
  fontSizeXs: "13px",
  fontSizeSm: "14px",
  fontSizeMd: "15px",
  fontSizeLg: "17px",
  fontSizeXl: "20px",
  fontWeight: "400",
  fontWeightMedium: "600",
  fontWeightBold: "700",

  transitionFast: "0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
  transitionNormal: "0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
  transitionSlow: "0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",

  borderWidth: "2px",

  sidebarWidth: "300px",
  sidebarItemRadius: "20px",
  sidebarBg: "var(--bg-sidebar)",
  sidebarGradient:
    "linear-gradient(180deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 183, 77, 0.05) 100%)",

  cardHoverTransform: "translateY(-4px) scale(1.01)",
  cardHoverShadow: "0 20px 40px -8px rgba(255, 107, 53, 0.25)",

  decorationPattern: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q25 0 50 10 T100 10' stroke='%23FF6B35' stroke-width='0.5' fill='none' stroke-opacity='0.1'/%3E%3C/svg%3E")`,
  decorationOpacity: "1",
  glowEffect: "none",
  borderStyle: "solid",
};

// 新粗犷主义风格
const brutalismStyle: StyleVariables = {
  radiusSmall: "4px",
  radiusMedium: "8px",
  radiusLarge: "12px",
  radiusFull: "8px",

  shadowSmall: "3px 3px 0px #000000",
  shadowMedium: "5px 5px 0px #000000",
  shadowLarge: "8px 8px 0px #000000",
  shadowPrimary: "6px 6px 0px #000000",

  spacingXs: "6px",
  spacingSm: "12px",
  spacingMd: "18px",
  spacingLg: "28px",
  spacingXl: "40px",

  fontFamily:
    '"Lexend", "Space Grotesk", "Noto Sans SC", -apple-system, sans-serif',
  fontSizeXs: "13px",
  fontSizeSm: "14px",
  fontSizeMd: "15px",
  fontSizeLg: "18px",
  fontSizeXl: "22px",
  fontWeight: "500",
  fontWeightMedium: "700",
  fontWeightBold: "900",

  transitionFast: "0.1s ease-out",
  transitionNormal: "0.15s ease-out",
  transitionSlow: "0.2s ease-out",

  borderWidth: "3px",

  sidebarWidth: "280px",
  sidebarItemRadius: "8px",
  sidebarBg: "var(--bg-sidebar)",
  sidebarGradient: "none",

  cardHoverTransform: "translate(-2px, -2px)",
  cardHoverShadow: "10px 10px 0px #000000",

  decorationPattern: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23000000' fill-opacity='0.06'/%3E%3C/svg%3E")`,
  decorationOpacity: "1",
  glowEffect: "none",
  borderStyle: "solid",
};

// 极简风格
const minimalStyle: StyleVariables = {
  radiusSmall: "0",
  radiusMedium: "0",
  radiusLarge: "0",
  radiusFull: "0",

  shadowSmall: "none",
  shadowMedium: "none",
  shadowLarge: "none",
  shadowPrimary: "none",

  spacingXs: "4px",
  spacingSm: "8px",
  spacingMd: "16px",
  spacingLg: "24px",
  spacingXl: "32px",

  fontFamily:
    '"Inter", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif',
  fontSizeXs: "12px",
  fontSizeSm: "13px",
  fontSizeMd: "14px",
  fontSizeLg: "16px",
  fontSizeXl: "18px",
  fontWeight: "400",
  fontWeightMedium: "500",
  fontWeightBold: "600",

  transitionFast: "0.1s linear",
  transitionNormal: "0.15s linear",
  transitionSlow: "0.2s linear",

  borderWidth: "1px",

  sidebarWidth: "240px",
  sidebarItemRadius: "0",
  sidebarBg: "var(--bg-sidebar)",
  sidebarGradient: "none",

  cardHoverTransform: "none",
  cardHoverShadow: "none",

  decorationPattern: "none",
  decorationOpacity: "0",
  glowEffect: "none",
  borderStyle: "solid",
};

// ============================================
// 颜色预设
// ============================================

// 现代蓝日间配色（默认）
const modernBlueColors: ColorVariables = {
  primary: "#00BAFF",
  primaryHover: "#0099DD",
  primaryLight: "rgba(0, 186, 255, 0.1)",
  primaryDark: "#0077AA",
  primaryGradient: "linear-gradient(135deg, #00BAFF 0%, #0099DD 100%)",

  secondary: "#6366f1",
  secondaryLight: "rgba(99, 102, 241, 0.1)",

  accent: "#f59e0b",
  accentLight: "rgba(245, 158, 11, 0.1)",

  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  textInverse: "#ffffff",

  bgPage: "#f0f4f8",
  bgPageGradient: "linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%)",
  bgCard: "#ffffff",
  bgCardGradient: "none",
  bgHover: "#f8fafc",
  bgActive: "#e2e8f0",
  bgSidebar: "#ffffff",
  bgSidebarGradient: "none",

  borderColor: "#e2e8f0",
  borderColorHover: "#94a3b8",
  borderColorActive: "#00BAFF",

  success: "#22c55e",
  successLight: "rgba(34, 197, 94, 0.1)",
  warning: "#f59e0b",
  warningLight: "rgba(245, 158, 11, 0.1)",
  danger: "#ef4444",
  dangerLight: "rgba(239, 68, 68, 0.1)",
  info: "#00BAFF",
  infoLight: "rgba(0, 186, 255, 0.1)",
};

/**
 * 根据主色生成完整的颜色配置
 * @param primaryColor 主色调 HEX 值
 * @returns 完整的颜色配置
 */
export function generateModernColors(primaryColor: string): ColorVariables {
  // 将 HEX 转换为 RGB
  const hex = primaryColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 生成 hover 色（稍暗）
  const darken = (value: number, amount: number) =>
    Math.max(0, Math.min(255, Math.round(value * (1 - amount))));
  const hoverR = darken(r, 0.15);
  const hoverG = darken(g, 0.15);
  const hoverB = darken(b, 0.15);
  const primaryHover = `#${hoverR.toString(16).padStart(2, "0")}${hoverG.toString(16).padStart(2, "0")}${hoverB.toString(16).padStart(2, "0")}`;

  // 生成 dark 色（更暗）
  const darkR = darken(r, 0.3);
  const darkG = darken(g, 0.3);
  const darkB = darken(b, 0.3);
  const primaryDark = `#${darkR.toString(16).padStart(2, "0")}${darkG.toString(16).padStart(2, "0")}${darkB.toString(16).padStart(2, "0")}`;

  return {
    primary: primaryColor,
    primaryHover,
    primaryLight: `rgba(${r}, ${g}, ${b}, 0.1)`,
    primaryDark,
    primaryGradient: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryHover} 100%)`,

    secondary: "#6366f1",
    secondaryLight: "rgba(99, 102, 241, 0.1)",

    accent: "#f59e0b",
    accentLight: "rgba(245, 158, 11, 0.1)",

    textPrimary: "#1e293b",
    textSecondary: "#64748b",
    textMuted: "#94a3b8",
    textInverse: "#ffffff",

    bgPage: "#f0f4f8",
    bgPageGradient: "linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%)",
    bgCard: "#ffffff",
    bgCardGradient: "none",
    bgHover: "#f8fafc",
    bgActive: "#e2e8f0",
    bgSidebar: "#ffffff",
    bgSidebarGradient: "none",

    borderColor: "#e2e8f0",
    borderColorHover: "#94a3b8",
    borderColorActive: primaryColor,

    success: "#22c55e",
    successLight: "rgba(34, 197, 94, 0.1)",
    warning: "#f59e0b",
    warningLight: "rgba(245, 158, 11, 0.1)",
    danger: "#ef4444",
    dangerLight: "rgba(239, 68, 68, 0.1)",
    info: primaryColor,
    infoLight: `rgba(${r}, ${g}, ${b}, 0.1)`,
  };
}

/**
 * 根据主色生成主色阴影
 * @param primaryColor 主色调 HEX 值
 * @returns 主色阴影 CSS 值
 */
export function generatePrimaryShadow(primaryColor: string): string {
  const hex = primaryColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `0 8px 20px -4px rgba(${r}, ${g}, ${b}, 0.3)`;
}

// 预设主题色（用于色盘快速选择）
export const presetPrimaryColors = [
  { name: "科技蓝", color: "#00BAFF" },
  { name: "活力橙", color: "#FF6B35" },
  { name: "自然绿", color: "#10B981" },
  { name: "优雅紫", color: "#8B5CF6" },
  { name: "玫瑰粉", color: "#F43F5E" },
  { name: "天空蓝", color: "#0EA5E9" },
  { name: "琥珀黄", color: "#F59E0B" },
  { name: "靛蓝", color: "#6366F1" },
  { name: "青色", color: "#14B8A6" },
  { name: "石板灰", color: "#64748B" },
];

// 深空专业暗黑配色 - Deep Space Professional Dark
const deepSpaceColors: ColorVariables = {
  // 核心强调蓝
  primary: "#2D68FF",
  primaryHover: "#4080FF",
  primaryLight: "rgba(45, 104, 255, 0.15)",
  primaryDark: "#1A4FCC",
  primaryGradient: "linear-gradient(135deg, #1A3D8F 0%, #2D68FF 100%)",

  // 亮部点缀蓝
  secondary: "#00A3FF",
  secondaryLight: "rgba(0, 163, 255, 0.15)",

  // 暗部点缀蓝
  accent: "#1A2C4D",
  accentLight: "rgba(26, 44, 77, 0.3)",

  // 文字色阶
  textPrimary: "#FFFFFF", // 一级标题 - 纯白
  textSecondary: "#B0B3B8", // 正文内容 - 中灰色
  textMuted: "#63676D", // 次要/辅助信息 - 深灰色
  textInverse: "#0B0E14",

  // 背景色 - 沉浸式深邃感
  bgPage: "#0B0E14", // 主内容区背景 - 极深灰蓝
  bgPageGradient: "linear-gradient(180deg, #0B0E14 0%, #0D1117 100%)",
  bgCard: "#151921", // 卡片/容器背景
  bgCardGradient: "none",
  bgHover: "#1C2128",
  bgActive: "#252B35",
  bgSidebar: "#080A0F", // 侧边栏背景 - 全界面最暗点
  bgSidebarGradient:
    "linear-gradient(180deg, rgba(45, 104, 255, 0.02) 0%, transparent 100%)",

  // 边框
  borderColor: "#21262D",
  borderColorHover: "#30363D",
  borderColorActive: "#2D68FF",

  // 语义色
  success: "#3FB950",
  successLight: "rgba(63, 185, 80, 0.15)",
  warning: "#D29922",
  warningLight: "rgba(210, 153, 34, 0.15)",
  danger: "#F85149",
  dangerLight: "rgba(248, 81, 73, 0.15)",
  info: "#00A3FF",
  infoLight: "rgba(0, 163, 255, 0.15)",
};

// 赛博霓虹配色
const cyberNeonColors: ColorVariables = {
  primary: "#00F2FF",
  primaryHover: "#33F5FF",
  primaryLight: "rgba(0, 242, 255, 0.12)",
  primaryDark: "#00C4CC",
  primaryGradient: "linear-gradient(135deg, #00F2FF 0%, #00D4E6 100%)",

  secondary: "#9D00FF",
  secondaryLight: "rgba(157, 0, 255, 0.12)",

  accent: "#FF6B00",
  accentLight: "rgba(255, 107, 0, 0.12)",

  textPrimary: "#E8F4F8",
  textSecondary: "#8BA3AD",
  textMuted: "#5A7078",
  textInverse: "#0B0E14",

  bgPage: "#0B0E14",
  bgPageGradient: "linear-gradient(180deg, #0B0E14 0%, #121820 100%)",
  bgCard: "rgba(18, 24, 32, 0.85)",
  bgCardGradient:
    "linear-gradient(135deg, rgba(0, 242, 255, 0.03) 0%, rgba(157, 0, 255, 0.02) 100%)",
  bgHover: "rgba(0, 242, 255, 0.08)",
  bgActive: "rgba(0, 242, 255, 0.15)",
  bgSidebar: "rgba(11, 14, 20, 0.95)",
  bgSidebarGradient:
    "linear-gradient(180deg, rgba(0, 242, 255, 0.04) 0%, transparent 60%)",

  borderColor: "rgba(0, 242, 255, 0.2)",
  borderColorHover: "rgba(0, 242, 255, 0.4)",
  borderColorActive: "#00F2FF",

  success: "#00FF9D",
  successLight: "rgba(0, 255, 157, 0.12)",
  warning: "#FFB800",
  warningLight: "rgba(255, 184, 0, 0.12)",
  danger: "#FF3366",
  dangerLight: "rgba(255, 51, 102, 0.12)",
  info: "#00F2FF",
  infoLight: "rgba(0, 242, 255, 0.12)",
};

// 教育橙配色
const eduOrangeColors: ColorVariables = {
  primary: "#FF6B35",
  primaryHover: "#E55A2B",
  primaryLight: "rgba(255, 107, 53, 0.12)",
  primaryDark: "#CC4A1F",
  primaryGradient: "linear-gradient(135deg, #FF6B35 0%, #FFB347 100%)",

  secondary: "#4CAF50",
  secondaryLight: "rgba(76, 175, 80, 0.12)",

  accent: "#9C27B0",
  accentLight: "rgba(156, 39, 176, 0.12)",

  textPrimary: "#2d2d2d",
  textSecondary: "#666666",
  textMuted: "#999999",
  textInverse: "#ffffff",

  bgPage: "#FFF8F5",
  bgPageGradient: "linear-gradient(180deg, #FFF8F5 0%, #FFE8DD 100%)",
  bgCard: "#ffffff",
  bgCardGradient:
    "linear-gradient(135deg, rgba(255, 107, 53, 0.02) 0%, rgba(255, 183, 71, 0.02) 100%)",
  bgHover: "#FFF0EB",
  bgActive: "#FFE4DB",
  bgSidebar: "#ffffff",
  bgSidebarGradient:
    "linear-gradient(180deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 183, 71, 0.04) 100%)",

  borderColor: "#FFE4DB",
  borderColorHover: "#FFB8A3",
  borderColorActive: "#FF6B35",

  success: "#4CAF50",
  successLight: "rgba(76, 175, 80, 0.12)",
  warning: "#FF9800",
  warningLight: "rgba(255, 152, 0, 0.12)",
  danger: "#F44336",
  dangerLight: "rgba(244, 67, 54, 0.12)",
  info: "#2196F3",
  infoLight: "rgba(33, 150, 243, 0.12)",
};

// 新粗犷主义配色
const brutalismColors: ColorVariables = {
  primary: "#FFF000",
  primaryHover: "#E6D900",
  primaryLight: "rgba(255, 240, 0, 0.25)",
  primaryDark: "#CCBF00",
  primaryGradient: "none",

  secondary: "#FF007A",
  secondaryLight: "rgba(255, 0, 122, 0.15)",

  accent: "#00FFC2",
  accentLight: "rgba(0, 255, 194, 0.2)",

  textPrimary: "#000000",
  textSecondary: "#333333",
  textMuted: "#666666",
  textInverse: "#000000",

  bgPage: "#FAFAF8",
  bgPageGradient: "none",
  bgCard: "#FFFFFF",
  bgCardGradient: "none",
  bgHover: "#F5F5F0",
  bgActive: "#EEEEEA",
  bgSidebar: "#FFFFFF",
  bgSidebarGradient: "none",

  borderColor: "#000000",
  borderColorHover: "#000000",
  borderColorActive: "#000000",

  success: "#00E676",
  successLight: "rgba(0, 230, 118, 0.2)",
  warning: "#FFAB00",
  warningLight: "rgba(255, 171, 0, 0.2)",
  danger: "#FF1744",
  dangerLight: "rgba(255, 23, 68, 0.15)",
  info: "#00B0FF",
  infoLight: "rgba(0, 176, 255, 0.15)",
};

// 极简黑白配色
const minimalColors: ColorVariables = {
  primary: "#000000",
  primaryHover: "#333333",
  primaryLight: "rgba(0, 0, 0, 0.05)",
  primaryDark: "#000000",
  primaryGradient: "none",

  secondary: "#666666",
  secondaryLight: "rgba(102, 102, 102, 0.08)",

  accent: "#000000",
  accentLight: "rgba(0, 0, 0, 0.05)",

  textPrimary: "#000000",
  textSecondary: "#666666",
  textMuted: "#999999",
  textInverse: "#ffffff",

  bgPage: "#ffffff",
  bgPageGradient: "none",
  bgCard: "#ffffff",
  bgCardGradient: "none",
  bgHover: "#f5f5f5",
  bgActive: "#eeeeee",
  bgSidebar: "#fafafa",
  bgSidebarGradient: "none",

  borderColor: "#e0e0e0",
  borderColorHover: "#bdbdbd",
  borderColorActive: "#000000",

  success: "#4caf50",
  successLight: "rgba(76, 175, 80, 0.08)",
  warning: "#ff9800",
  warningLight: "rgba(255, 152, 0, 0.08)",
  danger: "#f44336",
  dangerLight: "rgba(244, 67, 54, 0.08)",
  info: "#2196f3",
  infoLight: "rgba(33, 150, 243, 0.08)",
};

// ============================================
// 主题定义 - 每个主题是独立的风格
// ============================================

export const themes: Theme[] = [
  {
    name: "modern-blue",
    displayName: "日间模式",
    description: "柔和圆润的现代设计风格，支持自定义主题色",
    isDark: false,
    style: modernStyle,
    colors: modernBlueColors,
  },
  {
    name: "deep-space",
    displayName: "夜间模式",
    description: "深空专业暗黑风格，沉浸式极客体验",
    isDark: true,
    style: deepSpaceStyle,
    colors: deepSpaceColors,
  },
  {
    name: "cyber-tech",
    displayName: "赛博科技",
    description: "锐利边角、霓虹发光效果，充满未来感",
    isDark: true,
    style: techStyle,
    colors: cyberNeonColors,
  },
  {
    name: "edu-friendly",
    displayName: "暖阳橙韵",
    description: "温暖圆润、活泼有趣，明快橙色调",
    isDark: false,
    style: eduStyle,
    colors: eduOrangeColors,
  },
  {
    name: "neo-brutalism",
    displayName: "新粗犷主义",
    description: "大胆边框、硬阴影、高饱和度，潮流艺术风格",
    isDark: false,
    style: brutalismStyle,
    colors: brutalismColors,
  },
  {
    name: "minimal-pure",
    displayName: "极简纯净",
    description: "无装饰、纯粹简洁，专注内容本身",
    isDark: false,
    style: minimalStyle,
    colors: minimalColors,
  },
];

// 获取主题
export function getTheme(name: string): Theme | undefined {
  return themes.find((t) => t.name === name);
}

// 默认主题
export const defaultTheme = themes[0];
