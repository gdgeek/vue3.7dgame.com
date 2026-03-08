#!/bin/bash
# auto-coverage.sh - 双剑自动化覆盖率提升
# Claude Code（复杂 Vue 组件）+ Codex（API/utils + 阈值提升）并行

PNPM=/home/ubuntu/.cache/node/corepack/v1/pnpm/9.15.0/bin/pnpm.cjs
CLAUDE_BIN=~/claude-sdk-env/lib/python3.12/site-packages/claude_agent_sdk/_bundled/claude
REPO=/home/ubuntu/projects/vue3.7dgame.com
LOG=/tmp/auto-coverage.log

export http_proxy=http://127.0.0.1:8118
export https_proxy=http://127.0.0.1:8118

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a $LOG; }

notify() {
  log "通知: $1"
  openclaw msg send --channel feishu --message "$1" 2>/dev/null || true
}

cd $REPO

wait_claude() {
  log "等待 Claude Code 完成..."
  local i=0
  while pgrep -f "claude.*dangerously-skip" > /dev/null && [ $i -lt 80 ]; do
    sleep 30; i=$((i+1))
    [ $((i % 4)) -eq 0 ] && log "Claude Code 还在跑... ($((i*30))s)"
  done
  log "Claude Code 结束"
}

wait_codex() {
  log "等待 Codex 完成..."
  local i=0
  while tmux has-session -t codex-auto 2>/dev/null && \
        tmux capture-pane -t codex-auto -p 2>/dev/null | grep -qv "DONE\|\$"; do
    sleep 20; i=$((i+1))
    [ $((i % 6)) -eq 0 ] && log "Codex 还在跑... ($((i*20))s)"
    [ $i -gt 90 ] && break
  done
  log "Codex 结束"
}

merge_to_develop() {
  local ahead=$(git log develop..openclaw/improvements --oneline | wc -l | tr -d ' ')
  if [ "$ahead" = "0" ]; then
    log "无新 commit，跳过合并"
    return 0
  fi
  log "合并 ${ahead} 个 commit → develop..."
  git checkout develop && git pull origin develop
  git merge openclaw/improvements --no-ff --no-commit 2>/dev/null || true
  DT=$(date +%Y%m%d%H%M)
  git checkout --theirs .env.production .env.staging 2>/dev/null || true
  sed -i "s/VITE_DEV_DATE='[0-9]*'/VITE_DEV_DATE='$DT'/" .env.production .env.staging
  git add -A
  git commit --no-verify -m "test: auto-merge coverage batch ${DT}A" || \
    git commit --no-verify -m "chore: bump ${DT}A" --allow-empty
  git push origin develop
  log "✅ develop 推送完成 ($DT)"
}

wait_ci() {
  sleep 20
  local run_id=$(gh run list --branch develop --limit 1 --json databaseId -q '.[0].databaseId')
  log "CI Run: $run_id，等待中..." >&2
  local i=0
  while [ $i -lt 25 ]; do
    sleep 30; i=$((i+1))
    local status=$(gh run list --branch develop --limit 1 --json status -q '.[0].status')
    [ "$status" = "completed" ] && break
    [ $((i % 4)) -eq 0 ] && log "CI 进行中... ($((i*30))s)" >&2
  done
  gh run list --branch develop --limit 1 --json conclusion -q '.[0].conclusion'
}

get_coverage() {
  log "测量覆盖率（约3分钟）..." >&2
  local out=$($PNPM exec vitest run --coverage 2>&1 | grep "All files" | head -1)
  log "覆盖输出: $out" >&2
  echo "$out" | awk '{print $4}' | tr -d '%'
}

