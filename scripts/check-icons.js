#!/usr/bin/env node
/**
 * check-icons.js
 *
 * 扫描 src/ 下所有 .vue 文件，找出在模板中直接使用但未在同文件 <script> 中
 * import 的 Element Plus 图标组件名，并报告漏导入情况。
 *
 * 用法：node scripts/check-icons.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 获取全部 EP 图标名（PascalCase）
const EP_ICONS = new Set(Object.keys(require("@element-plus/icons-vue")));

// 已知的同名自定义组件（不是图标，跳过）
const KNOWN_NON_ICON_COMPONENTS = new Set([
  "Document", // src/components/Home/Document.vue
  "Edit", // src/views/meta/Edit.vue
  "Wechat", // src/components/Account/Wechat.vue (custom)
]);

const srcDir = path.resolve(__dirname, "../src");

/** 递归收集所有 .vue 文件 */
function collectVueFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectVueFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".vue")) {
      result.push(full);
    }
  }
  return result;
}

const files = collectVueFiles(srcDir).sort();
let totalIssues = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");

  // 分离 template 和 script 区块
  const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!templateMatch) continue;

  const template = templateMatch[1];
  const script = scriptMatch ? scriptMatch[1] : "";

  // 从 script 中提取已 import 的名称（命名导入 + 默认导入）
  const importedNames = new Set();
  const namedImportRe = /import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g;
  let m;
  while ((m = namedImportRe.exec(script)) !== null) {
    for (const name of m[1].split(",")) {
      importedNames.add(
        name
          .trim()
          .split(/\s+as\s+/)[0]
          .trim()
      );
    }
  }
  const defaultImportRe = /import\s+(\w+)\s+from\s+['"][^'"]+['"]/g;
  while ((m = defaultImportRe.exec(script)) !== null) {
    importedNames.add(m[1]);
  }

  // 从 template 中找所有 PascalCase 组件名（<Foo 或 </Foo）
  const usedComponents = new Set();
  const componentRe = /<\/?([A-Z][A-Za-z0-9]+)/g;
  while ((m = componentRe.exec(template)) !== null) {
    usedComponents.add(m[1]);
  }

  // 找出：是 EP 图标 && 不在已知非图标列表 && 未在 script 中 import
  const missing = [];
  for (const name of usedComponents) {
    if (
      EP_ICONS.has(name) &&
      !KNOWN_NON_ICON_COMPONENTS.has(name) &&
      !importedNames.has(name)
    ) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    const rel = path.relative(srcDir, file);
    console.log(`\n❌ ${rel}`);
    console.log(`   未导入的图标: ${missing.join(", ")}`);
    console.log(
      `   修复: import { ${missing.join(", ")} } from "@element-plus/icons-vue";`
    );
    totalIssues += missing.length;
  }
}

if (totalIssues === 0) {
  console.log("✅ 所有 Element Plus 图标均已正确导入，无漏导入。");
} else {
  console.log(`\n共发现 ${totalIssues} 个漏导入图标，请修复后重新运行。`);
  process.exit(1);
}
