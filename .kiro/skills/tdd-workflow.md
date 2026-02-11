---
inclusion: manual
---

# TDD 工作流

> 改编自 Everything Claude Code 的 tdd-workflow skill。

## 流程：红-绿-重构

```
RED → GREEN → REFACTOR → REPEAT
 ↓      ↓        ↓
写失败  写最少   改善代码
的测试  的代码   保持测试通过
```

## 步骤

### 1. RED - 写失败的测试

```typescript
// 先定义接口
interface UserService {
  getUser(id: string): Promise<User>
}

// 写测试（此时应该失败）
describe('UserService', () => {
  it('should return user when valid ID provided', async () => {
    const service = new UserServiceImpl()
    const user = await service.getUser('123')
    expect(user).toEqual({ id: '123', name: 'Test User' })
  })
})
```

### 2. GREEN - 写最少的代码让测试通过

```typescript
class UserServiceImpl implements UserService {
  async getUser(id: string): Promise<User> {
    // 最小实现，只为通过测试
    const response = await api.get(`/users/${id}`)
    return response.data
  }
}
```

### 3. REFACTOR - 改善代码质量

- 消除重复
- 改善命名
- 提取公共逻辑
- 确保所有测试仍然通过

## 何时使用 TDD

适合：
- 业务逻辑函数
- API 服务层
- 工具函数
- 数据转换

不适合：
- UI 布局调整
- 第三方库集成
- 原型/探索性代码

## 测试覆盖率目标

- 业务逻辑：90%+
- API 层：80%+
- 工具函数：100%
- 整体项目：80%+

## Vue 组件的 TDD

```typescript
import { mount } from '@vue/test-utils'
import UserCard from './UserCard.vue'

describe('UserCard', () => {
  it('should display user name', () => {
    const wrapper = mount(UserCard, {
      props: { user: { name: '张三', email: 'test@example.com' } }
    })
    expect(wrapper.text()).toContain('张三')
  })

  it('should emit edit event when button clicked', async () => {
    const wrapper = mount(UserCard, {
      props: { user: { name: '张三', email: 'test@example.com' } }
    })
    await wrapper.find('[data-testid="edit-btn"]').trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
  })
})
```