start_claude() {
  local current=$1 batch=$2
  log "🗡️  Claude Code 第${batch}批启动（复杂 Vue 组件）..."
  nohup bash -c "
cd $REPO
$CLAUDE_BIN --dangerously-skip-permissions \
  --output-format stream-json --verbose --max-turns 80 \
  -p '当前 lines 覆盖率 ${current}%，目标 37%。

补 src 里 0% 覆盖的小 Vue 组件（行数 < 100），优先：
- src/components/CustomUI/ 
- src/views/introduce/
- src/views/web/（小组件）
- src/layout/components/（小组件）
- src/views/home/

每个组件 4-6 个 vitest 用例，mount + 基础断言，mock router/store/i18n。
跳过 stories/ e2e/ node_modules。

完成后：
1. $PNPM exec vitest run 确认 0 failed
2. 更新 .env.production .env.staging VITE_DEV_DATE=\$(date +%Y%m%d%H%M) VITE_DEV_LETTER=A
3. git add -A && git commit --no-verify -m \"test: claude batch${batch} vue-component coverage\" && git push origin openclaw/improvements
输出 DONE' 2>&1
" >> $LOG 2>&1 &
  log "Claude Code PID: $!"
}

start_codex() {
  local current=$1 batch=$2
  log "🗡️  Codex 第${batch}批启动（API/utils + 阈值）..."
  tmux kill-session -t codex-auto 2>/dev/null; sleep 1
  tmux new-session -d -s codex-auto -x 220 -y 50
  tmux send-keys -t codex-auto "cd $REPO && codex exec --full-auto '当前覆盖率 ${current}%，目标 37%。

两个任务（与 Claude Code 不重叠，Claude 负责 Vue 组件）：

1. 找 src/api/ src/utils/ src/helpers/ src/services/ 下还没测试的 .ts 文件（非 types/ 非 index.ts 非 model.ts），各补 5-8 个 vitest 测试

2. 查 vitest.config.ts 的 thresholds，如果当前覆盖率（${current}%）比 lines 阈值高 2% 以上，把 lines 提高 2，functions 提高 2

完成后更新 VITE_DEV_DATE=当前时间（YYYYMMDDHHMM），git add -A && git commit --no-verify -m \"test: codex batch${batch} api+threshold\" && git push origin openclaw/improvements && echo DONE' 2>&1 | tee /tmp/codex-auto-${batch}.log" Enter
  log "Codex 已启动 tmux:codex-auto"
}

# ===== 主循环 =====
main() {
  > $LOG
  log "=== 双剑自动化覆盖率提升 START ==="
  notify "🚀 双剑自动化启动！目标 lines 37%，最多 5 轮"

  TARGET=37
  MAX_ROUNDS=5
  round=0

  # 等当前已跑的 Claude Code 结束
  wait_claude

  while [ $round -lt $MAX_ROUNDS ]; do
    round=$((round+1))
    log "====== 第 ${round} 轮 ======"

    # 合并 → develop
    merge_to_develop

    # 等 CI
    ci=$(wait_ci)
    log "CI: $ci"
    if [ "$ci" != "success" ]; then
      notify "❌ 第${round}轮 CI 失败！自动化停止，请人工处理"
      exit 1
    fi
    notify "✅ 第${round}轮 CI 绿，测量覆盖率..."

    # 测覆盖率
    lines=$(get_coverage)
    log "覆盖率: ${lines}%"
    notify "📊 第${round}轮：lines=${lines}% (目标${TARGET}%)"

    # 达标？
    if awk "BEGIN {exit !($lines+0 >= $TARGET+0)}"; then
      log "🎉 目标达成 lines=${lines}%"
      notify "🎉 覆盖率目标达成！lines=${lines}% >= ${TARGET}%"
      exit 0
    fi

    # 双剑并行出发
    start_claude "$lines" "$round"
    start_codex  "$lines" "$round"

    # 等两把剑都完成
    sleep 60
    wait_claude
    wait_codex
  done

  lines=$(get_coverage)
  notify "🏁 自动化完成（${MAX_ROUNDS}轮），最终覆盖率 lines=${lines}%"
  log "=== 完成 ==="
}

main "$@"
