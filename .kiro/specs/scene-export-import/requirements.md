# 需求文档：场景导出/导入

## 简介

本功能允许用户将一个完整的场景（Verse）导出为压缩文件包，包含场景数据、所有实体（Meta）、脚本（Blockly/Lua/JS）、以及关联的资源文件（模型、音频、图片、文字等）。导出的压缩文件可以被其他账号导入，完整还原场景及其所有组成部分。

## 术语表

- **Verse（场景）**：包含实体、脚本和资源的顶层容器，对应 `VerseData` 类型
- **Meta（实体）**：场景中的独立对象，拥有自身的数据、脚本和资源引用，对应 `metaInfo` 类型
- **Resource（资源）**：场景或实体引用的媒体文件，类型包括 voxel、polygen、picture、video、audio、particle，对应 `ResourceInfo` 类型
- **VerseCode（场景脚本）**：场景级别的 Blockly/Lua/JS 脚本
- **MetaCode（实体脚本）**：实体级别的 Blockly/Lua/JS 脚本
- **Scene_Package（场景包）**：导出生成的 ZIP 压缩文件，包含 manifest.json 和所有资源文件
- **Manifest（清单文件）**：场景包中的 JSON 文件，描述场景结构、实体关系和资源映射
- **Export_Service（导出服务）**：负责收集场景数据并打包为场景包的前端模块
- **Import_Service（导入服务）**：负责解析场景包并还原场景的前端模块
- **UUID_Mapper（UUID 映射器）**：导入时负责将旧 UUID 映射到新 UUID 的组件

## 需求

### 需求 1：场景数据收集

**用户故事：** 作为用户，我希望导出时系统能完整收集场景的所有数据，以便导出文件包含还原场景所需的全部信息。

#### 验收标准

1. WHEN 用户触发场景导出, THE Export_Service SHALL 获取完整的 Verse 数据，包括 name、description、data、version 和 uuid 字段
2. WHEN 导出一个场景, THE Export_Service SHALL 获取该场景关联的所有 Meta 实体，包括每个 Meta 的 title、data、events 和 uuid 字段
3. WHEN 导出一个场景, THE Export_Service SHALL 获取 Verse 级别的 VerseCode（blockly、lua、js）
4. WHEN 导出一个场景, THE Export_Service SHALL 获取每个 Meta 关联的 MetaCode（blockly、lua、js）
5. WHEN 导出一个场景, THE Export_Service SHALL 收集所有关联的 Resource 信息，包括 uuid、name、type 和 file 下载地址

### 需求 2：资源文件下载与打包

**用户故事：** 作为用户，我希望导出的压缩文件包含所有资源的实际文件，以便导入时无需依赖原始服务器上的文件。

#### 验收标准

1. WHEN 导出场景时存在关联资源, THE Export_Service SHALL 通过资源的 file.url 下载每个资源的实际文件内容
2. WHEN 下载资源文件完成后, THE Export_Service SHALL 使用资源的 MD5 值验证文件完整性
3. IF 某个资源文件下载失败, THEN THE Export_Service SHALL 记录失败的资源信息并继续处理其余资源，最终向用户报告哪些资源未能成功导出
4. WHEN 所有数据收集完成, THE Export_Service SHALL 将 manifest.json 和所有资源文件打包为一个 ZIP 格式的压缩文件

### 需求 3：清单文件生成

**用户故事：** 作为用户，我希望导出文件中包含结构化的清单信息，以便导入时能正确还原场景结构和关系。

#### 验收标准

1. THE Export_Service SHALL 生成一个 manifest.json 文件，包含版本号、导出时间戳和场景包格式版本
2. THE Manifest SHALL 包含完整的 Verse 数据结构（不含服务端生成的 id 和 author_id）
3. THE Manifest SHALL 包含所有 Meta 实体的数据结构，每个 Meta 通过 uuid 标识
4. THE Manifest SHALL 包含所有 VerseCode 和 MetaCode 脚本内容
5. THE Manifest SHALL 包含资源清单，每条资源记录 uuid、name、type 和对应的文件路径（在 ZIP 包内的相对路径）
6. THE Manifest SHALL 记录 Meta 与 Resource 之间的关联关系
7. THE Manifest SHALL 记录 Verse 的 data 字段中引用的 Meta ID 到 Meta UUID 的映射关系

