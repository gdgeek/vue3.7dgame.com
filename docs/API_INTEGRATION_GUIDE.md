# 前端白牌 JSON 接入指南

前端镜像提供一个无需认证、支持跨域的稳定白牌入口：

```http
GET https://{前端域名}/white-label/
Accept: application/json
```

例如 `https://d.xiading.cc/white-label/` 会按照请求 Host 匹配
`xiading.cc`，并直接返回该站点的配置对象。响应不是 API envelope，外层没有
`success`、`data` 或 `schemaVersion`。

## 标准格式

字段使用下面的固定排列，方便人工阅读、代码审查和跨端接入：

```json
{
  "name": "example.com",
  "homepage": "https://example.com/",
  "default_config": {
    "lang": "zh-CN",
    "style": 1,
    "icon": "/config/domains/example-logo.webp",
    "blog": ""
  },
  "configs": {
    "zh-CN": {
      "title": "示例 AR 创作平台",
      "description": "站点描述",
      "keywords": "AR, XR",
      "author": "示例科技有限公司",
      "links": [
        {
          "name": "示例科技有限公司",
          "url": "https://example.com/"
        }
      ]
    }
  }
}
```

JSON 对象的键顺序不影响解析，但仓库会校验上述标准排列，确保开发环境与生产
环境返回一致、不同域名的配置易于比较。

## 字段约束

### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 配置键，必须与 JSON 文件名一致；使用小写域名，兜底配置使用 `default` |
| `homepage` | string | 否 | 未登录公开首页需要跳转到的站点地址 |
| `default_config` | object | 是 | 与语言无关的默认偏好和品牌资源 |
| `configs` | object | 是 | 按语言代码索引的站点文案；必须包含有效默认语言对应的完整配置 |

### `default_config`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `lang` | string | 否 | 首次访问的默认语言偏好；省略时为 `zh-CN`，不覆盖用户已经保存的有效选择 |
| `style` | number | 否 | 首次访问的默认主题序号，从 `1` 开始，不覆盖用户已经保存的有效选择 |
| `icon` | string | 否 | Favicon 路径或 URL |
| `blog` | string | 否 | WordPress 博客地址；空字符串表示不使用域名级覆盖，开发环境回落到 `VITE_APP_DOC_API`，生产环境回落到 `/api-doc` |

当前支持的语言代码为 `zh-CN`、`zh-TW`、`en-US`、`ja-JP` 和
`th-TH`。当前主题序号为：`1` modern-blue、`2` deep-space、`3`
cyber-tech、`4` edu-friendly、`5` neo-brutalism、`6` minimal-pure。

`configs` 至少包含一套语言配置，并且必须包含有效默认语言：即
`default_config.lang` 指定的语言，未指定时则为 `zh-CN`。

### `configs.{语言代码}`

只要声明了一种语言，该语言对象的字段就必须完整：

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 页面标题 |
| `description` | string | 页面描述和 SEO description |
| `keywords` | string | SEO keywords |
| `author` | string | 品牌或运营主体 |
| `links` | array | 页脚链接；允许空数组，每项必须包含 `name` 和 `url` |

仓库内最小配置为：

```json
{
  "name": "example.com",
  "default_config": {
    "blog": ""
  },
  "configs": {
    "zh-CN": {
      "title": "",
      "description": "",
      "keywords": "",
      "author": "",
      "links": []
    }
  }
}
```

## 域名与语言回退

`/white-label/` 根据请求 Host 选择配置：

1. 完整域名；
2. 从左向右逐级查找父域名；
3. `default.json`。

例如 `d.xiading.cc` 会先查找 `d.xiading.cc`，再匹配
`xiading.cc`。这个接口始终返回一份完整的原始配置，不额外返回“实际匹配域名”
等元数据。

主 Web 内部读取同一批配置。语言内容依次回退为：当前域名请求语言、当前域名
`zh-CN`、`default` 请求语言、`default` 的 `zh-CN`。

## 调用示例

```javascript
const response = await fetch("https://d.xiading.cc/white-label/", {
  headers: { Accept: "application/json" },
  cache: "no-store"
});

if (!response.ok) {
  throw new Error(`White-label request failed: ${response.status}`);
}

const whiteLabel = await response.json();
const defaultLanguage = whiteLabel.default_config.lang ?? "zh-CN";
console.log(whiteLabel.name, whiteLabel.configs[defaultLanguage].title);
```

响应包含 `Access-Control-Allow-Origin: *` 和
`X-Content-Type-Options: nosniff`，并明确禁止缓存，调用方应在每次启动时读取最新
配置；网络失败时可自行降级到本地保存的上一份有效配置。

## 维护规则

- 配置文件位于 `public/config/domains/{name}.json`。
- 顶层只允许 `name`、`homepage`、`default_config`、`configs`。
- 公开格式中的 `blog` 字段仍为可选；当前仓库内的所有域名必须显式设置
  `"blog": ""`，统一使用部署级文档 API。
- 已移除的旧字段不再兼容：顶层 `description`、`is_active`、
  `fallback_domain`，`default_config.homepage`，以及语言对象内的 `domain`、
  `homepage`。
- 构建会拒绝未知字段、未支持的语言、空 `configs`、缺少默认语言配置、缺少必填
  文案、文件名与 `name` 不一致、URL 内嵌凭据和疑似密钥内容。
- 修改配置后至少运行：

```bash
pnpm test:run -- test/unit/build/domain-manifest.spec.ts \
  test/unit/build/domain-manifest-vite.spec.ts \
  test/unit/api/domain-static-config.spec.ts \
  test/unit/nginx/nginx-config.spec.ts
```
