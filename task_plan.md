# 去除项目中所有 any 类型

## 目标
消除 src/ 下所有非测试文件中的 `any` 类型，替换为正确的类型。
保持 0 build errors。

## 策略 (v2 - 安全替换)
之前的尝试导致 478 个构建错误。新策略：
1. 从 clean baseline (0 errors) 开始
2. 按文件批量替换，每批后 build 验证
3. 优先使用 unknown 替代 any（安全且不破坏构建）
4. 需要类型守卫的地方添加类型守卫
5. catch (e) 不需要类型注解（默认 unknown）
6. as any → 正确的类型断言

## 进度

### Phase 1: utils and core - in_progress
### Phase 2: assets and store
### Phase 3: components (简单)
### Phase 4: components (复杂)
### Phase 5: views
### Phase 6: api, router, layout, stories

## 状态: in_progress - Phase 1
