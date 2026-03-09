# Findings: Language & Style Settings Management

## Current Implementation Analysis

### Language Management
- **Store**: `src/store/modules/app.ts` - `useAppStore()`
- **State**: `language` ref using `useStorage("language", defaultSettings.language)`
- **Default**: `LanguageEnum.ZH_CN` (from `src/settings.ts`)
- **Supported Languages**: 
  - `zh-CN` (Simplified Chinese)
  - `en-US` (English)
  - `ja-JP` (Japanese)
  - `th-TH` (Thai)
  - `zh-TW` (Traditional Chinese)
- **Switching**: `changeLanguage(val: string)` async method in app store
- **i18n Setup**: `src/lang/index.ts` with dynamic language loading via `loadLanguageAsync()`
- **Persistence**: Already persisted to localStorage via `useStorage()`
- **UI Component**: `src/components/LangSelect/index.vue` and `src/layout/components/NavBar/components/HeaderActions.vue`

### Style/Theme Management - Two-Layer System

#### Layer 1: Legacy Settings Store
- **Store**: `src/store/modules/settings.ts` - `useSettingsStore()`
- **Theme State**: `theme` ref (light/dark) using `useStorage("theme", defaultSettings.theme)`
- **Layout State**: `layout` ref (left/top/mix) using `useStorage("layout", defaultSettings.layout)`
- **Theme Color**: `themeColor` ref using `useStorage("themeColor", defaultSettings.themeColor)`
- **Other Settings**: `tagsView`, `fixedHeader`, `sidebarLogo`, `watermarkEnabled` (all persisted)
- **Methods**: `changeTheme()`, `changeLayout()`, `changeThemeColor()`
- **Persistence**: localStorage via `useStorage()`

#### Layer 2: Modern Theme Composable
- **Location**: `src/composables/useTheme.ts`
- **Theme Names**: Stored in `currentThemeName` (localStorage key: `appTheme`)
- **Custom Colors**: `customPrimaryColor` (localStorage key: `customPrimaryColor`)
- **CSS Variables**: Comprehensive system with 100+ CSS custom properties
- **Available Themes**: Multiple theme objects (modern-blue, deep-space, cyber-tech, edu-friendly, neo-brutalism, minimal-pure)
- **Methods**: `setTheme()`, `setCustomPrimaryColor()`, `initTheme()`
- **Initialization**: Called in app startup to apply theme variables

### Domain-Level Settings Control
- **Store**: `src/store/modules/domain.ts` - `useDomainStore()`
- **Locking Mechanism**: 
  - `isLanguageLocked`: Prevents language switching if domain specifies a language
  - `isStyleLocked`: Prevents theme switching if domain specifies a style (style > 0)
- **API Integration**: Fetches domain configuration from backend
- **Favicon Support**: Can set custom favicon per domain
- **Caching**: Uses cookies with 7-day expiry for domain info

### Router Setup
- **Location**: `src/router/index.ts`
- **History Mode**: `createWebHistory()` (no hash mode)
- **Scroll Behavior**: Resets to top on navigation
- **Current State**: No query parameter handling for settings

### UI Components for Settings
- **Settings Drawer**: `src/layout/components/Settings/index.vue`
  - Theme toggle (light/dark)
  - Theme color picker
  - Layout selector
  - Tags view, fixed header, sidebar logo toggles
- **NavBar**: `src/layout/components/NavBar/index.vue`
  - Contains HeaderActions component
- **Language Switching**: `src/layout/components/NavBar/components/HeaderActions.vue`
  - Dropdown with all supported languages
  - Checks `domainStore.isLanguageLocked` to hide if locked
- **Theme Switching**: Same HeaderActions component
  - Dropdown with all available themes
  - Checks `domainStore.isStyleLocked` to hide if locked

### App Initialization Flow
1. `src/main.ts` - Entry point
   - Creates app instance
   - Loads language from app store: `loadLanguageAsync(appStore.language)`
   - Mounts app after language is ready
2. `src/App.vue` - Root component
   - Fetches domain info on mount: `domainStore.fetchDomainInfo()`
   - This triggers language lock if domain specifies one
   - This triggers theme lock if domain specifies one
3. `src/composables/useTheme.ts` - Theme initialization
   - Called during app setup
   - Applies CSS variables to document root
   - Syncs with settings store

## Key Findings

1. **Dual Persistence System**: 
   - Both language and style settings use `useStorage()` from `@vueuse/core`
   - Automatically persisted to localStorage
   - No URL query parameters currently used

2. **No URL Query Parameters**: 
   - Settings are NOT synced with URL query parameters
   - Only localStorage is used for persistence
   - This means settings don't survive across different domains/browsers

3. **Store Architecture**: 
   - App store: Handles language and device settings
   - Settings store: Handles theme, layout, and UI toggles
   - Domain store: Handles domain-level overrides and locking
   - All use Pinia with persistedstate plugin

4. **Domain-Level Control**: 
   - Backend can lock language/theme per domain
   - Prevents users from changing settings on certain domains
   - Useful for branded/white-label deployments

5. **Settings Scope**:
   - Language: Global (affects all i18n)
   - Theme: Global (affects CSS variables and Element Plus)
   - Layout: Global (affects sidebar/header positioning)
   - Theme Color: Global (affects primary color)
   - Other toggles: Global (affects UI features)

6. **Initialization Order Matters**:
   - Language must load before app mounts (for i18n)
   - Domain info fetches after app mounts (for locking)
   - Theme applies after both are ready

## Implementation Strategy for URL Persistence

### Phase 1: Query Parameter Sync
- Read query params on app initialization
- Override localStorage values if query params present
- Update query params when settings change

### Phase 2: Router Integration
- Create composable `useSettingsSync()` to manage query param sync
- Hook into router navigation
- Update URL without page reload using `router.push()`

### Phase 3: Settings Components Update
- Modify Settings drawer to update URL
- Modify language switcher to update URL
- Ensure bidirectional sync

### Files to Modify
1. `src/main.ts` - Add query param reading on init
2. `src/router/index.ts` - Add query param handling
3. `src/store/modules/app.ts` - Add URL sync to changeLanguage()
4. `src/store/modules/settings.ts` - Add URL sync to change methods
5. Create `src/composables/useSettingsSync.ts` - New composable for sync logic
6. `src/layout/components/NavBar/components/HeaderActions.vue` - Update language switcher

### Query Parameter Format
```
?lang=en-US&theme=dark&layout=left&themeColor=%23409EFF
```

## Files Analyzed
- src/main.ts
- src/settings.ts
- src/composables/useTheme.ts
- src/lang/index.ts
- src/utils/i18n.ts
- src/store/modules/app.ts
- src/store/modules/settings.ts
- src/store/index.ts
- src/router/index.ts
- src/enums/ThemeEnum.ts
- src/enums/LanguageEnum.ts
- src/components/LangSelect/index.vue
- src/layout/components/Settings/index.vue
- src/layout/components/NavBar/index.vue
- src/layout/components/NavBar/components/HeaderActions.vue
- src/store/modules/domain.ts
- src/App.vue
