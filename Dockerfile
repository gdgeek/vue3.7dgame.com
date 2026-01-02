# ===========================================
# 构建阶段
# ===========================================
FROM node:20-alpine AS build
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@10.14.0

# 复制依赖文件（利用 Docker 缓存层）
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建参数：支持不同环境构建
# 可选值：production, staging, 7dgame_com, 4mr_cn, 01xr_com 等
ARG BUILD_MODE=production
RUN pnpm run build:${BUILD_MODE} || pnpm run build

# ===========================================
# 生产阶段
# ===========================================
FROM nginx:alpine

# 将自定义的 Nginx 配置文件复制到容器中
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 将构建的文件复制到 Nginx 默认的静态文件目录
COPY --from=build /app/dist /usr/share/nginx/html

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

# 暴露端口
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
