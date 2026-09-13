# ═══════════════════════════════════════════════════════════════════
# STAGE 1: Builder (compile deps)
# ═══════════════════════════════════════════════════════════════════
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps ke folder terpisah
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ═══════════════════════════════════════════════════════════════════
# STAGE 2: Runtime (minimal)
# ═══════════════════════════════════════════════════════════════════
FROM python:3.12-slim AS runtime

# Metadata
LABEL org.opencontainers.image.title="LMS Backend"
LABEL org.opencontainers.image.description="LMS Empowerment API"
LABEL org.opencontainers.image.vendor="Dwijacode"

# Environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/home/app/.local/bin:$PATH" \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Buat user non-root
RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app \
    --home-dir /home/app --create-home --shell /sbin/nologin app

# Copy deps dari builder
COPY --from=builder --chown=app:app /root/.local /home/app/.local

WORKDIR /app

# Copy source
COPY --chown=app:app . .

# Switch ke non-root
USER app

EXPOSE 8003

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request,sys; \
    sys.exit(0) if urllib.request.urlopen('http://localhost:8003/api/health',timeout=3) else sys.exit(1)" \
    || exit 1

# Jalankan dengan gunicorn/uvicorn
CMD ["uvicorn", "server:app", \
    "--host", "0.0.0.0", \
    "--port", "8003", \
    "--workers", "1", \
    "--proxy-headers", \
    "--forwarded-allow-ips", "*", \
    "--no-server-header"]