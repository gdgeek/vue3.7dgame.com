FROM node:21.1.0 AS build
WORKDIR /app
COPY package.json ./
RUN npm install pnpm -g
RUN pnpm install vuex
RUN pnpm install
COPY . .
RUN pnpm run build:staging

# 使用 Nginx 作为生产阶段
FROM nginx:alpine

# Nginx 配置模板
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 自定义 entrypoint（动态生成 API failover 配置）
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 非动态 failover 的 APP_ 环境变量默认值（API 和 Domain 由 entrypoint 动态处理）
ENV APP_DOC_API_URL=http://127.0.0.1:65535

# 将构建的文件复制到 Nginx 默认的静态文件目录
COPY --from=build /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
