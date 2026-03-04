#!/usr/bin/env python3
"""
Claude SDK Client - 高级用法模板
支持自定义工具、Hooks、双向会话

用法:
    python3 claude_client.py "你的提示词"
    python3 claude_client.py --with-tools "检查部署状态然后review代码"
"""

import anyio
import argparse
import json
import sys
from pathlib import Path

from claude_agent_sdk import (
    tool,
    create_sdk_mcp_server,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    HookMatcher,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
)


# ============================================================
# 自定义工具 - 根据你的业务需求添加
# ============================================================

@tool("get_project_info", "获取项目信息和配置", {})
async def get_project_info(args):
    """返回项目的基本信息"""
    info = {
        "name": "vue3.7dgame.com",
        "stack": "Vue 3 + Vite + TypeScript + Element Plus + Pinia",
        "package_manager": "pnpm",
        "node_version": "18+",
        "domains": "多域名白标平台",
    }
    return {
        "content": [{"type": "text", "text": json.dumps(info, ensure_ascii=False, indent=2)}]
    }


@tool("check_service_status", "检查服务运行状态", {"service": str})
async def check_service_status(args):
    """检查指定服务的状态"""
    import subprocess
    service = args["service"]
    try:
        result = subprocess.run(
            ["systemctl", "is-active", service],
            capture_output=True, text=True, timeout=5
        )
        status = result.stdout.strip()
    except Exception as e:
        status = f"error: {e}"
    return {
        "content": [{"type": "text", "text": f"服务 {service} 状态: {status}"}]
    }


@tool("run_pnpm_script", "运行 pnpm 脚本命令", {"script": str})
async def run_pnpm_script(args):
    """运行项目的 pnpm 脚本"""
    import subprocess
    script = args["script"]
    # 安全检查
    allowed = ["lint", "type-check", "build", "test"]
    if script not in allowed:
        return {
            "content": [{"type": "text", "text": f"❌ 不允许的脚本: {script}，允许: {allowed}"}]
        }
    try:
        result = subprocess.run(
            ["pnpm", "run", script],
            capture_output=True, text=True, timeout=120,
            cwd=str(Path.home() / "projects" / "vue3.7dgame.com")
        )
        output = result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout
        if result.returncode != 0:
            output += f"\n\nSTDERR:\n{result.stderr[-1000:]}"
        return {
            "content": [{"type": "text", "text": f"pnpm {script} (exit={result.returncode}):\n{output}"}]
        }
    except subprocess.TimeoutExpired:
        return {"content": [{"type": "text", "text": f"⏰ pnpm {script} 超时(120s)"}]}


# ============================================================
# Hooks - 安全拦截
# ============================================================

# 危险命令黑名单
BLOCKED_PATTERNS = [
    "rm -rf /",
    "rm -rf ~",
    "drop database",
    "DROP TABLE",
    "> /dev/sda",
    "mkfs",
    "dd if=",
    ":(){:|:&};:",
]


async def safety_hook(input_data, tool_use_id, context):
    """拦截危险的 Bash 命令"""
    if input_data.get("tool_name") != "Bash":
        return {}

    command = input_data.get("tool_input", {}).get("command", "")
    for pattern in BLOCKED_PATTERNS:
        if pattern.lower() in command.lower():
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"🚫 安全拦截: 命令包含危险模式 '{pattern}'",
                }
            }
    return {}


# ============================================================
# 创建 MCP Server
# ============================================================

def create_tools_server():
    return create_sdk_mcp_server(
        name="project-tools",
        version="1.0.0",
        tools=[get_project_info, check_service_status, run_pnpm_script],
    )


# ============================================================
# 主逻辑
# ============================================================

async def run_with_tools(prompt: str, cwd: str = None):
    """使用自定义工具和 Hooks 运行"""
    server = create_tools_server()

    options = ClaudeAgentOptions(
        cwd=cwd or str(Path.home() / "projects" / "vue3.7dgame.com"),
        system_prompt=(
            "你是 vue3.7dgame.com 项目的专属开发助手。"
            "精通 Vue 3 + TypeScript + Element Plus + Pinia。"
            "你可以使用自定义工具获取项目信息、检查服务状态、运行 pnpm 脚本。"
            "用中文回答。"
        ),
        max_turns=30,
        mcp_servers={"tools": server},
        allowed_tools=[
            "Read", "Write", "Edit", "Glob", "Grep", "Bash",
            "mcp__tools__get_project_info",
            "mcp__tools__check_service_status",
            "mcp__tools__run_pnpm_script",
        ],
        permission_mode="acceptEdits",
        hooks={
            "PreToolUse": [
                HookMatcher(matcher="Bash", hooks=[safety_hook]),
            ],
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)
        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        print(block.text)
                    elif isinstance(block, ToolUseBlock):
                        print(f"  🔧 [{block.name}] {json.dumps(block.input, ensure_ascii=False)[:200]}")


async def run_simple(prompt: str, cwd: str = None):
    """简单模式 - 不带自定义工具"""
    from claude_agent_sdk import query

    options = ClaudeAgentOptions(
        cwd=cwd or str(Path.home() / "projects" / "vue3.7dgame.com"),
        max_turns=20,
        system_prompt="你是一个资深 Vue 3 开发者。用中文回答。",
    )

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(block.text)


def main():
    parser = argparse.ArgumentParser(description="Claude SDK Client (高级)")
    parser.add_argument("prompt", help="提示词")
    parser.add_argument("--with-tools", "-t", action="store_true",
                        help="启用自定义工具和安全 Hooks")
    parser.add_argument("--cwd", default=None, help="工作目录")

    args = parser.parse_args()

    if args.with_tools:
        anyio.run(run_with_tools, args.prompt, args.cwd)
    else:
        anyio.run(run_simple, args.prompt, args.cwd)


if __name__ == "__main__":
    main()
