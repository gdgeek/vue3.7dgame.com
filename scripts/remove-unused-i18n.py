#!/usr/bin/env python3
"""
Remove unused i18n keys from locale TypeScript files.

Reads i18n-report.json and removes all listed unused keys from all locale .ts files.

Algorithm:
1. For each locale, scan all .ts files to build a flat key -> file mapping
2. For each unused key, find which file it lives in for that locale
3. Remove the key using brace-matched text manipulation
4. Handle multi-line values (e.g., key:\n  "long string",)
5. Clean up empty objects that result from removal
6. Fix trailing comma issues
"""

import json
import os
import re
from pathlib import Path

BASE_DIR = Path("/home/user/vue3.7dgame.com")
LANG_DIR = BASE_DIR / "src" / "lang"
REPORT_FILE = BASE_DIR / "scripts" / "i18n-report.json"

LOCALES = ["zh-CN", "zh-TW", "en-US", "ja-JP", "th-TH"]


# ─────────────────────────────────────────────────────────────
# Brace matching
# ─────────────────────────────────────────────────────────────

def find_matching_brace(content, start):
    """Find the closing '}' matching the '{' at position `start`."""
    depth = 0
    i = start
    in_string = False
    string_char = None
    while i < len(content):
        ch = content[i]
        if in_string:
            if ch == '\\':
                i += 2
                continue
            if ch == string_char:
                in_string = False
        else:
            if ch in ('"', "'", '`'):
                in_string = True
                string_char = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1


# ─────────────────────────────────────────────────────────────
# Key extraction (for building key->file map)
# ─────────────────────────────────────────────────────────────

def _parse_object_body(text, prefix, results):
    """Recursively extract flat key paths from an object body."""
    key_pat = re.compile(
        r'''(?:^|[\n,{])\s*(?:"([^"]+)"|'([^']+)'|([a-zA-Z_$][a-zA-Z0-9_$]*))\s*:(?!:)''',
        re.MULTILINE,
    )
    i = 0
    while i < len(text):
        m = key_pat.search(text, i)
        if not m:
            break
        key = m.group(1) or m.group(2) or m.group(3)
        full_key = f"{prefix}.{key}" if prefix else key
        after_colon = m.end()
        j = after_colon
        while j < len(text) and text[j] in (' ', '\t', '\n', '\r'):
            j += 1
        if j >= len(text):
            i = after_colon
            continue
        if text[j] == '{':
            end = find_matching_brace(text, j)
            if end == -1:
                i = after_colon
                continue
            _parse_object_body(text[j + 1:end], full_key, results)
            i = end + 1
        else:
            results[full_key] = True
            i = after_colon


def extract_keys_from_content(content):
    """Return a set of flat key paths defined in a TS export default {} block."""
    content = re.sub(r'//[^\n]*', '', content)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    results = {}
    _parse_object_body(content, '', results)
    return set(results.keys())


def build_key_to_file_map(locale_dir):
    """
    Scan all .ts files in locale_dir and return {flat_key: filename}.
    Only processes files that are not index.ts.
    """
    key_to_file = {}
    for ts_file in sorted(locale_dir.glob('*.ts')):
        if ts_file.name == 'index.ts':
            continue
        content = ts_file.read_text(encoding='utf-8')
        keys = extract_keys_from_content(content)
        for k in keys:
            key_to_file[k] = ts_file.name
    return key_to_file


# ─────────────────────────────────────────────────────────────
# Navigation (finding the parent object at a key path)
# ─────────────────────────────────────────────────────────────

def navigate_into_object(content, current_open, current_close, segment):
    """
    Navigate one level into the object at [current_open, current_close].
    Finds `segment` as an immediate direct child (with an object value) and returns
    (child_open, child_close) where child_open is the '{'.
    
    Uses shallowest-indent heuristic to avoid matching nested same-name keys.
    Returns None if not found or if the value is not an object.
    """
    search_area = content[current_open:current_close]

    patterns = [
        rf'\n([ \t]*)({re.escape(segment)})([ \t]*:(?!:))',
        rf'\n([ \t]*)("{re.escape(segment)}")([ \t]*:(?!:))',
        rf"\n([ \t]*)('{re.escape(segment)}')([ \t]*:(?!:))",
    ]

    candidates = []
    for pattern in patterns:
        for m in re.finditer(pattern, search_area):
            candidates.append((len(m.group(1)), m))

    if not candidates:
        return None

    # Sort by indent level ascending - shallowest is most likely direct child
    candidates.sort(key=lambda x: x[0])

    for indent_len, m in candidates:
        colon_end = current_open + m.end()
        pos = colon_end
        while pos < current_close and content[pos] in (' ', '\t'):
            pos += 1
        if pos >= current_close or content[pos] != '{':
            continue
        child_close = find_matching_brace(content, pos)
        if child_close == -1:
            continue
        return (pos, child_close)

    return None


