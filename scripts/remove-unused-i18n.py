#!/usr/bin/env python3
"""
Remove unused i18n keys from locale TypeScript files.
Reads i18n-report.json and removes all listed unused keys from the locale .ts files.

Algorithm:
- Parse TypeScript object structure using brace-matching
- Navigate to nested key path
- Remove the key-value pair (including trailing comma and newline)
- Clean up empty objects
- Fix trailing comma issues
"""

import json
import os
import re
import sys
from pathlib import Path

BASE_DIR = Path("/home/user/vue3.7dgame.com")
LANG_DIR = BASE_DIR / "src" / "lang"
REPORT_FILE = BASE_DIR / "scripts" / "i18n-report.json"

LOCALES = ["zh-CN", "zh-TW", "en-US", "ja-JP", "th-TH"]

PREFIX_TO_FILE = {
    "meta": "meta.ts",
    "ai": "meta.ts",
    "verse": "verse.ts",
    "manager": "manager.ts",
    "passwordPolicy": "manager.ts",
    "navbar": "manager.ts",
    "errors": "manager.ts",
    "game": "manager.ts",
    "campus": "campus.ts",
    "homepage": "homepage.ts",
    "emailVerification": "homepage.ts",
    "common": "common.ts",
    "ui": "common.ts",
    "breadcrumb": "common.ts",
    "tts": "common.ts",
    "login": "login.ts",
    "phototype": "route.ts",
}


def find_matching_brace(content, start):
    """Find the matching closing brace for the opening brace at `start`."""
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


def find_key_entry(content, obj_open, obj_close, key):
    """
    Find a key-value pair inside an object (obj_open='{' pos, obj_close='}' pos).
    
    Returns (line_start, line_end) where:
    - line_start: position of the first character of the key's line (first indent char, NOT the preceding '\n')
    - line_end: position AFTER the trailing newline of the value
    
    Returns None if not found.
    """
    search_area = content[obj_open:obj_close]
    
    # Pattern: newline + optional whitespace + key + optional whitespace + colon (not ::)
    # We capture the position of the '\n' so we know where the line starts
    patterns = [
        rf'\n([ \t]*)({re.escape(key)})([ \t]*:(?!:))',
        rf'\n([ \t]*)("{re.escape(key)}")([ \t]*:(?!:))',
        rf"\n([ \t]*)('{re.escape(key)}')([ \t]*:(?!:))",
    ]
    
    for pattern in patterns:
        for m in re.finditer(pattern, search_area):
            # m.start() is the position of '\n' in search_area
            # The key line itself starts at m.start()+1 (after '\n')
            line_start_in_search = m.start() + 1  # skip the '\n'
            line_start = obj_open + line_start_in_search
            
            colon_end = obj_open + m.end()
            
            # Skip whitespace after colon
            pos = colon_end
            while pos < obj_close and content[pos] in (' ', '\t'):
                pos += 1
            
            if pos >= obj_close:
                continue
            
            if content[pos] == '{':
                # Object value: find matching brace
                close_brace = find_matching_brace(content, pos)
                if close_brace == -1:
                    continue
                line_end = close_brace + 1
                # Include optional trailing comma
                if line_end < len(content) and content[line_end] == ',':
                    line_end += 1
                # Include trailing newline
                if line_end < len(content) and content[line_end] == '\n':
                    line_end += 1
                return (line_start, line_end)
            else:
                # Simple value: find end of line
                newline_pos = content.find('\n', colon_end)
                if newline_pos == -1:
                    line_end = obj_close
                else:
                    line_end = newline_pos + 1  # include the '\n'
                return (line_start, line_end)
    
    return None


