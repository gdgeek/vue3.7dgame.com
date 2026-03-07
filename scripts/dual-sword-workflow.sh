#!/bin/bash
set -euo pipefail

cat <<'EOF'
--- 双剑合璧工作流脚本 ---
Claude Code（复杂逻辑/测试重构）+ Codex（CI验收/小修）
EOF

# 1. Claude Code 先行
cat <<'EOF'
1. Claude Code 阶段：
   • 目标模块：useVoiceSelection、useLanguageAnalysis、useTTS（各 8-12 用例）
   • 示例命令：
     http_proxy=http://127.0.0.1:8118 https_proxy=http://127.0.0.1:8118 \
     ~/claude-sdk-env/lib/python3.12/site-packages/claude_agent_sdk/_bundled/claude \
       --dangerously-skip-permissions --max-turns 80 -p "<prompt>"
   • 结果：pnpm exec vitest run → 0 failed；git add/commit/push openclaw/improvements
EOF

# 2. Codex 接力
cat <<'EOF'
2. Codex 阶段：
   • 目标：lint、format、CI 小修（coverage、版本号、commitlint）
   • 示例命令：codex exec --full-auto 'pnpm exec vitest run && pnpm run lint'
   • 注意：在 Claude Code 任务完成后再跑，避免同时编辑同一文件。
EOF

# 3. 合并与 CI
cat <<'EOF'
3. 合并＆验证：
   • VITE_DEV_DATE、VITE_DEV_LETTER 同步到 .env.production/.env.staging
   • git commit --no-verify && git push origin openclaw/improvements
   • git checkout develop && git merge openclaw/improvements --no-ff
   • 等 develop CI（Lint & Test + Build & Push）全绿才算完成
EOF

# 4. 记录与自动化
cat <<'EOF'
4. 建议：
   • 记录流程在 MEMORY.md / HEARTBEAT.md 供后续追踪
   • 可将脚本嵌入 GitHub Actions、heartbeat 或 helper alias
   • Claude Code 用于重构/大改，Codex 主要做 QA/CI 相关
EOF

exit 0