def navigate_to_parent(content, key_path_segments):
    """
    Navigate from the root 'export default {}' into nested objects
    following key_path_segments.
    Returns (obj_open, obj_close) or None.
    """
    export_match = re.search(r'export\s+default\s*\{', content)
    if not export_match:
        return None
    root_open = export_match.end() - 1
    root_close = find_matching_brace(content, root_open)
    if root_close == -1:
        return None

    current_open = root_open
    current_close = root_close

    for segment in key_path_segments:
        result = navigate_into_object(content, current_open, current_close, segment)
        if result is None:
            return None
        current_open, current_close = result

    return (current_open, current_close)


# ─────────────────────────────────────────────────────────────
# Key removal
# ─────────────────────────────────────────────────────────────

def find_key_entry(content, obj_open, obj_close, key):
    """
    Find the key-value pair for `key` as a direct child of the object at
    [obj_open, obj_close].

    Returns (line_start, line_end) where:
    - line_start: position of first indent character (after the preceding '\\n')
    - line_end: position after the last character of the entry (including trailing '\\n')

    Handles:
    - Single-line values:  key: "value",
    - Object values:       key: { ... },
    - Multi-line values:   key:\\n  "long value",

    Uses shallowest-indent heuristic to avoid matching nested same-name keys.
    """
    search_area = content[obj_open:obj_close]

    patterns = [
        rf'\n([ \t]*)({re.escape(key)})([ \t]*:(?!:))',
        rf'\n([ \t]*)("{re.escape(key)}")([ \t]*:(?!:))',
        rf"\n([ \t]*)('{re.escape(key)}')([ \t]*:(?!:))",
    ]

    candidates = []
    for pattern in patterns:
        for m in re.finditer(pattern, search_area):
            candidates.append((len(m.group(1)), m))

    if not candidates:
        return None

    candidates.sort(key=lambda x: x[0])
    key_indent = candidates[0][0]  # indent level of the shallowest match

    for indent_len, m in candidates:
        line_start = obj_open + m.start() + 1  # skip leading '\n'
        colon_end = obj_open + m.end()

        # Skip horizontal whitespace after colon
        pos = colon_end
        while pos < obj_close and content[pos] in (' ', '\t'):
            pos += 1

        if pos >= obj_close:
            continue

        if content[pos] == '{':
            # Object value: remove the entire key: { ... } block
            close_brace = find_matching_brace(content, pos)
            if close_brace == -1:
                continue
            line_end = close_brace + 1
            if line_end < len(content) and content[line_end] == ',':
                line_end += 1
            if line_end < len(content) and content[line_end] == '\n':
                line_end += 1
            return (line_start, line_end)

        elif content[pos] == '\n':
            # Multi-line value: key:\n  "value",
            # The value starts on the next line (or lines).
            # Include all continuation lines: lines with MORE indent than key.
            # Stop when we reach a line with <= key indent (next key or closing brace).
            line_end = pos + 1  # start after the '\n'
            while line_end < obj_close:
                # Find end of current continuation line
                next_nl = content.find('\n', line_end)
                if next_nl == -1:
                    line_end = obj_close
                    break
                line_content = content[line_end:next_nl]
                # Measure indent of this line
                stripped = line_content.lstrip(' \t')
                line_this_indent = len(line_content) - len(stripped)
                # If this line is blank or has MORE indent, it's a continuation
                if len(stripped) == 0:
                    # Blank line - end of value
                    line_end = next_nl + 1
                    break
                elif line_this_indent > indent_len:
                    # Continuation line - include it
                    line_end = next_nl + 1
                else:
                    # Same or lesser indent - stop here (don't include this line)
                    break
            return (line_start, line_end)

        else:
            # Single-line value: key: "value",  or  key: value,
            newline_pos = content.find('\n', colon_end)
            if newline_pos == -1:
                line_end = obj_close
            else:
                line_end = newline_pos + 1  # include '\n'
            return (line_start, line_end)

    return None


