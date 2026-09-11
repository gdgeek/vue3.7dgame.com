# 模型与按钮布局

## 目的与前置条件

让模型和按钮在目标视角下清楚、可达，且不影响其他场景。先确定用户站位、观察方向、坐姿或站姿、尺寸要求及世界/局部坐标；不要把某个坐标轴永久视为用户前方。

## 操作步骤

1. 场景编辑页读取 `xrugc_get_scene_modules`，用 `xrugc_inspect_scene_module` 确认目标实例。仅调整本场景位置、旋转或比例时，用 `xrugc_stage_scene_module_transform` 与 `xrugc_complete_scene_module_transform`。
2. 修改实体内部模型或按钮时，切换实体编辑页并重新发现工具，读取 `xrugc_get_editor_context` 的引用信息、`xrugc_get_entity_tree` 和 `xrugc_inspect_entity_node`。共享实体的修改可能影响其他引用场景；先确认影响范围，必要时通过平台已有功能准备独立实体。
3. 使用 `xrugc_stage_node_transform` 暂存，核对预览后由 `xrugc_complete_node_transform` 完成页面确认与保存。旋转参数 `rotationDegrees` 使用角度制；参数细节以当前 schema 为准。
4. 检查父级缩放对按钮高度、子节点位置和碰撞范围的影响。操作按钮可与可移动模型分开，避免整体缩小时变得过低或难以触达。
5. 展开动画后再次检查边界、遮挡与间距；根据目标设备和用户需求调整位置，再重读确认。

## 验证与限制

数值正确仍需可见画面和真实交互验证。重读需区分实时未保存内容与重载后的保存内容。移动模型不等于移动相机；没有对应相机工具时应说明实现范围。单个网页截图不能证明头显手势可达或双手缩放可用。
