# 需求文档：场景导出/导入 API 重构

## 简介

后端已实现了新的场景包导出/导入 API（`/v1/scene-package/`），与前端原始设计存在重大差异。后端现在直接支持 ZIP 格式的导出和导入，前端不再需要自行处理资源下载、MD5 校验、ZIP 打包/解压、资源上传和 ID 重映射等复杂逻辑。

本次重构的目标是将前端代码与后端实际 API 对齐，大幅简化导出/导入流程，移除不再需要的前端逻辑。

## 参考文档

- 后端 API 文档：#[[file:docs/scene-package-api-usage.md]]
- 原始 spec：#[[file:.kiro/specs/scene-export-import/requirements.md]]

## 术语表

- **Verse（场景）**：包含实体、脚本和资源的顶层容器
- **Meta（实体）**：场景中的独立对象
- **Resource（资源）**：场景或实体引用的媒体文件
- **Scene_Package API**：后端新实现的场景包导出/导入 API，路径前缀为 `/v1/scene-package/`

## 需求

### 需求 1：API 路径对齐

**用户故事：** 作为前端开发者，我需要将 API 调用路径更新为后端实际实现的路径，以便前端能正确调用后端接口。

#### 验收标准

1. WHEN 前端调用导出接口时, THE API 层 SHALL 使用路径 `/v1/scene-package/verses/{id}/export`（而非旧路径 `/v1/verses/{id}/export`）
2. WHEN 前端调用导入接口时, THE API 层 SHALL 使用路径 `/v1/scene-package/verses/import`（而非旧路径 `/v1/verses/import`）
3. THE API 层 SHALL 更新类型定义以匹配后端实际返回的数据结构

### 需求 2：简化导出流程（使用后端 ZIP 导出）

**用户故事：** 作为用户，我希望点击导出按钮后直接下载后端生成的 ZIP 文件，无需等待前端逐个下载资源文件和打包。

#### 验收标准

1. WHEN 用户点击导出按钮, THE ExportService SHALL 通过设置 `Accept: application/zip` 请求头调用后端导出接口
2. WHEN 后端返回 ZIP 二进制流, THE ExportService SHALL 从 `Content-Disposition` 响应头提取文件名
3. WHEN ZIP 文件下载完成, THE ExportService SHALL 触发浏览器下载，文件名使用后端返回的文件名（格式为 `scene_{id}.zip`）
4. THE ExportService SHALL 不再包含资源文件下载、MD5 校验、JSZip 打包等逻辑
5. WHEN 导出过程中发生网络错误, THE ExportService SHALL 向用户显示可理解的错误信息

### 需求 3：简化导入流程（使用后端 ZIP 导入）

**用户故事：** 作为用户，我希望选择 ZIP 文件后直接上传给后端完成导入，无需等待前端逐个上传资源文件。

#### 验收标准

1. WHEN 用户选择一个 .zip 文件, THE ImportService SHALL 使用 `multipart/form-data` 格式将 ZIP 文件直接上传到后端导入接口
2. WHEN 后端返回导入结果, THE ImportService SHALL 返回新创建的场景 ID（verseId）
3. THE ImportService SHALL 不再包含 ZIP 解压、manifest 验证、资源文件上传、导入请求构建等逻辑
4. IF 导入失败, THEN THE ImportService SHALL 向用户显示后端返回的错误信息
5. IF 文件格式无效, THEN THE ImportService SHALL 向用户显示明确的错误提示

### 需求 4：简化 UI 组件

**用户故事：** 作为用户，我希望导出/导入的 UI 交互更简洁，因为后端处理了大部分复杂逻辑。

#### 验收标准

1. THE ExportButton 组件 SHALL 显示导出中的加载状态（无需显示资源下载进度）
2. THE ExportButton 组件 SHALL 在导出完成后显示成功提示
3. THE ExportButton 组件 SHALL 在导出失败时显示错误提示
4. THE ImportDialog 组件 SHALL 支持文件选择（.zip 格式）
5. THE ImportDialog 组件 SHALL 显示导入中的加载状态（无需显示资源上传进度）
6. THE ImportDialog 组件 SHALL 在导入成功后显示结果并支持跳转到新场景
7. THE ImportDialog 组件 SHALL 在导入失败时显示错误信息并允许重试

### 需求 5：清理废弃代码

**用户故事：** 作为开发者，我希望移除不再需要的前端代码，保持代码库整洁。

#### 验收标准

1. THE 重构 SHALL 移除 `src/services/scene-package/manifest.ts` 中不再需要的 buildManifest、parseManifest、validateManifest 函数（如果没有其他地方引用）
2. THE 重构 SHALL 移除 `src/services/scene-package/uuid-mapper.ts` 中不再需要的 UUIDMapper 类和 remapVerseData/remapMetaData 函数（如果没有其他地方引用）
3. THE 重构 SHALL 移除 export-service.ts 中不再需要的资源下载、MD5 校验、ZIP 打包逻辑
4. THE 重构 SHALL 移除 import-service.ts 中不再需要的 ZIP 解压、资源上传、导入请求构建逻辑
5. THE 重构 SHALL 评估 jszip、spark-md5、file-saver 依赖是否仍被其他模块使用，如果不再需要则从 package.json 中移除
