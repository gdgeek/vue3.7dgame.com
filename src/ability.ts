// src/ability.ts
import { defineAbility } from '@casl/ability';
//
const ability = defineAbility((can, cannot) => {
  can('read', 'Article'); // 允许读取 Article
  can('create', 'Article', { authorId: 1 }); // 只有 authorId 为 1 的用户可以创建 Article
});

export { ability };
