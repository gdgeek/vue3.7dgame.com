#!/usr/bin/env node
/**
 * 清理项目缓存和构建文件
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

console.log("🧹 开始清理项目...\n");

const dirsToClean = [
  "dist",
  "dist-ssr",
  "node_modules/.vite",
  "node_modules/.cache",
  ".vite",
  "coverage",
  "test-results",
  "stats.html",
];

let cleaned = 0;
let skipped = 0;

dirsToClean.forEach((dir) => {
  const fullPath = path.join(rootDir, dir);

  try {
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ 已删除目录: ${dir}`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`✅ 已删除文件: ${dir}`);
      }
      cleaned++;
    } else {
      console.log(`⏭️  跳过（不存在）: ${dir}`);
      skipped++;
    }
  } catch (error) {
    console.log(`❌ 删除失败: ${dir} - ${error.message}`);
  }
});

console.log("\n" + "=".repeat(50));
console.log(`✨ 清理完成！`);
console.log(`   已清理: ${cleaned} 项`);
console.log(`   已跳过: ${skipped} 项`);
console.log("=".repeat(50));
console.log("\n💡 提示：运行 pnpm install 重新安装依赖\n");