### 需求 4：场景包导入与解析

**用户故事：** 作为用户，我希望能够导入其他账号导出的场景包，以便在我的账号下还原完整的场景。

#### 验收标准

1. WHEN 用户选择一个场景包文件, THE Import_Service SHALL 验证该文件为有效的 ZIP 格式
2. WHEN 解析场景包时, THE Import_Service SHALL 读取并验证 manifest.json 的格式版本兼容性
3. WHEN manifest.json 验证通过后, THE Import_Service SHALL 创建一个新的 Verse，使用新生成的 UUID 和当前用户的 author_id
4. WHEN 导入场景时, THE Import_Service SHALL 为每个 Meta 创建新实体，使用新生成的 UUID
5. WHEN 导入场景时, THE Import_Service SHALL 上传所有资源文件并创建新的 Resource 记录
6. WHEN 导入场景时, THE Import_Service SHALL 还原 Meta 与 Resource 之间的关联关系
7. WHEN 导入场景时, THE Import_Service SHALL 还原 VerseCode 和所有 MetaCode 脚本
8. IF 场景包文件格式无效或 manifest.json 缺失, THEN THE Import_Service SHALL 向用户显示明确的错误信息并终止导入

### 需求 5：ID 映射与引用更新

**用户故事：** 作为用户，我希望导入后的场景中所有内部引用都正确指向新创建的实体和资源，以便场景能正常运行。

#### 验收标准

1. WHEN 导入创建新实体后, THE UUID_Mapper SHALL 维护一份旧 UUID 到新 ID 的完整映射表
2. WHEN 还原 Verse 的 data 字段时, THE Import_Service SHALL 将 data 中所有 meta_id 引用替换为新创建的 Meta ID
3. WHEN 还原 Meta 的 data 字段时, THE Import_Service SHALL 将 data 中所有 resource ID 引用替换为新创建的 Resource ID
4. WHEN 所有引用更新完成后, THE Import_Service SHALL 验证 Verse data 中不存在任何指向旧 ID 的引用

### 需求 6：导出导入进度反馈

**用户故事：** 作为用户，我希望在导出和导入过程中看到进度信息，以便了解操作的当前状态。

#### 验收标准

1. WHILE 导出过程进行中, THE Export_Service SHALL 向用户显示当前进度，包括已处理的资源数量和总资源数量
2. WHILE 导入过程进行中, THE Import_Service SHALL 向用户显示当前进度，包括已上传的资源数量和总资源数量
3. IF 导出或导入过程中发生网络错误, THEN THE Export_Service 或 Import_Service SHALL 向用户显示可理解的错误信息并允许重试

### 需求 7：后端 API 需求

**用户故事：** 作为前端开发者，我需要后端提供必要的 API 支持，以便前端能够完成场景的完整导出和导入。

#### 验收标准

1. THE 后端 SHALL 提供一个场景完整数据导出接口（GET /v1/verses/{id}/export），返回 Verse 及其所有关联的 Meta、MetaCode、VerseCode 和 Resource 信息
2. WHEN 前端调用导出接口时, THE 后端 SHALL 在单次响应中返回场景的完整数据树，避免前端发起多次请求
3. THE 后端 SHALL 提供一个场景批量导入接口（POST /v1/verses/import），接受完整的场景数据并在服务端完成创建
4. WHEN 前端调用导入接口时, THE 后端 SHALL 处理 Verse、Meta、Resource 的创建以及关联关系的建立，并返回新创建的 ID 映射
5. IF 导入过程中任何步骤失败, THEN THE 后端 SHALL 回滚所有已创建的数据，保证数据一致性
