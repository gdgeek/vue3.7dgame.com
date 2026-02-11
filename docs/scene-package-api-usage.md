# 场景包导出/导入 API 使用文档

> 本文档为后端实际实现的最终版本，前端请以此为准。与之前前端提出的需求文档如有差异，以本文档为准。

## 基础信息

- Base URL: `/v1/scene-package`
- 认证方式: JWT Bearer Token（`Authorization: Bearer {token}`）
- 所有实体导入时均生成全新 ID 和 UUID，不会覆盖任何现有数据

---

## 1. 导出接口

### `GET /v1/scene-package/verses/{id}/export`

根据 `Accept` 请求头返回 JSON 或 ZIP 格式的完整场景数据。

### 1.1 JSON 格式导出

```http
GET /v1/scene-package/verses/626/export
Authorization: Bearer {token}
Accept: application/json
```

响应 `200 OK`：

```jsonc
{
  "verse": {
    "id": 626,
    "author_id": 1,
    "name": "抓糖果",
    "description": "场景描述",
    "info": null,
    "data": { /* Verse JSON 数据，原样返回 */ },
    "uuid": "verse-uuid-xxx",
    "verseRelease": null,
    "image": {
      "id": 10, "md5": "...", "type": "image/png",
      "url": "https://...", "filename": "...", "size": 1024, "key": "..."
    },
    "verseCode": {
      "blockly": "<xml>...</xml>",
      "lua": "-- lua code",
      "js": "// js code"
    }
  },
  "metas": [
    {
      "id": 101,
      "author_id": 1,
      "uuid": "meta-uuid-aaa",
      "title": "实体A",
      "data": { /* Meta JSON 数据 */ },
      "events": { "inputs": [], "outputs": [] },
      "image_id": null,
      "image": null,
      "prefab": 0,
      "resources": [],
      "editable": true,
      "viewable": true,
      "metaCode": {
        "blockly": "<xml>...</xml>",
        "lua": "-- lua code"
      }
    }
  ],
  "resources": [
    {
      "id": 201,
      "uuid": "res-uuid-111",
      "name": "模型A",
      "type": "polygen",
      "info": "{\"size\":{\"x\":1,\"y\":2,\"z\":1}}",
      "created_at": "2025-01-15T08:00:00Z",
      "file": {
        "id": 301, "md5": "abc123", "type": "model/gltf-binary",
        "url": "https://cos.example.com/store/model.glb",
        "filename": "model.glb", "size": 524288, "key": "model.glb"
      }
    }
  ],
  "metaResourceLinks": [
    { "meta_id": 101, "resource_id": 201 }
  ]
}
```

### 1.2 ZIP 格式导出

```http
GET /v1/scene-package/verses/626/export
Authorization: Bearer {token}
Accept: application/zip
```

响应 `200 OK`：
- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="scene_626.zip"`
- 响应体为 ZIP 二进制流，ZIP 内包含一个 `scene.json` 文件，内容与 JSON 格式导出完全一致

前端下载示例（axios）：

```javascript
const response = await axios.get(`/v1/scene-package/verses/${id}/export`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/zip'
  },
  responseType: 'blob'
});

// 从 Content-Disposition 获取文件名
const disposition = response.headers['content-disposition'];
const filename = disposition?.match(/filename="(.+)"/)?.[1] || `scene_${id}.zip`;

