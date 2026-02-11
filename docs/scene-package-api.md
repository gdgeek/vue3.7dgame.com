# 场景包 API 接口文档

> 供前端重构使用。Base URL: `/v1/scene-package`

所有接口需要 JWT Bearer Token 认证。

---

## 接口总览

| 方法 | 路径 | 说明 | Content-Type |
|------|------|------|-------------|
| GET | `/verses/{id}/export` | JSON 导出 | application/json |
| GET | `/verses/{id}/export-zip` | ZIP 导出 | application/zip |
| POST | `/verses/import` | JSON 导入 | application/json |
| POST | `/verses/import-zip` | ZIP 导入 | multipart/form-data |

---

## 1. JSON 导出

```
GET /v1/scene-package/verses/{id}/export
Authorization: Bearer <token>
```

返回完整的 Scene_Data_Tree JSON 对象。

### 响应结构

```jsonc
{
  "verse": {
    "id": 626,
    "author_id": 3,
    "name": "抓糖果",
    "description": "测试",
    "info": null,
    "data": { /* verse JSON 数据 */ },
    "uuid": "5117d691-e2f3-4449-81bc-00523ce23131",
    "version": 1,                    // 系统版本号，导入时会校验
    "verseRelease": null,
    "image": {                       // 封面图，可能为 null
      "id": 1364,
      "md5": "...",
      "type": "image/png",
      "url": "https://...",
      "filename": "screenshot.png",
      "size": 12345,
      "key": "..."
    },
    "verseCode": {                   // 代码，可能为 null
      "blockly": "...",
      "lua": "...",
      "js": "..."
    }
  },
  "metas": [
    {
      "id": 963,
      "author_id": 3,
      "uuid": "9d618b7d-...",
      "title": "My Candy",
      "data": { /* meta JSON 数据 */ },
      "events": { /* 事件 JSON 数据 */ },
      "image_id": 1364,
      "image": { /* 同上 File 结构，可能为 null */ },
      "prefab": 1,
      "resources": [                 // 该 meta 关联的 resources
        { /* Resource 结构，见下方 */ }
      ],
      "editable": true,
      "viewable": true,
      "metaCode": {                  // 可能为 null
        "blockly": "...",
        "lua": "..."
      }
    }
  ],
  "resources": [
    {
      "id": 830,
      "uuid": "cf5d409e-...",
      "name": "star.glb",
      "type": "polygen",
      "info": "{\"size\":{...},\"center\":{...}}",
      "created_at": "2024-05-27 02:16:55",
      "file": {
        "id": 100,
        "md5": "...",
        "type": "model/gltf-binary",
        "url": "https://...",
        "filename": "star.glb",
        "size": 54321,
        "key": "..."
      }
    }
  ],
  "metaResourceLinks": [
    {
      "meta_id": 963,
      "resource_id": 830
    }
  ]
}
```

### 错误码

| HTTP | 说明 |
|------|------|
| 401 | 未认证 |
| 403 | 无权访问该场景 |
| 404 | 场景不存在 |

---

## 2. ZIP 导出

```
GET /v1/scene-package/verses/{id}/export-zip
Authorization: Bearer <token>
```

返回 ZIP 文件（`Content-Type: application/zip`），内含 `scene.json`，结构与 JSON 导出完全一致。

文件名格式：`scene_{id}.zip`

错误码同 JSON 导出。

---

## 3. JSON 导入

```
POST /v1/scene-package/verses/import
Authorization: Bearer <token>
Content-Type: application/json
```

### 请求体

```jsonc
{
  "verse": {
    "name": "我的场景",           // 必填
    "data": { /* ... */ },        // 必填，场景 JSON 数据
    "uuid": "original-uuid",      // 必填，原始 UUID
    "version": 1,                 // 必填，必须与当前系统版本一致
    "description": "描述",        // 可选
    "verseCode": {                // 可选
      "blockly": "...",
      "lua": "...",
      "js": "..."
    }
  },
  "metas": [                      // 可选
    {
      "title": "实体名",          // 必填
      "uuid": "meta-uuid",        // 必填
      "data": { /* ... */ },      // 可选
      "events": { /* ... */ },    // 可选
      "prefab": 0,                // 可选，默认 0
      "resourceFileIds": [100],   // 可选，关联的 file_id 列表
      "metaCode": {               // 可选
        "blockly": "...",
        "lua": "..."
      }
    }
  ],
  "resourceFileMappings": [       // 可选
    {
      "originalUuid": "res-uuid", // 必填，原始 resource UUID
      "fileId": 100,              // 必填，已上传的 File ID
      "name": "star.glb",         // 必填
      "type": "polygen",          // 必填
      "info": "{...}"             // 必填，resource info JSON 字符串
    }
  ]
}
```

### 成功响应 (200)

```json
{
  "verseId": 700,
  "metaIdMap": {
    "original-meta-uuid": 1001
  },
  "resourceIdMap": {
    "original-res-uuid": 2001
  }
}
```

### 错误码

| HTTP | 说明 |
|------|------|
| 400 | 缺少必填字段 / 版本不匹配 |
| 401 | 未认证 |
| 422 | fileId 引用的文件不存在 |
| 500 | 导入事务失败 |

### 版本校验

导入时 `verse.version` 必须等于当前系统版本号（当前为 `1`）。不匹配时返回：

```json
{
  "message": "Version mismatch: package version is 0, but current system version is 1"
}
```

---

## 4. ZIP 导入

```
POST /v1/scene-package/verses/import-zip
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

上传 ZIP 文件，ZIP 内必须包含 `scene.json`，其结构与 JSON 导入的请求体一致。

### 表单字段

| 字段 | 类型 | 说明 |
|------|------|------|
| file | File | ZIP 文件 |

成功响应和错误码同 JSON 导入。额外错误：

| HTTP | 说明 |
|------|------|
| 400 | 无效 ZIP / ZIP 中无 scene.json / scene.json 格式错误 |

---

## 导入流程说明

1. 前端先通过 `/v1/files` 上传资源文件，获取 `fileId`
2. 构造导入数据，`resourceFileMappings` 中用 `fileId` 引用已上传的文件
3. 调用导入接口
4. 后端在事务中创建所有实体，自动生成新 UUID，执行 ID 重映射
5. 返回新旧 ID 映射关系

---

## 与旧接口的变化

| 旧接口 | 新接口 | 变化 |
|--------|--------|------|
| `GET /verses/{id}/export` + Accept header 切换格式 | `GET /verses/{id}/export` (JSON) | 只返回 JSON，不再通过 Accept 切换 |
| 同上 | `GET /verses/{id}/export-zip` (ZIP) | 新增独立 ZIP 导出接口 |
| `POST /verses/import` + Content-Type 切换格式 | `POST /verses/import` (JSON) | 只接受 JSON body |
| 同上 | `POST /verses/import-zip` (ZIP) | 新增独立 ZIP 导入接口 |
| verse 中无 version 字段 | verse 中新增 `version` 字段 | 导出包含，导入时必填且校验 |
