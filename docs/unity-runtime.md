# 主站内置 Unity 场景运行

场景编辑页和场景脚本页的“运行场景”使用主站镜像内的 Unity 运行器。运行当前已保存的数据，不会自动保存、发布或创建快照。独立 WebGL Preview 插件已于 2026-09-21 按用户要求退役，主站运行不读取旧插件配置地址。

## 使用与状态

点击“运行场景”后，沿用主站原有模态窗口和 iframe；加载反馈由 iframe 内的运行器显示，外层不重复展示进度、耗时或构建信息。流程依次经过准备数据、下载 Unity 文件、初始化 Unity、加载场景和运行状态。首次需要下载约 145 MB 压缩制品。下载数字按浏览器解压后的响应字节统计，和网络传输的压缩大小不同；缓存命中单独标记。Unity 初始化采用引擎回调；没有完整资源计数时显示阶段状态，不显示按时间增长的百分比。

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

加上 `?resourceFailure=1` 可检查真实失败链路：场景运行后，从受控 iframe 请求一个固定的不存在音频，确认显示 HTTP 404 资源诊断并释放运行器。点击重试会建立新会话；本页每次加载只注入一次失败请求。

## 2026-09-21 Unity 制品升级

当前制品由 `xrugc/iOS` 的 `feature/webgl-preview` 提交 `4b791a9019e97f2a594a2daddcb73c093c877e97` 完整构建，Foundation 子模块为 `5b52edb23014f479dc95968a11409243cb3a6c5f`，Unity 6000.4.6f1、glTFast 6.18.0、URP 17.4.0。制品镜像位于现有 `gdgeek/vue3` 仓库，仅作为主站构建输入，不运行独立插件服务。

构建保留托管异常处理和运行期 glTF Shader 变体，WebGL 启动场景包含桌面平台设置；没有 AR 图像库时跳过目标初始化。锁文件记录四个文件的实际哈希、大小与 Unity 源码版本。主站原生运行回调适配跟随锁定 buildId，仍严格校验当前 iframe、origin 和会话状态。

本轮修复在通用 Tooltip 字体无法覆盖内容时使用运行期中文字体兜底，并只在内容、字体或布局发生变化时更新文字网格。通用 Text 使用同一世界空间 Canvas 内的文字与背景顺序，保留原有文字尺寸和无背景行为；同时修复桌面点击交互。当前 buildId 为 `sha256:f87c87f9a33799d61dda6dac165aff09887914699d952947b00efeb5c660c689`，压缩制品总计 145,163,737 字节。

上一制品的本地真实浏览器已验证场景启动确认、Lua 创建物体、URP 材质画面及关闭。测试页显式使用 URP Lit；`CreatePrimitive` 默认 Standard 材质不适用于当前渲染管线。这些历史结果不代替本轮中文文字、提示和点击功能的线上开发环境验收，也不代表课程 2411、头显或生产发布验收。当前构建成功；构建中的 15 条 TourismHand 空引用与此前构建基线的类型、栈及次数一致，没有新增构建错误类别。工程中既有自定义 ShaderGraph 的缺失子图及缺失组件警告仍需单独处理。

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

2026-09-14 本次修复发布前，已将 GitHub Actions 仓库变量 `UNITY_PREVIOUS_IMAGE` 设置为 `hkccr.ccs.tencentyun.com/gdgeek/vue3@sha256:ad2d96747787b6fced0a00986805b4777e3568be30744936e5d1e113d1e504e2`。该不可变镜像经核验是上一版 `publish` / `latest`，其 active release 为 `c2816fc3523ab85d07097cac`。后续升级仍须在新 CI 触发前核对并更新此变量，最终镜像须同时验证新 active release 和继承的上一版 release。

2026-09-21 本轮中文文字与交互修复使用上一完整主站镜像 `hkccr.ccs.tencentyun.com/gdgeek/vue3@sha256:43db003cbbf69688a85a44d94ca3daee8ebe8483f11c2ab1734ba2e4006fe7d1` 作为 `UNITY_PREVIOUS_IMAGE`，保留 active release `7592710e42a95e6dd5ca85cc`。该值用于 Dockerfile、CI 默认值及 Actions 仓库变量；制品镜像不能代替这一完整主站回滚基线。

## SW 与资源边界

每个 release 的 SW 只注册在自己的目录，不控制主站根路径、登录或业务 API，也不强制升级正在运行的旧 worker。缓存名称隔离旧插件和不同 release；清理旧版本须确认没有使用该版本的客户端，不能无条件清空全站缓存。

Unity 固定制品中的 `__xrugc_proxy__` 历史路径由当前 iframe 的 SW 做受限兼容：仅允许既有 HTTPS 资源域名和资源类型，拒绝重定向和任意 URL 代理，不向资源域名转发主站 Cookie 或 Authorization。Nginx 不提供开放资源代理。

