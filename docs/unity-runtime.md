# 主站内置 Unity 场景运行

场景编辑页和场景脚本页的“运行场景”使用主站镜像内的 Unity 运行器。运行当前已保存的数据，不会自动保存、发布或创建快照。原 WebGL Preview 插件继续独立存在，主站运行不再读取其配置地址。

## 使用与状态

点击“运行场景”后，沿用主站原有模态窗口和 iframe；加载反馈由 iframe 内的运行器显示，外层不重复展示进度、耗时或构建信息。流程依次经过准备数据、下载 Unity 文件、初始化 Unity、加载场景和运行状态。首次需要下载约 199 MB 压缩制品。下载数字按浏览器解压后的响应字节统计，和网络传输的压缩大小不同；缓存命中单独标记。Unity 初始化采用引擎回调；没有完整资源计数时显示阶段状态，不显示按时间增长的百分比。

运行器固定在主站模态窗口的 iframe 中，不进入全屏，也不提供全屏按钮。关闭会停止运行并等待 Unity Quit 或有界超时，再销毁当前 iframe。运行失败时，主站显示简短错误和重试按钮；重试建立新会话。错误码、阶段、会话和构建标识继续保留在 WebMCP 结构化状态中，便于诊断。每个页面最多保留一个活动实例，切换场景或离开页面先清理当前实例。

`running` 表示收到了 Unity 的场景生命周期确认，不表示所有资源、脚本行为或头显效果都已验收。可见边界日志只是额外证据；空画面时应继续核对资源与实际行为。

## 本地准备

使用 Node 24 和 pnpm 9.15.0。以下命令都在独立的 web 仓库目录执行：

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm unity:acquire
corepack pnpm unity:prepare
corepack pnpm unity:verify
corepack pnpm dev
```

`unity:acquire` 使用 Docker 从 [制品锁](../scripts/unity/artifact-lock.json) 指定的不可变镜像 digest 提取四个 Unity 文件，检查压缩格式、大小和哈希。`.unity-artifacts/` 和 `.unity-runtime/` 是忽略的本地产物；不提交二进制，不复制 Git LFS 指针，不从旧插件域名偷偷回源。

本地未准备制品时，`/webgl-preview/active.json` 明确返回缺失错误。Vite 和最终 Nginx 都为运行器提供精确的静态路由，缺失脚本与二进制返回真实 404，不能落到主站 SPA。

不需要后端账号的本地运行器检查页是 `/tests/manual/unity-runtime.html`，仅在 Vite 开发服务中使用。它挂载实际主站控制器与实际 Unity，通过自带 Lua 创建并变换一个立方体；不能代替线上原生 WebMCP、业务场景或头显验收。此页面不会进入主站生产 bundle。

## 版本与发布

主站镜像包含前端、runner、SW、清单及锁定 Unity 文件。`/webgl-preview/active.json` 以 `no-store` 返回当前版本；每个会话固定 `/webgl-preview/releases/<runtimeReleaseId>/embed.html`。release identity 覆盖 runner/SW 内容、Unity buildId 和制品哈希。大文件使用不可变路径，HTML、SW 和元数据重新验证。

主站独立 CI 使用自身仓库完成构建，不依赖超级项目的插件目录。最终镜像验证命令：

```bash
corepack pnpm unity:test
corepack pnpm run test:run
corepack pnpm run type-check
corepack pnpm run build
docker build --platform linux/amd64 -t xrugc-main-unity:local .
corepack pnpm unity:smoke xrugc-main-unity:local
```

镜像检查覆盖实际文件清单、SHA-256、尺寸、gzip、组合兼容、HTTP MIME、Range、缓存和真实 404。HTTP 检查不是浏览器运行证明，浏览器和原生业务验收应分别记录。

发布遵循 develop 测试及镜像门禁通过后，main / publish 一起推进并发检查的仓库约定。升级构建用 `UNITY_PREVIOUS_IMAGE` 锁定上一主站镜像 digest，仅继承其 active 指向的运行器 release，使上一版会话仍可读取原版本文件；具体命令见 [制品工具说明](../scripts/unity/README.md)。首发默认不继承旧插件静态入口。回滚恢复已验证的完整主站镜像及对应配置，不静默切回旧插件地址。实际发布结果以验收记录为准。

## SW 与资源边界

每个 release 的 SW 只注册在自己的目录，不控制主站根路径、登录或业务 API，也不强制升级正在运行的旧 worker。缓存名称隔离旧插件和不同 release；清理旧版本须确认没有使用该版本的客户端，不能无条件清空全站缓存。

Unity 固定制品中的 `__xrugc_proxy__` 历史路径由当前 iframe 的 SW 做受限兼容：仅允许既有 HTTPS 资源域名和资源类型，拒绝重定向和任意 URL 代理，不向资源域名转发主站 Cookie 或 Authorization。Nginx 不提供开放资源代理。

当前资源来源限于 HTTPS 的 `data.7dgame.com`、`7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com` 和 `mrpp-1257979353.cos.ap-chengdu.myqcloud.com`。已支持 CDN 的签名查询保持原样；既有旧 COS 地址仍按既有规则转到 CDN。`localhost`、独立 API origin、本地存储相对资源及其他来源会在准备阶段返回 `SCENE_ASSET_ORIGIN_DENIED`，不会先下载 Unity 后才因 CSP 失败。主站不会为这些来源新增通用代理，也不会自动转发登录凭据。普通 API 请求和其他消费者的 URL 规则不受该运行器约束影响。

## 原生 WebMCP

已有 `xrugc_start_scene_runtime_preview`、`xrugc_get_scene_runtime_preview_status`、`xrugc_stop_scene_runtime_preview` 使用和按钮一致的控制器。兼容旧 `phase` 字段，同时返回细分 `stage`、`progress`、`failure`、`sessionId`、`runtimeReleaseId`、`buildId`、`evidence` 和清理结果。

工具调用完成不等于实际运行完成。读取状态后还要核对画面与交互；发布调用若超时，先核对快照回执和服务器记录，不能盲目重复发布。

## 用户手动关闭旧插件

只有在新的主站场景运行、原生工具、真实场景资源与行为都验证后，再由用户按自己的部署方式关闭旧插件。关闭前保留旧服务和主站前一镜像的恢复材料，并检查是否还有用户使用旧插件链接。

本次主站迁移不执行插件停用、注册或菜单删除、域名修改、容器停止、子模块删除和仓库归档。关闭旧插件不是主站构建或启动的前提。

源码来源与许可证边界见 [来源记录](../runtime/unity/SOURCES.md)，原生二进制协议和证据边界见 [协议记录](../runtime/unity/PROTOCOL.md)。
