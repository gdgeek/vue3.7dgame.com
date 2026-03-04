#!/usr/bin/env python3
"""
Claude Agent SDK Runner - 替代 PTY 调用 Claude Code 的基础模板
用法:
    python3 claude_runner.py "你的提示词"
    python3 claude_runner.py --mode review "src/views/Home.vue"
    python3 claude_runner.py --mode task "重构登录模块"
    python3 claude_runner.py --json "分析项目结构"
"""

import anyio
import argparse
import json
import sys
import os
from pathlib import Path

from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AssistantMessage,
    UserMessage,
    ResultMessage,
    TextBlock,
    ToolUseBlock,
    ToolResultBlock,
)


# === 预设模式配置 ===

PRESETS = {
    "default": ClaudeAgentOptions(
        max_turns=20,
        system_prompt="你是一个资深全栈开发者，精通 Vue 3 + TypeScript + Element Plus。用中文回答。",
    ),
    "review": ClaudeAgentOptions(
        max_turns=10,
        allowed_tools=["Read", "Grep", "Glob"],
        system_prompt=(
            "你是代码审查专家。审查代码质量、安全性、性能问题。"
            "给出具体的改进建议和代码示例。用中文回答。"
        ),
    ),
    "task": ClaudeAgentOptions(
        max_turns=50,
        allowed_tools=["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
        permission_mode="acceptEdits",
        system_prompt=(
            "你是一个高效的编码助手。直接执行任务，不要过多解释。"
            "修改代码后确保没有语法错误。用中文回答。"
        ),
    ),
    "analyze": ClaudeAgentOptions(
        max_turns=10,
        allowed_tools=["Read", "Grep", "Glob"],
        system_prompt=(
            "你是项目架构分析师。分析代码结构、依赖关系、潜在问题。"
            "输出结构化的分析报告。用中文回答。"
        ),
    ),
    "fix": ClaudeAgentOptions(
        max_turns=30,
        allowed_tools=["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
        permission_mode="acceptEdits",
        system_prompt=(
            "你是 bug 修复专家。定位问题根因，给出最小改动的修复方案。"
            "修复后验证代码可以正常运行。用中文回答。"
        ),
    ),
}


async def run_query(prompt: str, mode: str = "default", output_json: bool = False, cwd: str = None):
    """执行 Claude Agent SDK 查询"""
    options = PRESETS.get(mode, PRESETS["default"])

    # 设置工作目录
    if cwd:
        options.cwd = cwd

    results = []
    tool_calls = []

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    if output_json:
                        results.append({"type": "text", "content": block.text})
                    else:
                        print(block.text)
                elif isinstance(block, ToolUseBlock):
                    tool_info = {"tool": block.name, "input": block.input}
                    tool_calls.append(tool_info)
                    if not output_json:
                        print(f"\n🔧 [{block.name}] {json.dumps(block.input, ensure_ascii=False)[:200]}")

        elif isinstance(message, ResultMessage):
            if output_json:
                results.append({
                    "type": "result",
                    "content": message.result if hasattr(message, "result") else str(message),
                })
            else:
                if hasattr(message, "result"):
                    print(f"\n✅ 完成: {str(message.result)[:500]}")

    if output_json:
        output = {
            "mode": mode,
            "prompt": prompt,
            "results": results,
            "tool_calls": tool_calls,
            "tool_call_count": len(tool_calls),
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))


async def run_interactive(mode: str = "default", cwd: str = None):
    """交互式多轮对话（不需要 PTY）"""
    options = PRESETS.get(mode, PRESETS["default"])
    if cwd:
        options.cwd = cwd

    print(f"🦞 Claude SDK 交互模式 (preset: {mode})")
    print("输入 'quit' 或 'exit' 退出\n")

    conversation = []

    while True:
        try:
            user_input = input("你> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n👋 再见")
            break

        if user_input.lower() in ("quit", "exit", "q"):
            print("👋 再见")
            break

        if not user_input:
            continue

        # 构建带上下文的 prompt
        if conversation:
            context = "\n".join(
                f"{'用户' if r == 'user' else 'Claude'}: {c}"
                for r, c in conversation[-6:]  # 保留最近3轮
            )
            full_prompt = f"之前的对话:\n{context}\n\n用户新问题: {user_input}"
        else:
            full_prompt = user_input

        conversation.append(("user", user_input))
        response_text = []

        async for message in query(prompt=full_prompt, options=options):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text)
                        response_text.append(block.text)
                    elif isinstance(block, ToolUseBlock):
                        print(f"  🔧 [{block.name}]")

        conversation.append(("assistant", " ".join(response_text)[:500]))
        print()


def main():
    parser = argparse.ArgumentParser(description="Claude Agent SDK Runner")
    parser.add_argument("prompt", nargs="?", help="提示词（交互模式下可省略）")
    parser.add_argument("--mode", "-m", default="default",
                        choices=list(PRESETS.keys()),
                        help="预设模式: default/review/task/analyze/fix")
    parser.add_argument("--json", "-j", action="store_true",
                        help="JSON 格式输出")
    parser.add_argument("--cwd", "-c", default=None,
                        help="工作目录（默认当前目录）")
    parser.add_argument("--interactive", "-i", action="store_true",
                        help="交互式多轮对话模式")

    args = parser.parse_args()

    if args.interactive:
        anyio.run(run_interactive, args.mode, args.cwd)
    elif args.prompt:
        anyio.run(run_query, args.prompt, args.mode, args.json, args.cwd)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
