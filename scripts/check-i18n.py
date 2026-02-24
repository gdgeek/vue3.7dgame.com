#!/usr/bin/env python3
"""
i18n Consistency Checker
Scans source files for t()/\$t() key usages and validates them
against the zh-CN lang files. Reports missing and unused keys.
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, Set, List, Tuple

ROOT = Path(__file__).parent.parent
LANG_DIR = ROOT / "src" / "lang" / "zh-CN"
SRC_DIR = ROOT / "src"

# ─────────────────────────────────────────────
# 1. Parse lang files → flat dict of all keys
# ─────────────────────────────────────────────

def extract_keys_from_ts(content: str, prefix: str = "") -> Dict[str, str]:
    """
    Recursively extract keys from a TypeScript object literal.
    Returns a flat dict like {"common.confirm": "确认", ...}
    """
    # Remove line comments
    content = re.sub(r'//.*', '', content)
    # Remove block comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

    results: Dict[str, str] = {}
    _parse_object_body(content, prefix, results)
    return results


def _find_matching_brace(text: str, start: int) -> int:
    """Find the index of the closing brace matching the open brace at start."""
    depth = 0
    i = start
    in_string = False
    string_char = ''
    while i < len(text):
        c = text[i]
        if in_string:
            if c == '\\':
                i += 2
                continue
            if c == string_char:
                in_string = False
        else:
            if c in ('"', "'", '`'):
                in_string = True
                string_char = c
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1


def _parse_object_body(text: str, prefix: str, results: Dict[str, str]):
    """
    Parse the body of a TS/JS object literal (without outer braces).
    Fills results with flattened key paths.
    """
    # Match key: value pairs
    # Keys can be quoted or unquoted identifiers
    # Also support inline/single-line objects: { key1: v, key2: v }
    key_pat = re.compile(
        r'''(?:^|[\n,{])\s*(?:"([^"]+)"|'([^']+)'|([a-zA-Z_$][a-zA-Z0-9_$]*))\s*:(?!:)''',
        re.MULTILINE
    )

    i = 0
    while i < len(text):
        m = key_pat.search(text, i)
        if not m:
            break

        key = m.group(1) or m.group(2) or m.group(3)
        full_key = f"{prefix}.{key}" if prefix else key
        after_colon = m.end()

        # Skip whitespace after colon
        j = after_colon
        while j < len(text) and text[j] in (' ', '\t', '\n', '\r'):
            j += 1

        if j >= len(text):
            i = after_colon
            continue

        if text[j] == '{':
            # Nested object
            end = _find_matching_brace(text, j)
            if end == -1:
                i = after_colon
                continue
            inner = text[j+1:end]
            _parse_object_body(inner, full_key, results)
            i = end + 1
        else:
            # Scalar value (string, number, etc.)
            # Extract to end of line or until comma
            val_end = j
            in_str = False
            str_char = ''
            while val_end < len(text):
                c = text[val_end]
                if in_str:
                    if c == '\\':
                        val_end += 2
                        continue
                    if c == str_char:
                        in_str = False
                elif c in ('"', "'", '`'):
                    in_str = True
                    str_char = c
                elif c in (',', '\n') and not in_str:
                    break
                val_end += 1

            value = text[j:val_end].strip().strip('"\'`')
            results[full_key] = value
            # Keep the delimiter (,/\n) so the next key_pat search can match it
            i = val_end


def load_lang_keys() -> Dict[str, str]:
    """Load all keys from zh-CN lang directory."""
    all_keys: Dict[str, str] = {}
    for ts_file in sorted(LANG_DIR.glob("*.ts")):
        if ts_file.name == "index.ts":
            continue
        content = ts_file.read_text(encoding="utf-8")
        # Strip the `export default {` wrapper
        m = re.search(r'export\s+default\s*\{', content)
        if not m:
            continue
        body_start = m.end()
        end = _find_matching_brace(content, m.end() - 1)
        if end == -1:
            continue
        body = content[body_start:end]
        keys = _parse_object_body(body, "", {})
        # Inline call since _parse_object_body modifies results in place
        inner_keys: Dict[str, str] = {}
        _parse_object_body(body, "", inner_keys)
        all_keys.update(inner_keys)
        # Also try extract_keys_from_ts for robustness
        more = extract_keys_from_ts(body)
        all_keys.update(more)
    return all_keys


def load_lang_keys_v2() -> Set[str]:
    """More robust: recursively flatten all nested keys from lang files."""
    all_keys: Set[str] = set()
    for ts_file in sorted(LANG_DIR.glob("*.ts")):
        if ts_file.name == "index.ts":
            continue
        content = ts_file.read_text(encoding="utf-8")
        keys = extract_keys_from_ts(content)
        all_keys.update(keys.keys())
    return all_keys


# ─────────────────────────────────────────────
# 2. Scan source files → all t() key usages
# ─────────────────────────────────────────────

# Patterns for t('key'), $t('key'), t("key"), $t("key")
# Also tc(), te(), tm()
T_PATTERN = re.compile(
    r'(?<!\w)(?:\$t|tc?|te|tm)\(\s*["\']([^"\']+)["\']'
)
# Dynamic keys like t(`prefix.${var}`) — capture prefix
T_DYNAMIC = re.compile(
    r'(?<!\w)(?:\$t|tc?|te|tm)\(\s*`([^`]*)\$\{'
)
# Dynamic keys via string concatenation: t("prefix." + var) or i18n.global.te("prefix." + var)
T_DYNAMIC_CONCAT = re.compile(
    r'''(?:t|te|tm|tc)\(['"]([\w.]+\.)['"] *\+'''
)
# i18n key prefixes passed as downloadResource() argument (e.g. "audio.view.download")
# Matches standalone quoted strings that look like i18n translation prefixes for download/view helpers
T_I18N_PREFIX_ARG = re.compile(
    r'''["']([a-z]\w+\.view\.(?:download|confirm|info|namePrompt))["']'''
)

SKIP_DIRS = {
    "node_modules", ".git", "dist", "dist-staging",
    "coverage", ".vite", "storybook-static",
}
SKIP_EXTS = {".spec.ts", ".test.ts", ".d.ts"}

SOURCE_DIRS = [
    ROOT / "src",
]


def should_skip(path: Path) -> bool:
    for part in path.parts:
        if part in SKIP_DIRS:
            return True
    name = path.name
    for ext in SKIP_EXTS:
        if name.endswith(ext):
            return True
    return False


def scan_source_files() -> Tuple[Set[str], Set[str], Dict[str, List[str]]]:
    """
    Returns:
      - static_keys: all literal key strings found in t() calls
      - dynamic_prefixes: prefixes of dynamic t() calls
      - key_locations: key -> list of "file:line" strings
    """
    static_keys: Set[str] = set()
    dynamic_prefixes: Set[str] = set()
    key_locations: Dict[str, List[str]] = {}

    for src_dir in SOURCE_DIRS:
        for ext in ("**/*.ts", "**/*.vue", "**/*.tsx"):
            for fpath in src_dir.glob(ext):
                if should_skip(fpath):
                    continue
                try:
                    content = fpath.read_text(encoding="utf-8")
                except Exception:
                    continue

                rel = str(fpath.relative_to(ROOT))
                lines = content.splitlines()

                for i, line in enumerate(lines, 1):
                    for m in T_PATTERN.finditer(line):
                        key = m.group(1)
                        static_keys.add(key)
                        key_locations.setdefault(key, []).append(f"{rel}:{i}")

                    for m in T_DYNAMIC.finditer(line):
                        prefix = m.group(1).rstrip('.')
                        if prefix:
                            dynamic_prefixes.add(prefix)

                    for m in T_DYNAMIC_CONCAT.finditer(line):
                        prefix = m.group(1).rstrip('.')
                        if prefix:
                            dynamic_prefixes.add(prefix)

                    for m in T_I18N_PREFIX_ARG.finditer(line):
                        prefix = m.group(1)
                        if prefix:
                            dynamic_prefixes.add(prefix)

    return static_keys, dynamic_prefixes, key_locations


# ─────────────────────────────────────────────
# 3. Compare and report
# ─────────────────────────────────────────────

def check_key_exists(key: str, lang_keys: Set[str]) -> bool:
    """Check if key exists in lang_keys (exact or prefix match for nested)."""
    return key in lang_keys


def main():
    print("Loading zh-CN lang keys...")
    lang_keys = load_lang_keys_v2()
    print(f"  Found {len(lang_keys)} defined keys\n")

    print("Scanning source files for t() usages...")
    static_keys, dynamic_prefixes, key_locations = scan_source_files()
    print(f"  Found {len(static_keys)} static keys used")
    print(f"  Found {len(dynamic_prefixes)} dynamic key prefixes\n")

    # Missing: used in code but not in lang
    missing: List[str] = sorted(
        k for k in static_keys
        if not check_key_exists(k, lang_keys)
        and not k.endswith('.')  # Skip dynamic prefix false-positives (e.g. "route." + var)
    )

    # Unused: defined in lang but never used in code
    # Note: some keys are used dynamically, so this list may have false positives
    unused: List[str] = sorted(
        k for k in lang_keys
        if k not in static_keys
        and not any(k.startswith(dp) for dp in dynamic_prefixes)
    )

    # ── Print missing keys ──
    print("=" * 60)
    print(f"MISSING KEYS ({len(missing)}) — used in code, not in zh-CN:")
    print("=" * 60)
    if missing:
        for key in missing:
            locations = key_locations.get(key, [])
            loc_str = locations[0] if locations else "?"
            extra = f" (+{len(locations)-1} more)" if len(locations) > 1 else ""
            print(f"  ✗ {key}")
            print(f"      → {loc_str}{extra}")
    else:
        print("  ✓ None! All static keys are defined.")

    print()
    print("=" * 60)
    print(f"UNUSED KEYS ({len(unused)}) — defined in zh-CN, never used:")
    print("=" * 60)
    if unused:
        # Group by top-level namespace
        namespaces: Dict[str, List[str]] = {}
        for key in unused:
            ns = key.split('.')[0]
            namespaces.setdefault(ns, []).append(key)
        for ns, keys in sorted(namespaces.items()):
            print(f"\n  [{ns}] ({len(keys)} unused keys)")
            for k in keys[:5]:
                print(f"    - {k}")
            if len(keys) > 5:
                print(f"    ... and {len(keys) - 5} more")
    else:
        print("  ✓ None! All lang keys are used.")

    print()
    print("=" * 60)
    print(f"DYNAMIC PREFIXES ({len(dynamic_prefixes)}) — may cover some 'unused' keys:")
    print("=" * 60)
    for p in sorted(dynamic_prefixes)[:20]:
        print(f"  ~ {p}.*")
    if len(dynamic_prefixes) > 20:
        print(f"  ... and {len(dynamic_prefixes) - 20} more")

    print()
    print("Summary:")
    print(f"  Lang keys defined : {len(lang_keys)}")
    print(f"  Static usages     : {len(static_keys)}")
    print(f"  Missing keys      : {len(missing)}")
    print(f"  Potentially unused: {len(unused)}")

    # Write machine-readable report
    report_path = ROOT / "scripts" / "i18n-report.json"
    import json
    report = {
        "missing": {k: key_locations.get(k, []) for k in missing},
        "unused": unused,
        "dynamic_prefixes": sorted(dynamic_prefixes),
        "stats": {
            "lang_keys": len(lang_keys),
            "static_usages": len(static_keys),
            "missing": len(missing),
            "unused": len(unused),
        }
    }
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nFull report written to: scripts/i18n-report.json")

    return len(missing)


if __name__ == "__main__":
    sys.exit(main())
