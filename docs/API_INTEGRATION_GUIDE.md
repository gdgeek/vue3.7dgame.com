# 外部系统调用指南

本服务提供了一个公开的 HTTP GET 接口，允许外部系统通过域名获取配置信息。

## 接口地址

`GET /api/query`

## 请求参数

| 参数名   | 类型   | 必填 | 说明                    | 示例             |
| :------- | :----- | :--- | :---------------------- | :--------------- |
| `domain` | string | 是   | 需要查询的域名          | `example.com`    |
| `lang`   | string | 否   | 语言代码 (默认 `zh-CN`) | `en-US`, `ja-JP` |

## 调用示例

### cURL

```bash
curl "http://localhost:5000/api/query?domain=example.com&lang=en-US"
```

### JavaScript (Fetch)

```javascript
const getDomainConfig = async (domain, lang = "zh-CN") => {
  const url = new URL("http://localhost:5000/api/query");
  url.searchParams.append("domain", domain);
  url.searchParams.append("lang", lang);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to fetch config:", error);
    return null;
  }
};

// 使用示例
getDomainConfig("example.com", "en-US").then((data) => console.log(data));
```

## 响应格式

接口返回 JSON 格式数据：

```json
{
  "domain": "example.com", // 请求的域名
  "actual_domain": "example.com", // 实际返回配置的域名（可能发生回退）
  "language": "en-US", // 实际返回的语言
  "requested_language": "en-US", // 请求的语言
  "is_fallback": false, // 是否发生了语言回退
  "is_domain_fallback": false, // 是否发生了域名回退
  "data": {
    // 实际配置数据
    "title": "Example Website",
    "theme": "dark",
    "features": {
      "login": true
    }
  }
}
```

## 错误处理

- **400 Bad Request**: 缺少 `domain` 参数。
- **404 Not Found**: 域名不存在或未启用。

## 缓存机制

- 响应结果在服务端缓存（默认 1 小时）。
- 建议调用方也可以在本地进行短时间缓存。
