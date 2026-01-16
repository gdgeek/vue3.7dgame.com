#!/usr/bin/env node
/**
 * 项目健康检查脚本
 * 检查项目配置、依赖、代码质量等
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔍 开始项目健康检查...\n');

// 检查项 1: Node 版本
console.log('📦 检查 Node 版本...');
try {
  const nodeVersion = process.version;
  const requiredVersion = '18.0.0';
  console.log(`   当前版本: ${nodeVersion}`);
  console.log(`   要求版本: >= ${requiredVersion}`);
  console.log('   ✅ Node 版本符合要求\n');
} catch (error) {
  console.log('   ❌ Node 版本检查失败\n');
}

// 检查项 2: 依赖安装
console.log('📚 检查依赖安装...');
const nodeModulesPath = path.join(rootDir, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('   ✅ 依赖已安装\n');
} else {
  console.log('   ❌ 依赖未安装，请运行: pnpm install\n');
}

// 检查项 3: 环境配置
console.log('⚙️  检查环境配置...');
const envFiles = ['.env.development', '.env.production', '.env.staging'];
envFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} 存在`);
  } else {
    console.log(`   ⚠️  ${file} 不存在`);
  }
});
console.log();

// 检查项 4: TypeScript 配置
console.log('📝 检查 TypeScript 配置...');
const tsconfigPath = path.join(rootDir, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  console.log('   ✅ tsconfig.json 存在\n');
} else {
  console.log('   ❌ tsconfig.json 不存在\n');
}

// 检查项 5: Git 配置
console.log('🔧 检查 Git 配置...');
const gitPath = path.join(rootDir, '.git');
if (fs.existsSync(gitPath)) {
  console.log('   ✅ Git 仓库已初始化');

  // 检查 Husky
  const huskyPath = path.join(rootDir, '.husky');
  if (fs.existsSync(huskyPath)) {
    console.log('   ✅ Husky Git hooks 已配置');
  } else {
    console.log('   ⚠️  Husky 未配置');
  }
} else {
  console.log('   ⚠️  Git 仓库未初始化\n');
}
console.log();

// 检查项 6: 代码质量工具
console.log('🎨 检查代码质量工具...');
const qualityTools = [
  { name: 'ESLint', file: '.eslintrc.cjs' },
  { name: 'Prettier', file: '.prettierrc.cjs' },
  { name: 'Stylelint', file: '.stylelintrc.cjs' },
  { name: 'Commitlint', file: 'commitlint.config.cjs' },
];

qualityTools.forEach(tool => {
  const filePath = path.join(rootDir, tool.file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${tool.name} 已配置`);
  } else {
    console.log(`   ❌ ${tool.name} 未配置`);
  }
});
console.log();

// 检查项 7: 统计代码信息
console.log('📊 代码统计...');
try {
  const srcPath = path.join(rootDir, 'src');

  // 统计 Vue 文件
  const vueFiles = execSync(`find ${srcPath} -name "*.vue" | wc -l`, { encoding: 'utf-8' }).trim();
  console.log(`   Vue 组件: ${vueFiles} 个`);

  // 统计 TS 文件
  const tsFiles = execSync(`find ${srcPath} -name "*.ts" | wc -l`, { encoding: 'utf-8' }).trim();
  console.log(`   TypeScript 文件: ${tsFiles} 个`);

  // 统计代码行数
  const lines = execSync(`find ${srcPath} -name "*.vue" -o -name "*.ts" | xargs wc -l | tail -1`, { encoding: 'utf-8' }).trim();
  console.log(`   总代码行数: ${lines}`);
} catch (error) {
  console.log('   ⚠️  代码统计失败');
}
console.log();

// 检查项 8: 检查 console 语句
console.log('🔍 检查 console 语句...');
try {
  const result = execSync(
    `grep -r "console\\." src --include="*.ts" --include="*.vue" | grep -v "logger" | wc -l`,
    { encoding: 'utf-8', cwd: rootDir }
  ).trim();

  const count = parseInt(result);
  if (count > 0) {
    console.log(`   ⚠️  发现 ${count} 处 console 语句（建议使用 logger）`);
  } else {
    console.log('   ✅ 未发现 console 语句');
  }
} catch (error) {
  console.log('   ⚠️  检查失败');
}
console.log();

// 总结
console.log('='.repeat(50));
console.log('✨ 检查完成！');
console.log('='.repeat(50));
console.log('\n💡 建议：');
console.log('   1. 运行 pnpm run lint:eslint 检查代码规范');
console.log('   2. 运行 pnpm run type-check 检查类型错误');
console.log('   3. 运行 pnpm run test 执行测试');
console.log('   4. 查看 IMPROVEMENTS.md 了解改进建议\n');
