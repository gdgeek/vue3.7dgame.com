FROM node:20-alpine AS build
WORKDIR /app

# 复制依赖文件
COPY package.json ./

# 安装 pnpm 并安装依赖
RUN npm install pnpm -g
RUN pnpm install

# 复制源代码
COPY . .

# 构建
RUN pnpm run build

# 开发阶段
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json ./
RUN npm install pnpm -g
RUN pnpm install

# 暴露 Vite 默认端口
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--host"]

# 使用 Nginx 作为生产阶段
FROM nginx:alpine

# Nginx 配置模板
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 自定义 entrypoint（动态生成 API failover 配置）
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 非动态 failover 的 APP_ 环境变量默认值（API 和 Domain 由 entrypoint 动态处理）
ENV APP_DOC_API_URL=http://127.0.0.1:65535

# 插件 URL 默认值（用于无 compose override 时的本地场景）
ENV PLUGIN_USER_MANAGEMENT_URL=http://localhost:3003
ENV PLUGIN_SYSTEM_ADMIN_URL=http://localhost:3005

# 将构建的文件复制到 Nginx 默认的静态文件目录
COPY --from=build /app/dist /usr/share/nginx/html

# 覆盖 plugins.json 为含占位符的模板（entrypoint 启动时 envsubst 替换）
COPY public/config/plugins.json.template /usr/share/nginx/html/config/plugins.json

# 暴露端口
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
