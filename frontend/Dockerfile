# ═══════════════════════════════════════════════════════════════════
# STAGE 1: Build React
# ═══════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files dulu (layer cache)
COPY package*.json ./

RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source & build
COPY . .

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# Hapus file yang tidak perlu
RUN find build -name "*.map" -delete

# ═══════════════════════════════════════════════════════════════════
# STAGE 2: Nginx Unprivileged (non-root)
# ═══════════════════════════════════════════════════════════════════
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="LMS Frontend"
LABEL org.opencontainers.image.vendor="Dwijacode"

USER root

# Copy config
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=builder --chown=nginx:nginx /build/build /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]