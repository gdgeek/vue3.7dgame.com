# 外部系统调用指南

本服务提供两个公开的查询接口，无需认证，支持跨域。

Base URL: `https://your-domain.com/api`

---

## GET /api/query/language

查询语言配置，支持语言回退和域名回退。

**参数：**

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| domain | string | 是 | 域名 | `example.com` |
| lang | string | 否 | 语言代码，默认 `zh-CN` | `en-US` |

**回退逻辑（按优先级）：**
1. 当前域名 + 请求语言
2. 当前域名 + 默认语言 (zh-CN)
3. 回退域名 + 请求语言
4. 回退域名 + 默认语言

**响应 (200)：**
```json
{
  "domain": "example.com",
  "actual_domain": "example.com",
  "language": "en-US",
  "requested_language": "en-US",
  "is_fallback": false,
  "is_domain_fallback": false,
  "data": {
    "title": "Example Website",
    "theme": "dark"
  }
}
```

---

## GET /api/query/default

查询域名默认配置（语言无关），支持域名回退。

**参数：**

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| domain | string | 是 | 域名 | `example.com` |

**响应 (200)：**
```json
{
  "domain": "example.com",
  "actual_domain": "example.com",
  "language": "default",
  "requested_language": null,
  "is_fallback": false,
  "is_domain_fallback": false,
  "data": {
    "theme": "dark",
    "logo": "https://example.com/logo.png"
  }
}
```

---

## 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| domain | string | 请求的域名 |
| actual_domain | string | 实际返回配置的域名（回退时可能不同） |
| language | string | 实际返回的语言代码 |
| requested_language | string/null | 请求的语言代码 |
| is_fallback | boolean | 是否发生了语言回退 |
| is_domain_fallback | boolean | 是否发生了域名回退 |
| data | object | 配置数据 |

---

## 错误响应

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 缺少必需参数 `domain` |
| 404 | 域名不存在、已禁用或无配置 |

---

## 调用示例

### cURL

```bash
curl "https://your-domain.com/api/query/language?domain=example.com&lang=en-US"
curl "https://your-domain.com/api/query/default?domain=example.com"
```

### JavaScript

```javascript
const API_BASE = "https://your-domain.com/api";

const getLanguageConfig = async (domain, lang = "zh-CN") => {
  const res = await fetch(`${API_BASE}/query/language?domain=${domain}&lang=${lang}`);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
};

const getDefaultConfig = async (domain) => {
  const res = await fetch(`${API_BASE}/query/default?domain=${domain}`);
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
};

// 使用
getLanguageConfig("example.com", "en-US").then(console.log);
getDefaultConfig("example.com").then(console.log);
```

---

## 备注

- 支持跨域（CORS `*`）
- 服务端缓存默认 1 小时，建议调用方也做短时间本地缓存
- 支持的语言代码：`zh-CN`, `en-US`, `ja-JP`, `zh-TW`, `th-TH`
