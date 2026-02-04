/**
 * 批量替换 console 为 logger
 * 使用方法: node scripts/replace-console.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');

// 需要替换的文件列表（关键文件）
const filesToUpdate = [
  'src/store/modules/domain.ts',
  'src/store/modules/user.ts',
  'src/store/modules/token.ts',
  'src/store/modules/tags.ts',
];

function addLoggerImport(content, filePath) {
  // 检查是否已经导入了 logger
  if (content.includes('from "@/utils/logger"') || content.includes("from '@/utils/logger'")) {
    return content;
  }

  // 在第一个 import 语句之前添加 logger 导入
  const importRegex = /^import\s/m;
  const match = content.match(importRegex);

  if (match) {
    const insertPos = match.index;
    return content.slice(0, insertPos) +
      'import { logger } from "@/utils/logger";\n' +
      content.slice(insertPos);
  }

  // 如果没有 import，在文件开头添加
  return 'import { logger } from "@/utils/logger";\n\n' + content;
}

function replaceConsole(content) {
  // 替换 console.log
  content = content.replace(/console\.log\(/g, 'logger.log(');
  // 替换 console.warn
  content = content.replace(/console\.warn\(/g, 'logger.warn(');
  // 替换 console.error
  content = content.replace(/console\.error\(/g, 'logger.error(');
  // 替换 console.info
  content = content.replace(/console\.info\(/g, 'logger.info(');
  // 替换 console.debug
  content = content.replace(/console\.debug\(/g, 'logger.debug(');

  return content;
}

function processFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // 替换 console
  content = replaceConsole(content);

  // 如果有替换，添加 logger 导入
  if (content !== originalContent) {
    content = addLoggerImport(content, filePath);
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ 已更新: ${filePath}`);
  } else {
    console.log(`⏭️  跳过（无需更新）: ${filePath}`);
  }
}

console.log('开始替换 console 为 logger...\n');

filesToUpdate.forEach(processFile);

console.log('\n✨ 完成！');
console.log('\n💡 提示：测试文件中的 console 语句已保留，因为它们用于测试输出。');
