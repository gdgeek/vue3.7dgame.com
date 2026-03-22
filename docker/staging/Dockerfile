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

# Nginx 配置模板（官方镜像自动 envsubst）
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 运行时环境变量注入模板（生成 /usr/share/nginx/html/env-config.js）
COPY env-config.js.template /etc/nginx/templates/env-config.js.template

# 只替换 APP_ 前缀的环境变量，不影响 nginx 内置变量
ENV NGINX_ENVSUBST_FILTER=APP_
ENV NGINX_ENVSUBST_OUTPUT_DIR=/usr/share/nginx/html

# 将构建的文件复制到 Nginx 默认的静态文件目录
COPY --from=build /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80
