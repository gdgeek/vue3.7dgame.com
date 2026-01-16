# Image ID 复制测试指南

## 快速测试步骤

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 打开测试页面

访问：http://localhost:3001/meta/list

### 3. 打开浏览器开发者工具

按 F12 或右键 → 检查

### 4. 执行复制操作

1. 选择一个**有图片**的实体
2. 点击复制按钮
3. 输入新名称
4. 点击确认

### 5. 查看控制台输出

你应该看到类似这样的输出：

```
=== Entity Copy Debug ===
1. Original entity: {
  id: 123,
  title: "原实体",
  image_id: 456,
  image: {
    id: 456,
    url: "http://example.com/image.png",
    filename: "image.png",
    ...
  },
  ...
}
2. Original image_id: 456
3. Original image: { id: 456, url: "...", ... }
4. New meta to create: {
  title: "原实体 - Copy",
  uuid: "...",
  image_id: 456,  // ← 检查这个值
  data: {...},
  info: "...",
  events: {...},
  prefab: 0
}
5. Created response: {
  id: 789,
  title: "原实体 - Copy",
  image_id: 456,  // ← 检查这个值
  ...
}
6. New entity id: 789
7. New entity image_id: 456  // ← 检查这个值
=== Copy Complete ===
```

## 诊断问题

### 情况 1：Original image_id 为 null

**输出示例**：
```
2. Original image_id: null
3. Original image: undefined
```

**原因**：原实体本身没有图片

**解决方案**：这是正常的，选择一个有图片的实体进行测试

### 情况 2：Original image_id 有值，但 Created response 中为 null

**输出示例**：
```
2. Original image_id: 456
4. New meta to create: { ..., image_id: 456, ... }
5. Created response: { ..., image_id: null, ... }  // ← 问题在这里
```

**原因**：后端没有正确保存 image_id

**解决方案**：
1. 检查后端 API 日志
2. 检查数据库中新记录的 image_id 字段
3. 可能需要修复后端代码

### 情况 3：Created response 中 image_id 有值，但列表中看不到图片

**输出示例**：
```
5. Created response: { ..., image_id: 456, ... }
7. New entity image_id: 456
```

但在列表中新实体没有显示图片。

**原因**：后端返回的数据没有 expand image 对象

**解决方案**：手动验证新实体

在控制台运行：
```javascript
// 使用步骤 5 中的新实体 ID（例如 789）
fetch('/api/metas/789?expand=image,author')
  .then(r => r.json())
  .then(data => {
    console.log('=== Manual Verification ===');
    console.log('New entity:', data);
    console.log('image_id:', data.image_id);
    console.log('image:', data.image);
  });
```

如果这个请求返回的数据包含 image 对象，说明：
- image_id 已正确保存
- 问题是列表刷新时的数据没有 expand
- 需要等待几秒后刷新页面，或者手动刷新

### 情况 4：手动验证也没有 image 对象

**输出示例**：
```javascript
{
  id: 789,
  image_id: 456,
  image: null  // ← 问题
}
```

**原因**：
1. 数据库中的图片记录（ID 456）不存在或被删除
2. 后端的 expand 逻辑有问题
3. 权限问题

**解决方案**：
1. 检查原实体的图片是否还存在：
```javascript
fetch('/api/metas/123?expand=image,author')  // 原实体 ID
  .then(r => r.json())
  .then(data => {
    console.log('Original entity image:', data.image);
  });
```

2. 直接检查图片记录：
```javascript
fetch('/api/files/456')  // 图片 ID
  .then(r => r.json())
  .then(data => {
    console.log('Image record:', data);
  })
  .catch(err => {
    console.error('Image not found:', err);
  });
```

## 完整的调试脚本

将以下代码粘贴到浏览器控制台：

```javascript
// 替换为你要测试的实体 ID
const originalEntityId = 123;

async function debugCopy() {
  console.log('=== Starting Debug ===');

  // 1. 检查原实体
  const original = await fetch(`/api/metas/${originalEntityId}?expand=image,author`)
    .then(r => r.json());

  console.log('1. Original entity:', original);
  console.log('   - image_id:', original.image_id);
  console.log('   - image:', original.image);

  if (!original.image_id) {
    console.warn('⚠️ Original entity has no image_id. Please select an entity with an image.');
    return;
  }

  // 2. 检查图片记录是否存在
  try {
    const imageRecord = await fetch(`/api/files/${original.image_id}`)
      .then(r => r.json());
    console.log('2. Image record exists:', imageRecord);
  } catch (err) {
    console.error('❌ Image record not found:', err);
    return;
  }

  console.log('✅ Original entity has valid image. You can proceed with copy operation.');
  console.log('   Now click the copy button and check the console output.');
}

debugCopy();
```

## 预期结果

### 成功的复制

1. **控制台输出**：
   - Original image_id: 有值（例如 456）
   - Created image_id: 相同的值（456）
   - 没有错误信息

2. **列表显示**：
   - 新实体出现在列表中
   - 新实体显示图片（与原实体相同的图片）

3. **手动验证**：
   - 新实体的 image 对象存在
   - image.url 可以访问

### 失败的复制

如果出现以下任何情况，说明有问题：
- Original image_id 有值，但 Created image_id 为 null
- Created image_id 有值，但手动验证时 image 为 null
- 列表中新实体没有显示图片（即使 image_id 正确）

## 下一步

根据测试结果：

1. **如果成功**：问题已解决，可以移除调试日志
2. **如果失败**：将控制台输出截图或复制文本发送给我，我会进一步分析
3. **如果是后端问题**：需要检查后端代码和数据库

## 移除调试日志

测试完成后，可以移除或注释掉调试日志：

```typescript
const copy = async (id: number, newTitle: string) => {
  copyLoadingMap.value.set(id, true);
  try {
    const response = await getMeta(id, { expand: 'image,author' });
    const meta = response.data;

    // 可以移除这些日志
    // console.log('=== Entity Copy Debug ===');
    // console.log('1. Original entity:', meta);
    // ...

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

    refreshList();
  } catch (error) {
    console.error('Copy error:', error);
    ElMessage.error(t("meta.copy.error"));
  } finally {
    copyLoadingMap.value.set(id, false);
  }
};
```
