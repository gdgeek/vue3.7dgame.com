# Debug: Image 未复制问题

## 问题描述

用户报告：复制实体后，image 没有被复制到新实体上。

## 可能的原因

### 1. image_id 为 null
原实体本身可能没有关联图片，所以 `image_id` 为 null。

**验证方法**：
在浏览器控制台查看原实体的数据：
```javascript
// 在复制前，打开浏览器控制台
// 查看原实体的 image_id
console.log('Original meta:', meta);
console.log('image_id:', meta.image_id);
```

### 2. 后端未返回 image 对象
后端在创建新实体后返回的数据中没有 expand image 对象。

**当前实现**：
```typescript
const response = await getMeta(id);  // ❌ 没有 expand 参数
const meta = response.data;

const newMeta = {
  title: newTitle,
  uuid: uuidv4(),
  image_id: meta.image_id,  // ✅ 传递了 image_id
  // ...
};

const createResponse = await postMeta(newMeta);  // 后端返回新实体
```

**问题**：
- `postMeta` 返回的新实体可能不包含 expand 的 image 对象
- 列表刷新时调用 `getMetas`，它默认有 `expand="image,author"`
- 但在复制操作完成到列表刷新之间，可能有延迟

### 3. 列表刷新时机问题
`refreshList()` 可能在后端完全处理完成之前就被调用了。

## 解决方案

### 方案 1：在 getMeta 时添加 expand 参数（推荐）

虽然这不会直接影响复制结果，但可以帮助调试：

```typescript
const response = await getMeta(id, { expand: 'image,author' });
```

### 方案 2：验证 image_id 是否正确传递

添加日志来验证：

```typescript
const copy = async (id: number, newTitle: string) => {
  copyLoadingMap.value.set(id, true);
  try {
    const response = await getMeta(id);
    const meta = response.data;

    console.log('Original meta image_id:', meta.image_id);  // 添加日志

    const newMeta = {
      title: newTitle,
      uuid: uuidv4(),
      image_id: meta.image_id,
      data: meta.data,
      info: meta.info,
      events: meta.events,
      prefab: meta.prefab,
    };

    console.log('New meta to create:', newMeta);  // 添加日志

    const createResponse = await postMeta(newMeta);
    const newMetaId = createResponse.data.id;

    console.log('Created meta:', createResponse.data);  // 添加日志
    console.log('Created meta image_id:', createResponse.data.image_id);  // 添加日志

    // ...
  }
};
```

### 方案 3：在复制后重新获取新实体（带 expand）

确保新实体包含完整的 image 信息：

```typescript
const copy = async (id: number, newTitle: string) => {
  copyLoadingMap.value.set(id, true);
  try {
    const response = await getMeta(id);
    const meta = response.data;

    const newMeta = {
      title: newTitle,
      uuid: uuidv4(),
      image_id: meta.image_id,
      data: meta.data,
      info: meta.info,
      events: meta.events,
      prefab: meta.prefab,
    };

    const createResponse = await postMeta(newMeta);
    const newMetaId = createResponse.data.id;

    if (meta.metaCode) {
      await putMetaCode(newMetaId, {
        lua: meta.metaCode.lua,
        blockly: meta.metaCode.blockly || "",
      });
    }

    // 重新获取新实体以确保包含 image 对象
    await getMeta(newMetaId, { expand: 'image,author' });

    refreshList();
  } catch (error) {
    console.error(error);
    ElMessage.error(t("meta.copy.error"));
  } finally {
    copyLoadingMap.value.set(id, false);
  }
};
```

## 调试步骤

### 步骤 1：检查原实体的 image_id

1. 打开 http://localhost:3001/meta/list
2. 打开浏览器开发者工具（F12）
3. 在控制台中运行：
```javascript
// 假设你要复制 ID 为 123 的实体
fetch('/api/metas/123?expand=image,author')
  .then(r => r.json())
  .then(data => {
    console.log('Original entity:', data);
    console.log('image_id:', data.image_id);
    console.log('image:', data.image);
  });
```

### 步骤 2：监控复制过程

在 `src/views/meta/list.vue` 的 copy 函数中添加 console.log：

```typescript
const copy = async (id: number, newTitle: string) => {
  copyLoadingMap.value.set(id, true);
  try {
    const response = await getMeta(id);
    const meta = response.data;

    console.log('=== Copy Debug ===');
    console.log('1. Original meta:', meta);
    console.log('2. Original image_id:', meta.image_id);
    console.log('3. Original image:', meta.image);

    const newMeta = {
      title: newTitle,
      uuid: uuidv4(),
      image_id: meta.image_id,
      data: meta.data,
      info: meta.info,
      events: meta.events,
      prefab: meta.prefab,
    };

    console.log('4. New meta to create:', newMeta);

    const createResponse = await postMeta(newMeta);
    const newMetaId = createResponse.data.id;

    console.log('5. Created response:', createResponse.data);
    console.log('6. New meta id:', newMetaId);
    console.log('7. New meta image_id:', createResponse.data.image_id);

    if (meta.metaCode) {
      await putMetaCode(newMetaId, {
        lua: meta.metaCode.lua,
        blockly: meta.metaCode.blockly || "",
      });
    }

    refreshList();
    console.log('=== Copy Complete ===');
  } catch (error) {
    console.error('Copy error:', error);
    ElMessage.error(t("meta.copy.error"));
  } finally {
    copyLoadingMap.value.set(id, false);
  }
};
```

### 步骤 3：检查列表刷新后的数据

在复制完成后，检查列表中新实体的数据：

```javascript
// 在控制台中，假设新实体 ID 为 456
fetch('/api/metas/456?expand=image,author')
  .then(r => r.json())
  .then(data => {
    console.log('New entity after refresh:', data);
    console.log('image_id:', data.image_id);
    console.log('image:', data.image);
  });
```

## 预期结果

### 如果 image_id 正确复制

- 原实体的 `image_id`: 例如 `789`
- 新实体的 `image_id`: 应该也是 `789`
- 新实体的 `image` 对象: 应该包含完整的图片信息（url, filename 等）

### 如果 image_id 为 null

- 原实体的 `image_id`: `null`
- 新实体的 `image_id`: `null`
- 这种情况下，原实体本身就没有图片，所以复制后也不会有

## 常见问题

### Q: 为什么不直接复制 image 对象？

A: `image` 是一个关联对象，不应该在创建实体时传递。正确的做法是：
1. 传递 `image_id`（图片的 ID）
2. 后端通过 `image_id` 建立关联
3. 查询时使用 `expand=image` 来获取完整的 image 对象

### Q: 如果原实体有 image，但复制后没有怎么办？

A: 可能的原因：
1. 后端 API 的 bug（没有正确处理 image_id）
2. 数据库中的图片记录被删除了
3. 权限问题（新实体无法访问该图片）

需要检查后端日志和数据库来确认。

## 建议的修复

如果确认是前端问题，建议添加 expand 参数：

```typescript
const response = await getMeta(id, { expand: 'image,author' });
```

但这主要是为了调试。真正的复制逻辑（传递 `image_id`）已经是正确的。

如果问题仍然存在，很可能是后端的问题，需要检查：
1. 后端是否正确保存了 `image_id`
2. 后端在返回新实体时是否正确关联了 image 对象
