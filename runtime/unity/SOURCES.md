# 来源与维护边界

2026-09-11 从独立仓库 `7dgame-com/webgl-preview`（超级项目路径 `plugins/webgl-preview`）提交 `f3fbe0dda98e6f9255339c0c880ff2015d021199` 只读复制，并在主 `web` 内独立维护：

- `public/embed.html`：Unity runner 模板和项目桥接。本副本替换进度、会话、清理与发布身份逻辑。
- `public/modules/embed-parent-protocol.js`：来源协议的主站严格会话版；本副本去掉通用旧协议模式。
- `public/modules/sw-build-cache.js`：增量 SHA-256 和有界缓存/共享下载协调实现。
- `public/sw.js`：资源白名单、历史别名、凭据/Range 边界和构建缓存。本副本改为 release scope 和独立缓存空间。
- `public/TemplateData/style.css`、favicon 和被模板实际引用的 Unity 图片：保留来源资源。
- `tests/service-worker-runtime.test.cjs`：源 `tests/service-worker-runtime.test.js`，适配 release scope，并扩展主站边界用例。
- `../../scripts/unity/build-manifest.cjs`：源 `scripts/build-manifest.js`，保留流式哈希/压缩校验，供主站独立打包使用。

`runtime-state.js`、`download-progress.js`、本目录协议测试和主站打包代码为本次主站实现。没有复制插件的 index 场景选择壳、plugin-runner.js、插件 manifest、运行时插件地址配置或菜单注册；该描述对应 2026-09-11 的初始迁移。2026-09-21 用户决定退役独立插件，超级项目已移除其 gitlink；上述来源和权利归属记录继续保留。

源提交未包含 LICENSE/COPYING 文件。本次同一产品仓库内的复制不赋予新的第三方再许可，保留原始权利归属；Unity 模板图片、loader 和二进制继续适用原有 Unity/项目授权。不要把主 web 中其他依赖的许可证自动套用在 Unity 制品上。

Unity loader/data/framework/wasm 均不是源码副本的一部分；它们只从锁定 OCI digest 作为构建输入提取，详情见 PROTOCOL.md 和 ../../scripts/unity/artifact-lock.json。仓库中的 LFS 指针不能作为发布制品。

2026-09-21 的当前 Unity 制品来自 `xrugc/iOS` 提交 `4b791a9019e97f2a594a2daddcb73c093c877e97`，Foundation 子模块为 `5b52edb23014f479dc95968a11409243cb3a6c5f`，buildId 为 `sha256:f87c87f9a33799d61dda6dac165aff09887914699d952947b00efeb5c660c689`。本次包含通用 Tooltip 中文字体兜底、Text 与背景在同一世界空间 Canvas 内排序，以及桌面点击交互修复。二进制位于 `gdgeek/vue3` 制品镜像；不从已退役插件的镜像提取新版运行器。
