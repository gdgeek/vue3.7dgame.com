#!/bin/bash
set -e

CLAUDE_BIN=~/claude-sdk-env/lib/python3.12/site-packages/claude_agent_sdk/_bundled/claude
PNPM=/home/ubuntu/.cache/node/corepack/v1/pnpm/9.15.0/bin/pnpm.cjs
CWD=/home/ubuntu/projects/vue3.7dgame.com
export http_proxy=http://127.0.0.1:8118
export https_proxy=http://127.0.0.1:8118

TASK=$1
DESC=${2:-""}

case "$TASK" in
  test)
    echo "🗡️ Claude Code → 补测试（从 uncovered-files.txt 取前5个）"
    FILES=$(head -5 $CWD/scripts/uncovered-files.txt | tr "\n" " ")
    $CLAUDE_BIN --dangerously-skip-permissions --max-turns 30 -p \
      "$(cat $CWD/scripts/prompts/test-task.txt)
目标文件：$FILES" 2>&1 | tee /tmp/dispatch-test.log
    ;;
  fix)
    if echo "$DESC" | grep -qiE "lint|warning|unused|typo|format"; then
      echo "🗡️ Codex → 小修：$DESC"
      codex exec --full-auto "修复 /home/ubuntu/projects/vue3.7dgame.com 中的问题：$DESC
修完运行 $PNPM exec vitest run 验证，通过后 git add src/ && git commit -m \"fix: $DESC\"" 2>&1 | tee /tmp/dispatch-fix.log
    else
      echo "🗡️ Claude Code → 复杂修复：$DESC"
      $CLAUDE_BIN --dangerously-skip-permissions --max-turns 20 -p \
        "修复 /home/ubuntu/projects/vue3.7dgame.com 中的问题：$DESC
1. 读取相关文件理解现有代码
2. 实现修复
3. 运行 $PNPM exec vitest run 验证
4. 通过后 git add src/ && git commit -m \"fix: $DESC\"" 2>&1 | tee /tmp/dispatch-fix.log
    fi
    ;;
  review)
    echo "🗡️ Codex → 增量 Code Review"
    bash $CWD/scripts/review-incremental.sh 2>&1 | tee /tmp/dispatch-review.log
    ;;
  refactor)
    echo "🗡️ Claude Code → 大文件重构：$DESC"
    $CLAUDE_BIN --dangerously-skip-permissions --max-turns 50 -p \
      "请对 /home/ubuntu/projects/vue3.7dgame.com/$DESC 进行重构：
1. 分析文件结构，识别可拆分的逻辑
2. 提取 composables 到对应目录
3. 补充单元测试
4. 运行 $PNPM exec vitest run 验证
5. git add src/ test/ && git commit -m \"refactor: extract composables from $DESC\"" 2>&1 | tee /tmp/dispatch-refactor.log
    ;;
  *)
    echo "用法：$0 <test|fix|review|refactor> [描述/文件]"
    echo ""
    echo "示例："
    echo "  $0 test                           # 补测试（前5个未覆盖文件）"
    echo "  $0 fix \"remove unused lint warnings\"  # Codex 小修"
    echo "  $0 fix \"修复 ScenePlayer 加载顺序\"     # Claude Code 复杂修复"
    echo "  $0 review                         # 增量 Code Review"
    echo "  $0 refactor src/views/video/index.vue  # 大文件重构"
    exit 1
    ;;
esac
