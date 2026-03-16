/**
 * Vite 插件：在构建时将 public/config/plugins.json 中的
 * __VITE_xxx__ 占位符替换为对应环境变量值。
 *
 * 开发模式下拦截 /config/plugins.json 请求，实时替换。
 * 生产构建时通过 generateBundle 钩子替换。
 */
import { Plugin, loadEnv } from "vite";
import { readFileSync } from "fs";
import { resolve } from "path";

export function pluginEnvJson(): Plugin {
  let env: Record<string, string> = {};
  let root = "";

  function replaceEnvPlaceholders(content: string): string {
    return content.replace(/__VITE_([A-Z0-9_]+)__/g, (match, key) => {
      const envKey = `VITE_${key}`;
      return env[envKey] ?? match;
    });
  }

  return {
    name: "vite-plugin-env-json",

    configResolved(config) {
      root = config.root;
      env = loadEnv(config.mode, root);
    },

    // 开发模式：拦截请求实时替换
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/config/plugins.json") {
          const filePath = resolve(root, "public/config/plugins.json");
          try {
            const raw = readFileSync(filePath, "utf-8");
            const replaced = replaceEnvPlaceholders(raw);
            res.setHeader("Content-Type", "application/json");
            res.end(replaced);
          } catch {
            next();
          }
        } else {
          next();
        }
      });
    },

    // 生产构建：替换输出文件中的占位符
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName === "config/plugins.json" && chunk.type === "asset") {
          const source =
            typeof chunk.source === "string"
              ? chunk.source
              : new TextDecoder().decode(chunk.source);
          chunk.source = replaceEnvPlaceholders(source);
        }
      }
    },
  };
}
