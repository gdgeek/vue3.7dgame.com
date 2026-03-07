#!/bin/bash
CHANGED=$(git diff HEAD~3 --name-only | grep -E "\.(ts|vue)$" | head -20)
if [ -z "$CHANGED" ]; then echo "没有改动文件"; exit 0; fi
echo "Review 文件：$CHANGED"
codex exec --full-auto "只 Review 这些文件的代码质量和潜在问题：
$CHANGED
每个问题：**[类别] 文件:行号** 问题+建议
最后评分(/100)和Top3问题。结果保存到 /tmp/review-$(date +%Y%m%d).md"
