FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install pnpm -g
RUN pnpm install vuex
RUN pnpm install
COPY . .
RUN pnpm run build

# 使用 Nginx 作为生产阶段
FROM nginx:alpine

# 将自定义的 Nginx 配置文件复制到容器中
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 将构建的文件复制到 Nginx 默认的静态文件目录
COPY --from=build /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
