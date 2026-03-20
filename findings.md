# TTS + AI Rodin 移除 — 调研结果

## AI Rodin 相关文件
| 文件 | 类型 | 说明 |
|------|------|------|
| `src/api/v1/ai-rodin.ts` | API 模块 | 直接使用 VITE_APP_AI_API 的 4 个函数 + 3 个 REST 函数 |
| `src/types/ai-rodin.ts` | 类型定义 | AiRodinQuality, AiRodinQuery, AiRodinItem |
| `src/components/MrPP/AIProcess.vue` | 组件 | 无其他组件引用它 |
| `src/components/MrPP/AIUpload.vue` | 组件 | 无其他组件引用它 |
| `src/environment.ts` | 配置 | `ai` 属性，无代码引用 environment.ai |
| `test/unit/api/ai-rodin.spec.ts` | 测试 | |
| `test/unit/api/v1/ai-rodin.spec.ts` | 测试 | |
| `test/unit/types/ai-rodin.spec.ts` | 测试 | |
| `test/unit/api/vp-wechat-tools.spec.ts` | 测试 | 包含 ai-rodin 的 schedule 和 HTTP 测试 |
| `scripts/fix_catch_blocks.py` | 脚本 | 引用了 AIProcess/AIUpload |
| `docs/AI_FEATURES.md` | 文档 | AI Rodin 和 TTS 文档 |

## TTS 相关文件
| 文件 | 类型 | 说明 |
|------|------|------|
| `src/views/audio/tts.vue` | 页面 | 未在路由注册，死代码 |
| `src/views/audio/composables/useTTS.ts` | composable | 唯一使用 environment.tts_api 的地方 |
| `src/views/audio/composables/useLanguageAnalysis.ts` | composable | 被 tts.vue 使用 |
| `src/views/audio/composables/useVoiceSelection.ts` | composable | 被 tts.vue 使用 |
| `src/views/audio/components/LanguageAnalysis.vue` | 组件 | TTS 子组件 |
| `src/views/audio/components/TTSParams.vue` | 组件 | TTS 子组件 |
| `src/views/audio/components/VoiceSelector.vue` | 组件 | TTS 子组件 |
| `src/views/audio/components/VoiceSelector.stories.ts` | storybook | |
| `src/environment.ts` | 配置 | `tts_api` 属性 |
| `test/unit/composables/audio/useTTS.spec.ts` | 测试 | |
| `test/unit/composables/audio/useLanguageAnalysis.spec.ts` | 测试 | |
| `test/unit/composables/audio/useVoiceSelection.spec.ts` | 测试 | |
| `src/views/audio/composables/__tests__/useTTS.spec.ts` | 测试 | |
| `src/views/audio/composables/__tests__/useLanguageAnalysis.spec.ts` | 测试 | |

## Env 文件
- `.env.development` — VITE_TTS_API_URL
- `.env.staging` — VITE_APP_AI_API, VITE_TTS_API_URL
- `.env.production` — VITE_APP_AI_API, VITE_TTS_API_URL
- `docker-compose.dev.yml` — VITE_APP_AI_API

## 保留
- `src/views/audio/index.vue` — 音频管理列表页（路由中注册）
- `src/views/audio/view.vue` — 音频处理页（路由中注册）