def navigate_into_object(content, current_open, current_close, segment):
    """
    Navigate into a child object identified by `segment` inside the
    object at [current_open, current_close].
    Returns (child_open, child_close) where child_open is the '{' of the child.
    Returns None if not found or if the segment value is not an object.
    """
    search_area = content[current_open:current_close]
    
    patterns = [
        rf'\n([ \t]*)({re.escape(segment)})([ \t]*:(?!:))',
        rf'\n([ \t]*)("{re.escape(segment)}")([ \t]*:(?!:))',
        rf"\n([ \t]*)('{re.escape(segment)}')([ \t]*:(?!:))",
    ]
    
    for pattern in patterns:
        m = re.search(pattern, search_area)
        if m:
            colon_end = current_open + m.end()
            # Skip whitespace after ':'
            pos = colon_end
            while pos < current_close and content[pos] in (' ', '\t'):
                pos += 1
            if pos >= current_close or content[pos] != '{':
                return None
            child_close = find_matching_brace(content, pos)
            if child_close == -1:
                return None
            return (pos, child_close)
    
    return None


def navigate_to_parent(content, key_path_segments):
    """
    Navigate from the root 'export default {}' into nested objects
    following key_path_segments.
    Returns (obj_open, obj_close) of the innermost object.
    """
    export_match = re.search(r'export\s+default\s*\{', content)
    if not export_match:
        return None
    
    root_open = export_match.end() - 1  # position of '{'
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


def remove_key_from_content(content, key_path):
    """
    Remove the key at key_path from the TypeScript object.
    Returns (new_content, was_removed).
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


def clean_empty_objects(content):
    """
    Repeatedly remove keys whose object value is empty.
    An empty object body contains only whitespace.
    """
    for _ in range(30):
        # Find any object that is empty: key: { <whitespace only> }
        # The pattern covers both single-line '{   }' and multi-line '{\n  \n}'
        changed = False
        
        # Match: key: { optional_whitespace }, on multiple lines
        # We search for '{ whitespace_only }' pattern in the object
        # Then remove the entire key line (using find_key_entry logic)
        
        # Strategy: find '{' with only whitespace until '}', then find the key that owns it
        # Look for pattern: identifier/string : { \s* }
        pattern = re.compile(
            r'\n([ \t]+)([\w$]+|"[^"\n]*"|\'[^\'\\n]*\')([ \t]*:[ \t]*\{\s*\}),?'
        )
        
        new_content = pattern.sub(r'', content)
        if new_content != content:
            content = new_content
            changed = True
        
        if not changed:
            break
    
    return content


def fix_trailing_commas(content):
    """Remove trailing comma before closing braces."""
    # Comma followed by optional whitespace+newlines then closing brace
    content = re.sub(r',(\s*\n)([ \t]*\})', r'\1\2', content)
    return content


def fix_multiple_blank_lines(content):
    """Collapse 3+ consecutive newlines into 2."""
    return re.sub(r'\n{3,}', '\n\n', content)


def process_file(file_path, keys_to_remove, verbose=True):
    """Process a single locale file, removing all specified keys."""
    if not os.path.exists(file_path):
        if verbose:
            print(f"    [skip] File not found: {file_path}")
        return 0, 0
    
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
    print(f"Loading: {REPORT_FILE}")
    with open(REPORT_FILE, 'r', encoding='utf-8') as f:
        report = json.load(f)
    
    unused_keys = report.get('unused', [])
    print(f"Unused keys to remove: {len(unused_keys)}\n")
    
    # Group keys by target file
    file_keys = {}
    unmapped = []
    for key in unused_keys:
        prefix = key.split('.')[0]
        target = PREFIX_TO_FILE.get(prefix)
        if target:
            file_keys.setdefault(target, []).append(key)
        else:
            unmapped.append(key)
    
    if unmapped:
        print(f"WARNING: {len(unmapped)} unmapped keys: {unmapped[:5]}")
    
    total_removed = 0
    total_not_found = 0
    
    for locale in LOCALES:
        locale_dir = LANG_DIR / locale
        print(f"[{locale}]")
        
        if not locale_dir.exists():
            print(f"  Directory missing: {locale_dir}")
            continue
        
        for filename, keys in sorted(file_keys.items()):
            file_path = str(locale_dir / filename)
            removed, not_found = process_file(file_path, keys)
            total_removed += removed
            total_not_found += not_found
            print(f"  {filename}: removed={removed}, not_found={not_found}")
        print()
    
    print(f"Total: removed={total_removed}, not_found={total_not_found}")


if __name__ == '__main__':
    main()
