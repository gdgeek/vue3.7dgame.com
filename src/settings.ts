import { SizeEnum } from "./enums/SizeEnum";
import { LayoutEnum } from "./enums/LayoutEnum";
import { ThemeEnum } from "./enums/ThemeEnum";
import { LanguageEnum } from "./enums/LanguageEnum";

const { pkg, buildTimestamp } = __APP_INFO__;

// 用构建时间生成版本号，格式：YYYY.MM.DD.HHmm
const buildDate = new Date(buildTimestamp);
const buildVersion = [
  buildDate.getFullYear(),
  String(buildDate.getMonth() + 1).padStart(2, "0"),
  String(buildDate.getDate()).padStart(2, "0"),
  String(buildDate.getHours()).padStart(2, "0") +
    String(buildDate.getMinutes()).padStart(2, "0"),
].join(".");

const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");

const defaultSettings: AppSettings = {
  title: pkg.name,
  version: buildVersion,
  showSettings: true,
  tagsView: false, // 标签页
  fixedHeader: true,
  sidebarLogo: true,
  layout: LayoutEnum.LEFT,
  theme: mediaQueryList.matches ? ThemeEnum.DARK : ThemeEnum.LIGHT,
  size: SizeEnum.DEFAULT,
  language: LanguageEnum.ZH_CN,
  themeColor: "#409EFF",
  watermarkEnabled: false,
  watermarkContent: pkg.name,
};

export default defaultSettings;
