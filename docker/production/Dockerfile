ARG UNITY_PREVIOUS_IMAGE=hkccr.ccs.tencentyun.com/gdgeek/vue3@sha256:43db003cbbf69688a85a44d94ca3daee8ebe8483f11c2ab1734ba2e4006fe7d1

# The Unity input is immutable and independent of adjacent superproject modules.
FROM --platform=linux/amd64 hkccr.ccs.tencentyun.com/gdgeek/vue3@sha256:0f0d9bf2c35cf46c3d37e9d55df313683d2af65b0bdf9011078b6c57d85c6a01 AS unity-source

# Preserve the previously verified main-site runtime across this upgrade.
# Upgrades pin the previous verified MAIN WEB image to retain its active release.
FROM --platform=linux/amd64 ${UNITY_PREVIOUS_IMAGE} AS runtime-previous
ARG UNITY_PREVIOUS_IMAGE
RUN printf '%s' "$UNITY_PREVIOUS_IMAGE" | grep -Eq '^[^[:space:]@]+@sha256:[0-9a-f]{64}$' && mkdir -p /usr/share/nginx/html/webgl-preview

FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS unity-runtime
WORKDIR /runtime-tools
COPY scripts/unity ./scripts/unity
COPY runtime/unity/public ./runtime/unity/public
COPY --from=unity-source /usr/share/nginx/html/Build /unity-artifacts/Build
RUN node scripts/unity/runtime.mjs prepare --artifacts /unity-artifacts --output /runtime/webgl-preview

FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile
COPY . .
ARG BUILD_MODE=production
RUN pnpm exec vue-tsc --noEmit && pnpm exec vite build --mode "$BUILD_MODE"

FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS dev
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile
EXPOSE 3001
CMD ["pnpm", "run", "dev", "--host"]

# Verify the complete static tree before copying that exact tree into nginx.
FROM unity-runtime AS final-verifier
ARG UNITY_PREVIOUS_IMAGE
COPY --from=runtime-previous /usr/share/nginx/html/webgl-preview /previous-runtime
COPY --from=build /app/dist /html
COPY --from=unity-runtime /runtime/webgl-preview /html/webgl-preview
RUN node scripts/unity/runtime.mjs retain --previous /previous-runtime --previous-image "$UNITY_PREVIOUS_IMAGE" --output /html/webgl-preview
RUN node scripts/unity/runtime.mjs verify --output /html/webgl-preview

FROM nginx:alpine@sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752 AS final
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV APP_DOC_API_URL=http://127.0.0.1:65535
ENV PLUGIN_USER_MANAGEMENT_URL=http://localhost:3003
ENV PLUGIN_SYSTEM_ADMIN_URL=http://localhost:3005
COPY --from=final-verifier /html /usr/share/nginx/html
COPY public/config/plugins.json.template /usr/share/nginx/html/config/plugins.json
LABEL io.xrugc.unity.source="hkccr.ccs.tencentyun.com/gdgeek/vue3@sha256:0f0d9bf2c35cf46c3d37e9d55df313683d2af65b0bdf9011078b6c57d85c6a01"
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