当前资源来源限于 HTTPS 的 `data.7dgame.com`、`7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com` 和 `mrpp-1257979353.cos.ap-chengdu.myqcloud.com`。已支持 CDN 的签名查询保持原样；既有旧 COS 地址仍按既有规则转到 CDN。`localhost`、独立 API origin、本地存储相对资源及其他来源会在准备阶段返回 `SCENE_ASSET_ORIGIN_DENIED`，不会先下载 Unity 后才因 CSP 失败。主站不会为这些来源新增通用代理，也不会自动转发登录凭据。普通 API 请求和其他消费者的 URL 规则不受该运行器约束影响。

### 资源读取失败与 CORS

Service Worker 仍通过浏览器跨域读取场景资源；历史 `__xrugc_proxy__` 地址不绕过 CORS。源站返回 HTTP 200 也不代表浏览器允许读取。不要用 `no-cors`、空的成功响应或随机查询参数掩盖失败。

前台资源失败通过当前受控 iframe 的版本与会话协议报告，主站停止并释放运行器，保留可重试的错误状态：

| 错误码 | 含义 |
| --- | --- |
| `SCENE_RESOURCE_FETCH_FAILED` | 网络、CORS、重定向拒绝或响应流中断；浏览器无法可靠区分这些原因 |
| `SCENE_RESOURCE_HTTP_ERROR` | 资源服务器返回错误 HTTP 状态 |
| `SCENE_RESOURCE_EMPTY` | 普通成功响应实际没有数据 |

失败界面的“资源诊断”和 WebMCP `failure.resource` 只包含校验后的资源来源、路径、类型、原因与可获得的 HTTP 状态，不保存签名查询串或原始异常文本。用户取消和可选后台预热失败不报告致命场景错误；Range、304 和 opaque 媒体保留原有处理边界。此防护不能代替 Unity 源工程对下载失败、空 buffer 和音频解码结果的检查。

CDN 由 COS 决定跨域头时，须透传请求 Origin 和源站 CORS 响应，并让 CDN 尊重 `Vary: Origin`。仅返回 Vary 头而未启用 CDN 对应功能，仍可能混用无 Origin 与带 Origin 的缓存。若改由 CDN 统一设置跨域头，使用覆盖设置，避免追加出重复的 Allow-Origin；保留原有资源授权范围。

2026-09-14 已在 EdgeOne 站点 `7dgame.com` 的现有“网站加速-data.7dgame.com”规则中启用 **Vary 特性**。规则仍仅匹配 `data.7dgame.com`，保留原有 30 天节点缓存、完整查询参数和图片浏览器缓存设置，未变更 COS 权限或上传方法。14:31:21 提交的故障音频 URL 缓存刷新已在控制台确认成功。

复发时先核对这条规则，再按实际失败 URL 刷新缓存。验收应使用原始地址，依次覆盖无 Origin 请求、业务 Origin 的首次 GET 与再次 HIT、其他业务 Origin、Range 206，以及条件请求触发的 OPTIONS。2026-09-14 14:32 的音频抽测已通过这些响应头检查。命令行检查不能代替浏览器场景的加载、开始探索、音频与退出验收；权限错误和 Unity 独立错误应分别记录。

本次本地 Chrome 实测原始音频两次 GET 均为 `200 / cors / 512012 bytes`，Range 为 `206 / cors / 16 bytes`，Web Audio 成功解码约 10.67 秒单声道音频。修复版真实 Unity 运行器完成 Lua 执行及退出（`cleanup: disposed`）；实际 SW 音频 404 请求显示正确资源诊断。线上场景 2325 在此次 Chrome 登录账号下返回 API 403，完整业务场景复测仍须使用有访问权限的账号，不能将局部验证写成场景全部恢复。

参考：[EdgeOne CORS 配置](https://edgeone.ai/document/71623)、[COS 跨域配置](https://cloud.tencent.com/document/product/436/13318)。

## 原生 WebMCP

已有 `xrugc_start_scene_runtime_preview`、`xrugc_get_scene_runtime_preview_status`、`xrugc_stop_scene_runtime_preview` 使用和按钮一致的控制器。兼容旧 `phase` 字段，同时返回细分 `stage`、`progress`、`failure`、`sessionId`、`runtimeReleaseId`、`buildId`、`evidence` 和清理结果。

工具调用完成不等于实际运行完成。读取状态后还要核对画面与交互；发布调用若超时，先核对快照回执和服务器记录，不能盲目重复发布。

## 独立插件退役

独立 `plugins/webgl-preview` 已从超级项目移除并在本地归档，不再更新或发布。主站配置加载会过滤 API 与本地配置中的遗留 `webgl-preview` 插件记录，避免旧菜单和插件路由重新注册。场景运行统一使用本目录的主站内置运行器；同域 `/webgl-preview/` 是其静态资源路径，继续保留。

此代码更新不代表历史远程容器或域名已下线，实际部署状态单独记录。

源码来源与许可证边界见 [来源记录](../runtime/unity/SOURCES.md)，原生二进制协议和证据边界见 [协议记录](../runtime/unity/PROTOCOL.md)。