// 触发浏览器下载
const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.download = filename;
link.click();
window.URL.revokeObjectURL(url);
```

### 1.3 导出错误响应

| 状态码 | 说明 |
|--------|------|
| 401 | 未认证（JWT 无效或过期） |
| 403 | 无权访问该场景 |
| 404 | 场景不存在 |

---

## 2. 导入接口

### `POST /v1/scene-package/verses/import`

支持两种方式导入：JSON 请求体 或 ZIP 文件上传。

导入会创建全新的 verse、meta、resource 记录（新 ID、新 UUID），不会覆盖任何现有数据。资源文件（file）通过 fileId 引用已上传的文件，URL 保持不变。

### 2.1 JSON 模式导入

```http
POST /v1/scene-package/verses/import
Authorization: Bearer {token}
Content-Type: application/json
```

```jsonc
{
  "verse": {
    "name": "我的场景",           // 必填
    "data": "{ JSON 字符串 }",    // 必填，Verse 数据
    "uuid": "verse-uuid-xxx",     // 必填，原始 UUID（用于内部引用映射）
    "description": "场景描述",     // 可选
    "verseCode": {                 // 可选
      "blockly": "<xml>...</xml>",
      "lua": "-- code",
      "js": "// code"
    }
  },
  "metas": [                       // 可选，实体数组
    {
      "title": "实体A",            // 必填
      "uuid": "meta-uuid-aaa",     // 必填
      "data": "{ JSON 字符串 }",   // 可选
      "events": "{ JSON 字符串 }", // 可选
      "prefab": 0,                 // 可选，默认 0
      "metaCode": {                // 可选
        "blockly": "<xml>...</xml>",
        "lua": "-- code",
        "js": "// code"
      },
      "resourceFileIds": [501]     // 可选，该 Meta 关联的已上传文件 ID 列表
    }
  ],
  "resourceFileMappings": [        // 可选，资源文件映射
    {
      "originalUuid": "res-uuid-111",  // 必填
      "fileId": 501,                    // 必填，前端上传后获得的 file_id
      "name": "模型A",                 // 必填
      "type": "polygen",               // 必填
      "info": "{\"size\":{\"x\":1}}"   // 必填
    }
  ]
}
```

### 2.2 ZIP 模式导入

```http
POST /v1/scene-package/verses/import
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

表单字段：
- `file`: ZIP 文件（ZIP 内必须包含 `scene.json`，格式与 JSON 模式的请求体一致）

前端上传示例（axios）：

```javascript
const formData = new FormData();
formData.append('file', zipFile); // zipFile 为 File 对象

const response = await axios.post('/v1/scene-package/verses/import', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

### 2.3 导入响应

响应 `200 OK`：

```json
{
  "verseId": 642,
  "metaIdMap": {
    "meta-uuid-aaa": 1064
  },
  "resourceIdMap": {
    "res-uuid-111": 250
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| verseId | number | 新创建的场景 ID |
| metaIdMap | Record<string, number> | 原始 Meta UUID → 新 Meta ID |
| resourceIdMap | Record<string, number> | 原始 Resource UUID → 新 Resource ID |

### 2.4 导入错误响应

| 状态码 | 说明 |
|--------|------|
| 400 | 请求数据格式错误、必填字段缺失、无效 ZIP、ZIP 内无 scene.json |
| 401 | 未认证 |
| 422 | fileId 引用的文件不存在 |
| 500 | 服务端导入失败（事务已回滚） |

---

## 3. 导入前的资源上传流程

前端在调用导入接口之前，需要先上传资源文件获取 fileId：

```
1. POST /v1/upload/file    ← 上传文件二进制（FormData）
2. POST /v1/files          ← 创建文件记录，返回 file_id
```

拿到 file_id 后填入 `resourceFileMappings[].fileId` 和 `metas[].resourceFileIds[]`。

---

## 4. 后端导入处理逻辑（前端需了解）

1. 所有实体（verse、meta、resource）均生成新 ID 和新 UUID
2. verse.data 和 meta.data 中的 `meta_id`、`resource` 引用会自动重映射为新 ID
3. 整个导入在数据库事务中执行，任何步骤失败全部回滚
4. 导入的场景归属于当前 JWT token 对应的用户

---

## 5. 与前端需求文档的差异说明

以下为后端实际实现与前端之前提出的需求文档的差异，请前端以本文档为准：

1. 导出接口路径为 `/v1/scene-package/verses/{id}/export`（不是 `/v1/verses/{id}/export`）
2. 导入接口路径为 `/v1/scene-package/verses/import`（不是 `/v1/verses/import`）
3. ZIP 导出通过 `Accept: application/zip` 请求头触发，不是通过 query 参数
4. ZIP 导出文件名格式为 `scene_{id}.zip`（纯 ASCII，避免中文编码问题）
5. ZIP 导入使用 `multipart/form-data`，字段名为 `file`
6. 导出数据中 verse 不包含 `version`、`editable`、`viewable` 字段（这些是运行时属性）
7. 导入时 `verse.version` 不是必填字段
