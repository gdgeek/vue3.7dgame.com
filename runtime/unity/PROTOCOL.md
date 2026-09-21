# 主站 Unity runner 协议与实际二进制证据

本目录是主 `web` 独立维护的运行器。独立插件已退役，以下旧制品核对记录保留作历史证据；当前 Unity 来源以制品锁文件为准。运行界面采用主站模态窗口内的 iframe；主站及本副本均不提供全屏控件或全屏调用，Unity 二进制由锁定的主站制品统一更新。一个 iframe 仅接收一次场景数据，每次重试创建新 iframe 和 session。

## 固定版本和消息边界

主站读取同域 `/webgl-preview/active.json`，加载 `/webgl-preview/releases/<runtimeReleaseId>/embed.html?sessionId=<random>`。runner 读取相邻 `runtime-release.json`，检查发布路径和 `build-manifest.json` 的 buildId 一致后绑定会话。所有项目自有消息包含顶层 `protocolVersion: 1`、`sessionId`、`runtimeReleaseId`、`buildId`。host 和 runner 都验证精确 source、origin 和这四个字段。没有通用 legacy 模式。

`unity-web-preview-state` 的顶层 `stage` 为 preparing、downloading_runtime、initializing_runtime、loading_scene、running 或 error。`progress` 为 `{kind:'indeterminate'}`、`{kind:'fraction',value,unit:'unity-loader-callback'}` 或 `{kind:'bytes',loaded,total?,unit:'decoded-response-bytes',artifact,cached}`。bytes 是已经消费的解压响应字节，total 来自清单的 responseSize，不能使用压缩文件 Content-Length 代替。单个 artifact 进度和 Unity loader 回调不是全场景完成百分比。锁定 loader 源码的 0–0.9 区间是 data/wasm 下载汇总，不能提前标初始化；达到 0.9 后初始化显示未知进度，postRun 的 1 回调才能显示这一阶段已完成。无可测场景资源总量时一直显示阶段状态。

`unity-web-preview-ready` 仅说明 createUnityInstance 成功，LoadSceneJson 可被调用。主站发送 `xrugc-load-scene-json`（payload 为当前已保存场景数据）。`unity-web-preview-scene-forwarded` 表示 SendMessage 调用返回，没有证明脚本和资源成功。`unity-web-preview-scene-visible` 的 `unity-scene-bounds-log` 证据仅来自 Unity bounds/renderers 日志，不转成 running。

主站发送 `unity-web-preview-dispose` 后，runner 取消属于此 iframe 的 fetch、计时器、消息监听，尝试 Quit，最多等待 2 秒后发送 `unity-web-preview-disposed`，quit 为 completed、timeout 或 failed。主站还有独立处置时间上限并最终销毁 iframe；旧 iframe 的消息 source 不能匹配新会话。

## 锁定 Unity 的原生 running 回调（2026-09-11 实物核对）

输入镜像：`hkccr.ccs.tencentyun.com/plugins/webgl-preview@sha256:1e03190d0b44ca204869461862859198a801edb3b4c1bf00e8ee5e8da1d9bfe5`。

Unity buildId：`sha256:7bee87bbf1c044802841b46489638cb5069eac5b51fb0637714a3b826b092f33`。

从该镜像提取并按原清单校验的 framework 解压后包含以下实际函数（本任务没有改写二进制）：

```js
function _XrugcWebPreviewPostMessage(typePtr,messagePtr){
  var type=UTF8ToString(typePtr);
  var message=UTF8ToString(messagePtr);
  if(window.parent&&window.parent!==window){
    window.parent.postMessage({type:type,message:message},"*")
  }
}
```

其 WASM import 将 `ne` 指向 `_XrugcWebPreviewPostMessage`。解压 data 的全局元数据包含 `unity-web-preview-scene-running`、`[WebPreview] Scene is running`、`WebPreviewBootstrap`、`XrugcWebPreviewPostMessage`、`LoadSceneJson`。因此原 embed.html 找不到该 sender 不代表运行器不存在 running 回调；单查 wasm 字符串也不完整。

这个原生事件直接发给主站，没有 session envelope。主站只为**当前 `scripts/unity/artifact-lock.json` 锁定的 buildId** 的 `unity-web-preview-scene-running` 做窄适配：精确当前 iframe source + 同域 origin + 本会话 ready + 本会话 typed scene-forwarded；原始消息不得夹带任何不匹配/缺失混合的 identity 字段。其他无 envelope 消息全部拒绝。一个 iframe 不复用第二个场景，所以 source 是该固定会话的能力边界；迟到的旧 iframe 消息仍被拒绝。业务 running 证据标为 `{kind:'unity-scene-started-callback',sceneAccepted:true,runtimeStarted:true}`。它说明 Unity 发出了场景启动生命周期确认，不代表画面、每个资源、每段脚本或目标头显验收通过。

主站随后发送完整 envelope 的 `unity-web-preview-runtime-confirmed` 与该 evidence；runner 取消场景确认 watchdog 并发回 typed running state。场景 120 秒没有明确确认则发 `UNITY_SCENE_CONFIRMATION_TIMEOUT`。下载 45 秒没有任何响应字节则发 `UNITY_DOWNLOAD_STALLED`。这些超时只产生可取消的诊断错误，永不制造成功。Unity 初始化仍受有界 loader timeout 保护。

## 2026-09-21 更新

完整 Unity 构建 `9907129b55e5aca26c8b687fecb563f277e6ce24` 的 buildId 为 `sha256:02a9bed6561b6ff95a1701415108168c381367e7395743fce2a4e27943aa249f`，继续使用上述原生回调契约。真实浏览器已收到 `unity-scene-started-callback`，执行了 Lua 测试并显示 URP 材质物体。主站从锁文件读取受信 buildId，升级时不再保留上一制品的硬编码例外。此记录不代替线上业务场景验收。

## Service Worker 与历史资源别名

SW 仅注册于自己的 release scope，不控制主站根路径。localhost 也必须注册 SW，因为锁定二进制包含 `__xrugc_proxy__` 历史资源别名。worker 将 release 相对别名及由受控 iframe 发出的精确根 `/__xrugc_proxy__` 请求交给同一受限资源策略；根路径兼容不等于注册 root worker，也没有新增服务器通用代理。

资源目标仅允许既有三个 HTTPS 资源主机、默认 HTTPS 端口与数据/媒体扩展名；拒绝用户密码、导航、script/worker 等活动内容、重定向。只转发 Range/条件缓存头，明确 credentials:omit 和 no-referrer，不能把平台 Cookie 或 Authorization 转发给资源域。平台 API、登录以及主站其他路径不会经过此 worker 缓存。

缓存前缀为 `xrugc-main-unity-<releaseId>-`，与原插件和其他 release 隔离。新 release 使用新 SW scope，不调用 skipWaiting，不在后台争抢冷启动下载。同一 release 的缓存仅在完整构建验证后允许清理历史 build，并在有活动客户端时跳过。跨 release 缓存保留供回滚，遵守浏览器配额淘汰；没有自动删除原插件的 worker 或缓存。回滚恢复整个已验证主站镜像和 release 指针，不回源旧插件域名。

## 验证边界

`node --test runtime/unity/tests/*.test.cjs` 覆盖身份拒绝、一次场景、迟到消息、无穷 Quit 上限、未知总量、流取消、增量 SHA-256、缓存损坏/中断/复用、资源白名单、凭据边界、Range 和版本隔离。这些测试不代表真实 Unity 画面或原生 WebMCP 验收完成。实际镜像、浏览器和专用场景记录见主任务验收文档。
