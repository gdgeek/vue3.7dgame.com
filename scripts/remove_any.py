#!/usr/bin/env python3
"""Safe bulk any removal - only patterns that won't break the build."""
import re, glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content

    # 1: catch (error: any) -> catch (error)
    content = re.sub(r'catch\s*\((\w+):\s*any\)', r'catch (\1)', content)
    # 2: (error: any) => { in interceptors
    content = re.sub(r'\(error:\s*any\)\s*=>\s*\{', r'(error) => {', content)
    # 3: Promise<any> -> Promise<unknown>
    content = re.sub(r'Promise<any>', r'Promise<unknown>', content)
    # 4: timer: any = null
    content = re.sub(r'let timer:\s*any\s*=\s*null', r'let timer: ReturnType<typeof setTimeout> | null = null', content)
    # 5: ...args: any[]
    content = re.sub(r'\.\.\.args:\s*any\[\]', r'...args: unknown[]', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

files = []
for ext in ['*.ts', '*.vue']:
    files.extend(glob.glob(f'src/**/{ext}', recursive=True))
files = [f for f in files if '__tests__' not in f and '.spec.' not in f and not f.endswith('.d.ts')]

changed = 0
for f in sorted(files):
    if process_file(f):
        changed += 1
        print(f"  Modified: {f}")
print(f"\nTotal files modified: {changed}")
