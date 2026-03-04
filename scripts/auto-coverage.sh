#!/bin/bash
# 自动循环补测试，直到覆盖率不再提升
# 用法：bash scripts/auto-coverage.sh

set -e
PNPM=/home/ubuntu/.cache/node/corepack/v1/pnpm/9.15.0/bin/pnpm.cjs
PROJECT=/home/ubuntu/projects/vue3.7dgame.com
LOG=/tmp/auto-coverage.log
ROUND=0
PREV_LINES=0

export http_proxy=http://127.0.0.1:8118
export https_proxy=http://127.0.0.1:8118

source ~/claude-sdk-env/bin/activate

cd "$PROJECT"

get_coverage() {
  $PNPM run test:coverage 2>&1 | grep "^All files" | awk '{print $4}' | tr -d '%'
}

run_claude_round() {
  local round=$1
  echo "[round $round] 启动 Claude Code 补测试..." | tee -a "$LOG"

  python3 -u - << PYEOF 2>&1 | tee -a "$LOG"
import anyio, sys
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock, ToolUseBlock

PROMPT = """查看当前测试覆盖率报告，找出覆盖率最低（lines=0%）但逻辑不太复杂的模块，为它们补充单元测试。

策略：
1. 先运行：/home/ubuntu/.cache/node/corepack/v1/pnpm/9.15.0/bin/pnpm.cjs run test:coverage 2>&1 | grep -E "^\\s+\\S+.*\\|\\s+0 " | head -20
   找出 lines=0 的文件
2. 挑 3-5 个行数少于 200 行、逻辑相对简单的文件
3. 读源文件，写测试
4. 注意：@vue/test-utils 未安装；Vue 组件用 createApp + jsdom 方式
5. 每完成一个打印进度
6. 全部写完后运行测试确认通过：
   /home/ubuntu/.cache/node/corepack/v1/pnpm/9.15.0/bin/pnpm.cjs exec vitest run 2>&1 | tail -5

每轮补 3-5 个文件即可，不要贪多。
"""

async def main():
    options = ClaudeAgentOptions(
        cwd='/home/ubuntu/projects/vue3.7dgame.com',
        max_turns=60,
        allowed_tools=['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
        permission_mode='acceptEdits',
        system_prompt='你是资深Vue3测试工程师，直接执行任务，每完成一个文件打印进度，用中文。',
    )
    async for message in query(prompt=PROMPT, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print('[Claude]', block.text, flush=True)
                elif isinstance(block, ToolUseBlock):
                    print(f'[工具] {block.name}', flush=True)

anyio.run(main)
PYEOF
}

commit_and_push() {
  local round=$1
  cd "$PROJECT"
  if git diff --quiet && git diff --cached --quiet; then
    echo "[round $round] 没有新文件，跳过 commit"
    return
  fi
  git add -A
  git commit -m "test(auto-round-$round): increase coverage via auto-coverage script"
  git push origin openclaw/improvements
  echo "[round $round] 已推送"
}

echo "=== 自动覆盖率提升脚本启动 ===" | tee "$LOG"

while true; do
  ROUND=$((ROUND + 1))
  echo "" | tee -a "$LOG"
  echo "===== 第 $ROUND 轮 =====" | tee -a "$LOG"

  # 运行 Claude 补测试（带重试逻辑）
  RETRY=0
  while true; do
    run_claude_round $ROUND && break
    EXIT_CODE=$?
    RETRY=$((RETRY + 1))
    if grep -q "rate.limit\|overloaded\|529\|RateLimitError" "$LOG" 2>/dev/null; then
      WAIT=$((60 * RETRY))
      echo "[round $ROUND] 触发限流，等待 ${WAIT}s 后重试..." | tee -a "$LOG"
      sleep $WAIT
    else
      echo "[round $ROUND] 非限流错误，退出" | tee -a "$LOG"
      break 2
    fi
  done

  commit_and_push $ROUND

  # 检查覆盖率是否还在提升
  CURR_LINES=$(get_coverage 2>/dev/null || echo "0")
  echo "[round $ROUND] 覆盖率: ${PREV_LINES}% -> ${CURR_LINES}%" | tee -a "$LOG"

  if [ "$CURR_LINES" = "$PREV_LINES" ]; then
    echo "覆盖率连续两轮未提升，自动停止" | tee -a "$LOG"
    break
  fi
  PREV_LINES=$CURR_LINES

  # 简短休息避免连续打爆
  sleep 5
done

echo "=== 结束，最终覆盖率: ${CURR_LINES}% ===" | tee -a "$LOG"
