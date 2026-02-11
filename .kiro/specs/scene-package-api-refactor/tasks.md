# Implementation Plan: 场景导出/导入 API 重构

## Overview

将前端场景导出/导入功能与后端实际 API（`/v1/scene-package/`）对齐。重构 API 层、简化导出/导入服务、简化 UI 组件、清理废弃代码和依赖。

## Tasks

- [x] 1. 重构 API 层
  - [x] 1.1 重写 `src/api/v1/scene-package.ts`，更新 API 路径为 `/v1/scene-package/verses/...`，新增 `getVerseExportZip` 和 `postVerseImportZip` 函数，移除旧的 `getVerseExport` 和 `postVerseImport` 函数及其类型定义
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. 重写 ExportService
  - [x] 2.1 重写 `src/services/scene-package/export-service.ts`，实现简化版 `exportScene(verseId)` 函数：调用 `getVerseExportZip` 获取 ZIP blob，从 Content-Disposition 提取文件名，触发浏览器下载。实现 `extractFilename` 辅助函数。移除所有资源下载、MD5 校验、JSZip 打包相关代码
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 为 `extractFilename` 编写属性测试
    - **Property 1: Content-Disposition 文件名提取**
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. 重写 ImportService
  - [x] 3.1 重写 `src/services/scene-package/import-service.ts`，实现简化版 `importScene(file)` 函数：调用 `postVerseImportZip` 上传 ZIP 文件，返回 ImportResult。移除所有 ZIP 解压、manifest 验证、资源上传、导入请求构建相关代码
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. 简化 UI 组件
  - [x] 4.1 简化 `src/components/ScenePackage/ExportButton.vue`：移除进度对话框和结果对话框，改为 loading 状态 + ElMessage 成功/失败提示。更新 `exportScene` 调用签名（移除 onProgress 参数）
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.2 简化 `src/components/ScenePackage/ImportDialog.vue`：移除多阶段进度显示，改为简单的 loading 状态。更新 `importScene` 调用签名（移除 onProgress 参数）。保留文件选择、成功跳转、失败重试功能
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [x] 5. 清理废弃代码和依赖
  - [x] 5.1 删除 `src/services/scene-package/manifest.ts` 和 `src/services/scene-package/uuid-mapper.ts`
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 删除 `test/unit/services/scene-package/manifest.spec.ts` 和 `test/unit/services/scene-package/uuid-mapper.spec.ts`
    - _Requirements: 5.1, 5.2_

  - [x] 5.3 从 package.json 中移除 `jszip` 和 `file-saver` 依赖（及其类型声明包 `@types/file-saver`），保留 `spark-md5`
    - _Requirements: 5.5_

- [x] 6. 验证与测试
  - [x] 6.1 为 `exportScene` 和 `importScene` 编写单元测试，验证 API 调用和返回值处理
  - [x] 6.2 运行现有测试确保无回归，确认所有测试通过

## Notes

- Tasks marked with `*` are optional
- 后端 API 文档：`docs/scene-package-api-usage.md`
- 导出使用原生 axios（需要 blob 响应类型），导入使用项目 request 封装
- spark-md5 保留（`src/assets/js/file/base.ts` 仍在使用）
