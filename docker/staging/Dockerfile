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

# 将 Nginx 配置模板复制到容器中
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# 将构建的文件复制到 Nginx 默认的静态文件目录
COPY --from=build /app/dist /usr/share/nginx/html

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 暴露端口
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