def remove_key_from_content(content, key_path):
    """
    Remove the key at key_path (list of strings) from the TS object content.
    Returns (new_content, was_removed: bool).
    """
    if not key_path:
        return content, False

    parent_path = key_path[:-1]
    final_key = key_path[-1]

    obj = navigate_to_parent(content, parent_path)
    if obj is None:
        return content, False

    obj_open, obj_close = obj
    entry = find_key_entry(content, obj_open, obj_close, final_key)
    if entry is None:
        return content, False

    line_start, line_end = entry
    new_content = content[:line_start] + content[line_end:]
    return new_content, True


# ─────────────────────────────────────────────────────────────
# Post-processing cleanup
# ─────────────────────────────────────────────────────────────

def clean_empty_objects(content):
    """
    Iteratively remove keys whose value is an empty object `{}`.
    Handles both single-line and multi-line empty objects.
    """
    for _ in range(30):
        pattern = re.compile(
            r'\n[ \t]+(?:[\w$]+|"[^"\n]*"|\'[^\'\\n]*\')[ \t]*:[ \t]*\{[ \t\n]*\},?'
        )
        new_content = pattern.sub('', content)
        if new_content == content:
            break
        content = new_content
    return content


def fix_trailing_commas(content):
    """Remove trailing commas before closing braces."""
    return re.sub(r',(\s*\n)([ \t]*\})', r'\1\2', content)


def fix_multiple_blank_lines(content):
    """Collapse 3+ consecutive newlines to 2."""
    return re.sub(r'\n{3,}', '\n\n', content)


# ─────────────────────────────────────────────────────────────
# File processing
# ─────────────────────────────────────────────────────────────

def process_file(file_path, keys_to_remove):
    """
    Remove all specified keys from a single TypeScript locale file.
    Returns (removed_count, not_found_count).
    """
    if not os.path.exists(file_path):
        return 0, len(keys_to_remove)

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    removed = 0
    not_found = 0

    for key in keys_to_remove:
        key_path = key.split('.')
        new_content, was_removed = remove_key_from_content(content, key_path)
        if was_removed:
            content = new_content
            removed += 1
        else:
            not_found += 1

    if content != original:
        content = clean_empty_objects(content)
        content = fix_trailing_commas(content)
        content = fix_multiple_blank_lines(content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return removed, not_found


def main():
    print(f"Reading: {REPORT_FILE}")
    with open(REPORT_FILE, 'r', encoding='utf-8') as f:
        report = json.load(f)

    unused_keys = report.get('unused', [])
    print(f"Unused keys in report: {len(unused_keys)}\n")

    total_removed = 0
    total_not_found = 0
    total_already_gone = 0

    for locale in LOCALES:
        locale_dir = LANG_DIR / locale
        print(f"[{locale}]")

        if not locale_dir.exists():
            print(f"  Skipping: directory not found\n")
            continue

        # Build flat key -> filename map for this locale
        key_to_file = build_key_to_file_map(locale_dir)

        # Group unused keys by file for this locale
        file_keys = {}
        already_gone = []
        for key in unused_keys:
            if key in key_to_file:
                file_keys.setdefault(key_to_file[key], []).append(key)
            else:
                already_gone.append(key)

        if already_gone:
            print(f"  Already removed (not in this locale): {len(already_gone)}")
            total_already_gone += len(already_gone)

        for filename, keys in sorted(file_keys.items()):
            file_path = str(locale_dir / filename)
            removed, not_found = process_file(file_path, keys)
            total_removed += removed
            total_not_found += not_found
            print(f"  {filename}: removed={removed}, not_found={not_found}")

        print()

    print(f"Summary:")
    print(f"  Removed       : {total_removed}")
    print(f"  Not found     : {total_not_found}")
    print(f"  Already gone  : {total_already_gone}")


if __name__ == '__main__':
    main()
