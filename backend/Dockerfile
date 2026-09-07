FROM python:3.11-slim

WORKDIR /app

# Tambahkan dependensi sistem agar library seperti cryptography & bcrypt berhasil dikompilasi
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    jq \
    curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]