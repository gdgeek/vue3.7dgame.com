---
name: "chrome-devtools"
displayName: "Chrome DevTools"
description: "Control Chrome browser via DevTools Protocol — navigate pages, click elements, type text, take screenshots, and run JavaScript in real browser sessions."
keywords: ["chrome", "browser", "devtools", "screenshot", "automation"]
author: "dirui"
---

# Chrome DevTools

## Overview

This power connects to a running Chrome browser via the Chrome DevTools Protocol (CDP). It allows you to navigate to URLs, interact with page elements (click, type), take screenshots and accessibility snapshots, execute JavaScript, and manage browser tabs — all from within Kiro.

Useful for debugging web apps, verifying deployments, testing login flows, and inspecting page state without leaving the IDE.

## Prerequisites

- Google Chrome installed and running with remote debugging enabled
- Launch Chrome with: `open -a "Google Chrome" --args --remote-debugging-port=9222`
- Or from terminal: `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222`

## Common Workflows

### Navigate and Inspect a Page

1. Use `list_pages` to see open tabs
2. Use `navigate_page` to go to a URL
3. Use `take_snapshot` to get an accessibility tree of the page
4. Use `take_screenshot` to capture a visual screenshot

### Interact with a Page

1. Use `click` to click on elements (by accessibility label or coordinates)
2. Use `type_text` to enter text into input fields
3. Use `press_key` to simulate keyboard events (Enter, Tab, etc.)
4. Use `evaluate_script` to run arbitrary JavaScript in the page context

### Login Flow

1. Navigate to the login page
2. Click the username field and type credentials
3. Click the password field and type password
4. Click the login button or press Enter
5. Wait for navigation and take a snapshot to verify

## Tool Reference

| Tool | Description |
|------|-------------|
| `list_pages` | List all open browser tabs |
| `new_page` | Open a new tab with a URL |
| `navigate_page` | Navigate current tab to a URL |
| `click` | Click an element on the page |
| `type_text` | Type text into the focused element |
| `press_key` | Press a keyboard key |
| `take_snapshot` | Get accessibility tree snapshot |
| `take_screenshot` | Capture a screenshot of the page |
| `evaluate_script` | Execute JavaScript in the page |
| `wait_for` | Wait for a condition or timeout |

## Troubleshooting

### MCP Server Won't Connect

**Problem:** Chrome DevTools MCP can't connect to browser
**Solution:**
1. Make sure Chrome is running with `--remote-debugging-port=9222`
2. Verify by visiting `http://localhost:9222/json` in another browser
3. If port is in use, kill existing Chrome processes and restart

### Element Not Found

**Problem:** Click or type fails because element not found
**Solution:**
1. Use `take_snapshot` first to see the accessibility tree
2. Use the exact label text from the snapshot
3. Try `evaluate_script` with `document.querySelector()` as fallback

## Configuration

No additional configuration required beyond launching Chrome with remote debugging enabled. The MCP server connects automatically to `localhost:9222`.
