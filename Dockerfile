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

# Nginx 配置模板（官方镜像自动 envsubst）
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 只替换 APP_ 前缀的环境变量，不影响 nginx 内置变量
ENV NGINX_ENVSUBST_FILTER=APP_

# 所有 APP_ 环境变量的默认值（未配置时 proxy_pass 指向无效地址，返回 502）
ENV APP_API_URL=http://127.0.0.1:0 \
    APP_BACKUP_API_URL=http://127.0.0.1:0 \
    APP_DOMAIN_INFO_API_URL=http://127.0.0.1:0 \
    APP_BACKUP_DOMAIN_INFO_API_URL=http://127.0.0.1:0 \
    APP_DOC_API_URL=http://127.0.0.1:0

# 将构建的文件复制到 Nginx 默认的静态文件目录
COPY --from=build /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80
