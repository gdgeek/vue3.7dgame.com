# Implementation Plan: 场景导出/导入

## Overview

基于设计文档，将场景导出/导入功能拆分为增量式编码任务。先搭建核心数据类型和工具模块，再实现导出/导入服务，最后集成 UI 组件。每个任务构建在前一个任务之上，确保无孤立代码。

## Tasks

- [x] 1. 安装依赖并创建项目结构
  - 安装 `jszip` 和 `file-saver` 及其类型声明包
  - 创建 `src/services/scene-package/` 目录
  - 创建 `src/api/v1/scene-package.ts` API 模块
  - 创建 `src/components/ScenePackage/` 目录
  - _Requirements: 2.4, 4.1_

- [x] 2. 实现 Manifest 类型定义与构建/解析
  - [x] 2.1 创建 `src/services/scene-package/manifest.ts`，定义 SceneManifest、ManifestVerse、ManifestMeta、ManifestResource 等类型接口
    - 实现 `buildManifest(exportData)` 函数：从 VerseExportData 构建 SceneManifest，剥离服务端 id 和 author_id，构建 metaUuidMapping
    - 实现 `parseManifest(json)` 函数：解析 JSON 字符串为 SceneManifest
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 2.2 为 buildManifest/parseManifest 编写属性测试
    - **Property 1: Manifest 序列化往返一致性**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [ ]* 2.3 为 buildManifest 编写属性测试 - 完整性
    - **Property 2: Manifest 完整性**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 3.3, 3.4, 3.5, 3.6**

  - [ ]* 2.4 为 buildManifest 编写属性测试 - 排除服务端 ID
    - **Property 3: Manifest 排除服务端 ID**
    - **Validates: Requirements 3.2**

- [x] 3. 实现 ManifestValidator
  - [x] 3.1 在 `src/services/scene-package/manifest.ts` 中实现 `validateManifest(manifest)` 函数
    - 验证 formatVersion 兼容性（支持版本列表）
    - 验证必填字段完整性（verse、metas、resources）
    - 返回 ValidationResult（valid + errors 数组）
    - _Requirements: 4.2, 4.8_

  - [ ]* 3.2 为 validateManifest 编写属性测试
    - **Property 6: Manifest 版本验证**
    - **Validates: Requirements 4.2**

  - [ ]* 3.3 为 validateManifest 编写单元测试
    - 测试缺失字段、空 manifest、无效版本号等边界情况
    - _Requirements: 4.8_

- [x] 4. 实现 UUIDMapper 和 ID 重映射
  - [x] 4.1 创建 `src/services/scene-package/uuid-mapper.ts`，实现 UUIDMapper 类
    - addMapping、getNewId、hasMapping、getAllMappings 方法
    - _Requirements: 5.1_

  - [x] 4.2 实现 `remapVerseData(data, metaMapper, resourceMapper)` 函数
    - 递归遍历 JSON 数据，替换 meta_id 和 resource 引用
    - _Requirements: 5.2, 5.3_

  - [x] 4.3 实现 `remapMetaData(data, resourceMapper)` 函数
    - 递归遍历 Meta data JSON，替换 resource 引用
    - _Requirements: 5.3_

  - [ ]* 4.4 为 UUIDMapper 编写属性测试
    - **Property 7: UUID 映射器存取一致性**
    - **Validates: Requirements 5.1**

  - [ ]* 4.5 为 remapVerseData/remapMetaData 编写属性测试
    - **Property 8: ID 重映射完整性**
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 5. Checkpoint - 确保核心模块测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. 实现 API 层
  - [x] 6.1 创建 `src/api/v1/scene-package.ts`，定义 VerseExportData、VerseImportRequest、VerseImportResponse 类型
    - 实现 `getVerseExport(verseId)` 函数，调用 GET /v1/verses/{id}/export
    - 实现 `postVerseImport(data)` 函数，调用 POST /v1/verses/import
    - _Requirements: 7.1, 7.3_

- [x] 7. 实现 ExportService
  - [x] 7.1 创建 `src/services/scene-package/export-service.ts`，实现 `exportScene(verseId, onProgress)` 函数
    - 调用 getVerseExport 获取完整场景数据
    - 调用 buildManifest 生成 manifest
    - 下载所有资源文件（通过 axios 获取 ArrayBuffer）
    - 使用 SparkMD5 进行 MD5 校验
    - 记录下载失败的资源，继续处理其余资源
    - 使用 JSZip 打包 manifest.json + 资源文件
    - 使用 file-saver 的 saveAs 触发浏览器下载
    - 通过 onProgress 回调报告进度
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 6.1_

  - [ ]* 7.2 为 MD5 校验逻辑编写属性测试
    - **Property 4: MD5 校验正确性**
    - **Validates: Requirements 2.2**

  - [ ]* 7.3 为资源下载容错逻辑编写属性测试
    - **Property 5: 资源下载部分失败的容错性**
    - **Validates: Requirements 2.3**

- [x] 8. 实现 ImportService
  - [x] 8.1 创建 `src/services/scene-package/import-service.ts`，实现 `importScene(file, onProgress)` 函数
    - 使用 JSZip 解压文件
    - 验证 ZIP 格式有效性
    - 读取并通过 validateManifest 验证 manifest.json
    - 逐个上传资源文件（使用现有 uploadFile API），收集新 file_id
    - 构建 VerseImportRequest 并调用 postVerseImport
    - 通过 onProgress 回调报告进度
    - 返回 ImportResult
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 6.2_

  - [ ]* 8.2 为 ImportService 编写单元测试
    - 测试无效 ZIP 文件处理
    - 测试缺失 manifest.json 处理
    - 测试版本不兼容处理
    - _Requirements: 4.1, 4.2, 4.8_

- [x] 9. Checkpoint - 确保导出导入服务测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. 实现 UI 组件
  - [x] 10.1 创建 `src/components/ScenePackage/ExportButton.vue`
    - 导出按钮组件，接收 verseId prop
    - 点击后调用 exportScene，显示进度对话框（已处理资源数/总数）
    - 导出完成后显示结果（成功/失败资源列表）
    - 错误时显示错误提示
    - _Requirements: 6.1, 6.3_

  - [x] 10.2 创建 `src/components/ScenePackage/ImportDialog.vue`
    - 导入对话框组件，支持文件选择（.zip）
    - 选择文件后调用 importScene，显示进度（已上传资源数/总数）
    - 导入完成后显示结果并跳转到新场景
    - 错误时显示错误提示并允许重试
    - _Requirements: 6.2, 6.3_

- [x] 11. 集成到场景页面
  - [x] 11.1 在场景编辑/详情页面集成 ExportButton 组件
    - 在场景操作区域添加导出按钮
    - 传入当前场景的 verseId
    - _Requirements: 1.1_

  - [x] 11.2 在场景列表页面集成 ImportDialog 组件
    - 在场景列表页面添加导入入口
    - 导入成功后刷新场景列表
    - _Requirements: 4.3_

- [x] 12. Final checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 后端需要新增 `GET /v1/verses/{id}/export` 和 `POST /v1/verses/import` 两个接口，前端开发可先用 mock 数据
- 属性测试使用 fast-check 库，每个测试至少 100 次迭代
- 所有 UI 组件使用 Vue 3 Composition API + `<script setup>` 语法
