/**
 * 主题切换 Composable
 * 支持完整的风格主题切换（颜色 + 样式 + 装饰）
 * 每个主题是独立的风格，不再区分日间/夜间模式
 */
import { computed, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { themes, defaultTheme, getTheme, generateModernColors, generatePrimaryShadow, presetPrimaryColors, type Theme, type ColorVariables, type StyleVariables } from '@/styles/themes'
import { useSettingsStore } from '@/store/modules/settings'
import { ThemeEnum } from '@/enums/ThemeEnum'

// 当前主题名称（持久化到 localStorage）
const currentThemeName = useStorage<string>('appTheme', defaultTheme.name)

// 自定义主题色（仅用于日间模式）
const customPrimaryColor = useStorage<string | null>('customPrimaryColor', null)

export function useTheme() {
  // 当前主题
  const currentTheme = computed<Theme>(() => {
    return getTheme(currentThemeName.value) || defaultTheme
  })
  
  // 当前是否为深色主题
  const isDarkTheme = computed(() => currentTheme.value.isDark)
  
  // 当前颜色配置
  const currentColors = computed<ColorVariables>(() => {
    return currentTheme.value.colors
  })
  
  // 当前风格配置
  const currentStyle = computed<StyleVariables>(() => {
    return currentTheme.value.style
  })
  
  // 所有可用主题
  const availableThemes = computed(() => themes)
  
  /**
   * 应用风格变量到 CSS
   */
  function applyStyleVariables(style: StyleVariables) {
    const root = document.documentElement
    
    // 圆角
    root.style.setProperty('--radius-sm', style.radiusSmall)
    root.style.setProperty('--radius-md', style.radiusMedium)
    root.style.setProperty('--radius-lg', style.radiusLarge)
    root.style.setProperty('--radius-full', style.radiusFull)
    
    // 阴影
    root.style.setProperty('--shadow-sm', style.shadowSmall)
    root.style.setProperty('--shadow-md', style.shadowMedium)
    root.style.setProperty('--shadow-lg', style.shadowLarge)
    root.style.setProperty('--shadow-primary', style.shadowPrimary)
    
    // 间距
    root.style.setProperty('--spacing-xs', style.spacingXs)
    root.style.setProperty('--spacing-sm', style.spacingSm)
    root.style.setProperty('--spacing-md', style.spacingMd)
    root.style.setProperty('--spacing-lg', style.spacingLg)
    root.style.setProperty('--spacing-xl', style.spacingXl)
    
    // 字体
    root.style.setProperty('--font-family', style.fontFamily)
    root.style.setProperty('--font-size-xs', style.fontSizeXs)
    root.style.setProperty('--font-size-sm', style.fontSizeSm)
    root.style.setProperty('--font-size-md', style.fontSizeMd)
    root.style.setProperty('--font-size-lg', style.fontSizeLg)
    root.style.setProperty('--font-size-xl', style.fontSizeXl)
    root.style.setProperty('--font-weight', style.fontWeight)
    root.style.setProperty('--font-weight-medium', style.fontWeightMedium)
    root.style.setProperty('--font-weight-bold', style.fontWeightBold)
    
    // 动画
    root.style.setProperty('--transition-fast', style.transitionFast)
    root.style.setProperty('--transition-normal', style.transitionNormal)
    root.style.setProperty('--transition-slow', style.transitionSlow)
    
    // 边框
    root.style.setProperty('--border-width', style.borderWidth)
    root.style.setProperty('--border-style', style.borderStyle)
    
    // 侧边栏
    root.style.setProperty('--sidebar-width', style.sidebarWidth)
    root.style.setProperty('--sidebar-item-radius', style.sidebarItemRadius)
    root.style.setProperty('--sidebar-gradient', style.sidebarGradient)
    
    // 卡片悬停效果
    root.style.setProperty('--card-hover-transform', style.cardHoverTransform)
    root.style.setProperty('--card-hover-shadow', style.cardHoverShadow)
    
    // 装饰
    root.style.setProperty('--decoration-pattern', style.decorationPattern)
    root.style.setProperty('--decoration-opacity', style.decorationOpacity)
    root.style.setProperty('--glow-effect', style.glowEffect)
    
    // Element Plus 兼容
    root.style.setProperty('--el-border-radius-base', style.radiusSmall)
    root.style.setProperty('--el-border-radius-small', style.radiusSmall)
    root.style.setProperty('--el-border-radius-round', style.radiusFull)
  }
  
  /**
   * 应用颜色变量到 CSS
   */
  function applyColorVariables(colors: ColorVariables) {
    const root = document.documentElement
    
    // ============================================
    // 新变量系统
    // ============================================
    
    // 主色调
    root.style.setProperty('--primary-color', colors.primary)
    root.style.setProperty('--primary-hover', colors.primaryHover)
    root.style.setProperty('--primary-light', colors.primaryLight)
    root.style.setProperty('--primary-dark', colors.primaryDark)
    root.style.setProperty('--primary-gradient', colors.primaryGradient)
    
    // 次要色和强调色
    root.style.setProperty('--secondary-color', colors.secondary)
    root.style.setProperty('--secondary-light', colors.secondaryLight)
    root.style.setProperty('--accent-color', colors.accent)
    root.style.setProperty('--accent-light', colors.accentLight)
    
    // 文字颜色
    root.style.setProperty('--text-primary', colors.textPrimary)
    root.style.setProperty('--text-secondary', colors.textSecondary)
    root.style.setProperty('--text-muted', colors.textMuted)
    root.style.setProperty('--text-inverse', colors.textInverse)
    
    // 背景颜色
    root.style.setProperty('--bg-page', colors.bgPage)
    root.style.setProperty('--bg-page-gradient', colors.bgPageGradient)
    root.style.setProperty('--bg-card', colors.bgCard)
    root.style.setProperty('--bg-card-gradient', colors.bgCardGradient)
    root.style.setProperty('--bg-hover', colors.bgHover)
    root.style.setProperty('--bg-active', colors.bgActive)
    root.style.setProperty('--bg-sidebar', colors.bgSidebar)
    root.style.setProperty('--bg-sidebar-gradient', colors.bgSidebarGradient)
    // 兼容旧变量名
    root.style.setProperty('--bg-color', colors.bgPage)
    root.style.setProperty('--card-bg', colors.bgCard)
    
    // 边框颜色
    root.style.setProperty('--border-color', colors.borderColor)
    root.style.setProperty('--border-color-hover', colors.borderColorHover)
    root.style.setProperty('--border-color-active', colors.borderColorActive)
    
    // 语义色
    root.style.setProperty('--success-color', colors.success)
    root.style.setProperty('--success-light', colors.successLight)
    root.style.setProperty('--warning-color', colors.warning)
    root.style.setProperty('--warning-light', colors.warningLight)
    root.style.setProperty('--danger-color', colors.danger)
    root.style.setProperty('--danger-light', colors.dangerLight)
    root.style.setProperty('--danger-bg', colors.dangerLight)
    root.style.setProperty('--danger-border', colors.danger)
    root.style.setProperty('--info-color', colors.info)
    root.style.setProperty('--info-light', colors.infoLight)
    
    // ============================================
    // 兼容项目现有的 --ar-* 变量系统
    // ============================================
    
    // 主色调
    root.style.setProperty('--ar-primary', colors.primary)
    root.style.setProperty('--ar-primary-dark', colors.primaryHover)
    root.style.setProperty('--ar-primary-light', colors.primaryLight)
    root.style.setProperty('--ar-primary-alpha-10', colors.primaryLight)
    root.style.setProperty('--ar-primary-alpha-20', colors.primaryLight.replace(/[\d.]+\)$/, '0.2)'))
    
    // 背景色
    root.style.setProperty('--ar-bg-light', colors.bgPage)
    root.style.setProperty('--ar-bg-dark', colors.bgPage)
    
    // 侧边栏样式
    root.style.setProperty('--menu-background', colors.bgSidebar)
    root.style.setProperty('--menu-text', colors.textSecondary)
    root.style.setProperty('--menu-active-text', colors.textInverse)
    root.style.setProperty('--menu-active-bg', colors.primary)
    root.style.setProperty('--menu-hover', colors.bgHover)
    root.style.setProperty('--sidebar-logo-background', colors.bgSidebar)
    root.style.setProperty('--sidebar-border', colors.borderColor)
    
    // 卡片和边框
    root.style.setProperty('--ar-card-bg', colors.bgCard)
    root.style.setProperty('--ar-card-border', colors.borderColor)
    root.style.setProperty('--ar-divider', colors.borderColor)
    
    // 文字颜色
    root.style.setProperty('--ar-text-primary', colors.textPrimary)
    root.style.setProperty('--ar-text-secondary', colors.textSecondary)
    root.style.setProperty('--ar-text-muted', colors.textMuted)
    root.style.setProperty('--ar-text-danger', colors.danger)
    
    // ============================================
    // Element Plus 变量
    // ============================================
    root.style.setProperty('--el-color-primary', colors.primary)
    root.style.setProperty('--el-color-primary-dark-2', colors.primaryHover)
    root.style.setProperty('--el-color-primary-light-3', colors.primaryLight)
    root.style.setProperty('--el-color-primary-light-5', colors.primaryLight)
    root.style.setProperty('--el-color-primary-light-7', colors.primaryLight)
    root.style.setProperty('--el-color-primary-light-9', colors.primaryLight)
    root.style.setProperty('--el-bg-color', colors.bgCard)
    root.style.setProperty('--el-bg-color-page', colors.bgPage)
    root.style.setProperty('--el-bg-color-overlay', colors.bgCard)
    root.style.setProperty('--el-text-color-primary', colors.textPrimary)
    root.style.setProperty('--el-text-color-regular', colors.textSecondary)
    root.style.setProperty('--el-text-color-secondary', colors.textMuted)
    root.style.setProperty('--el-border-color', colors.borderColor)
    root.style.setProperty('--el-border-color-light', colors.borderColor)
    root.style.setProperty('--el-border-color-lighter', colors.borderColor)
  }
  
  /**
   * 应用完整主题
   */
  function applyTheme(theme: Theme) {
    applyStyleVariables(theme.style)
    applyColorVariables(theme.colors)
    
    // 设置主题类名到 body
    document.body.setAttribute('data-theme', theme.name)
    document.body.setAttribute('data-mode', theme.isDark ? 'dark' : 'light')
    
    // 移除旧主题类名，添加新主题类名
    themes.forEach(t => {
      document.body.classList.remove(`theme-${t.name}`)
    })
    document.body.classList.add(`theme-${theme.name}`)
    
    // 深色主题添加 dark-mode 类
    if (theme.isDark) {
      document.body.classList.add('dark-mode')
      document.documentElement.classList.add('dark')
    } else {
      document.body.classList.remove('dark-mode')
      document.documentElement.classList.remove('dark')
    }
    
    // 同步到 settings store，确保使用旧 API 的组件也能正常工作
    try {
      const settingsStore = useSettingsStore()
      settingsStore.changeTheme(theme.isDark ? ThemeEnum.DARK : ThemeEnum.LIGHT)
    } catch {
      // 在 store 初始化之前可能会失败，忽略错误
    }
  }
  
  /**
   * 切换主题
   */
  function setTheme(themeName: string) {
    const theme = getTheme(themeName)
    if (theme) {
      currentThemeName.value = themeName
      // 切换主题时，如果是日间模式且有自定义主题色，应用自定义色
      if (themeName === 'modern-blue' && customPrimaryColor.value) {
        applyTheme(theme)
        const customColors = generateModernColors(customPrimaryColor.value)
        applyColorVariables(customColors)
        // 更新主色阴影
        document.documentElement.style.setProperty('--shadow-primary', generatePrimaryShadow(customPrimaryColor.value))
      } else {
        // 非日间模式，清除自定义主题色的应用
        applyTheme(theme)
      }
    }
  }
  
  /**
   * 设置自定义主题色（仅日间模式有效）
   * @param color HEX 颜色值，如 '#FF6B35'；传 null 重置为默认科技蓝
   */
  function setCustomPrimaryColor(color: string | null) {
    if (currentThemeName.value !== 'modern-blue') {
      console.warn('自定义主题色仅在日间模式下有效')
      return
    }
    
    customPrimaryColor.value = color
    
    if (color) {
      // 应用自定义颜色
      const customColors = generateModernColors(color)
      applyColorVariables(customColors)
      // 更新主色阴影
      document.documentElement.style.setProperty('--shadow-primary', generatePrimaryShadow(color))
    } else {
      // 重置为默认颜色
      const theme = getTheme('modern-blue')
      if (theme) {
        applyColorVariables(theme.colors)
        // 重置主色阴影
        document.documentElement.style.setProperty('--shadow-primary', '0 8px 20px -4px rgba(0, 186, 255, 0.3)')
      }
    }
  }
  
  /**
   * 获取当前自定义主题色
   */
  function getCustomPrimaryColor(): string | null {
    return customPrimaryColor.value
  }
  
  /**
   * 初始化主题
   */
  function initTheme() {
    applyTheme(currentTheme.value)
    // 如果是日间模式且有自定义主题色，应用自定义色
    if (currentThemeName.value === 'modern-blue' && customPrimaryColor.value) {
      const customColors = generateModernColors(customPrimaryColor.value)
      applyColorVariables(customColors)
      // 更新主色阴影
      document.documentElement.style.setProperty('--shadow-primary', generatePrimaryShadow(customPrimaryColor.value))
    }
  }
  
  // 监听主题变化
  watch(currentThemeName, () => {
    applyTheme(currentTheme.value)
  })
  
  return {
    // 状态
    isDarkTheme,
    currentTheme,
    currentColors,
    currentStyle,
    availableThemes,
    currentThemeName,
    
    // 方法
    setTheme,
    initTheme,
    setCustomPrimaryColor,
    getCustomPrimaryColor,
    
    // 预设色
    presetPrimaryColors,
  }
}
