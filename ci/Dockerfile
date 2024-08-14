FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install pnpm -g
RUN pnpm install vuex -g
RUN pnpm install
COPY . .
