# LMS Pemberdayaan (EmpowerLearn)

Platform Learning Management System multi-role untuk program pemberdayaan komunitas yang didanai donor.
Terdiri dari 4 peran: **Admin**, **Donor**, **Instruktur**, dan **Student**.

- Backend: FastAPI (Python) + MongoDB + JWT Auth
- Frontend: React 19 + TailwindCSS + Recharts + Sonner Toaster
- Deployment: Docker Compose + Nginx reverse proxy

---

## Fitur Utama

| Peran | Kemampuan |
|---|---|
| **Admin** | CRUD Program, mapping donor ke program, buat course, assign instruktur, kelola user |
| **Donor** | Dashboard capaian program yang mereka danai (KPI, chart per course, avg score) |
| **Instruktur** | Susun kurikulum & materi, buat tugas, lihat cohort progress, nilai submission |
| **Student** | Daftar course, tandai materi selesai, submit tugas via **link Google Drive**, lihat skor |

---

## Arsitektur Production

```
                    ┌────────────────┐
   Users ─────────► │  Nginx :80/443 │  (reverse proxy + SSL termination)
                    └───────┬────────┘
                            │
                ┌───────────┴────────────┐
                │                        │
       ┌────────▼─────────┐    ┌─────────▼────────┐
       │  Frontend React  │    │ Backend FastAPI  │
       │ (Nginx static)   │    │ Uvicorn workers  │
       │  Port 80         │    │ Port 8001        │
       └──────────────────┘    └────────┬─────────┘
                                        │
                              ┌─────────▼─────────┐
                              │   MongoDB 7       │
                              │   (persistent)    │
                              └───────────────────┘
```

**Semua komponen berjalan sebagai Docker container yang dikelola oleh Docker Compose.**

---

## Kebutuhan VPS

- **CPU**: 2 core (minimum), 4 core disarankan
- **RAM**: 2 GB (minimum), 4 GB disarankan
- **Disk**: 20 GB SSD
- **OS**: Ubuntu 22.04 LTS atau Debian 12
- **Software**:
  - Docker Engine 24+
  - Docker Compose plugin v2+
  - (Opsional) `certbot` untuk sertifikat HTTPS gratis
- **Port terbuka di firewall**: 80, 443 (dan 22 untuk SSH)

---

## Instalasi Docker (satu kali di VPS baru)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # logout & login lagi setelah ini
sudo apt install -y docker-compose-plugin
```

---

## Deploy Aplikasi ke VPS

### 1. Clone / upload source ke VPS
```bash
cd /opt
sudo git clone <REPO_URL> lms
sudo chown -R $USER:$USER /opt/lms
cd /opt/lms
```

### 2. Konfigurasi environment
```bash
cp .env.example .env
nano .env
```
Isi:
- `REACT_APP_BACKEND_URL` → URL publik VPS (mis. `http://123.45.67.89` atau `https://lms.yourdomain.com`)
- `FRONTEND_ORIGIN` → sama dengan di atas
- `JWT_SECRET` → generate dengan `python3 -c "import secrets;print(secrets.token_hex(32))"`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` → **ganti** sebelum production

### 3. Build & jalankan
```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend      # cek log; harus muncul "Seeded admin"
```

Akses aplikasi di `http://IP_VPS` — login dengan `ADMIN_EMAIL` / `ADMIN_PASSWORD` yang Anda set.

### 4. Update / redeploy setelah perubahan kode
```bash
cd /opt/lms
git pull
docker compose up -d --build
```

### 5. Stop / restart
```bash
docker compose down          # stop semua service
docker compose restart       # restart semua
```

---

## HTTPS dengan Let's Encrypt

1. Arahkan A-Record domain Anda ke IP VPS.
2. Install certbot & terbitkan cert:
   ```bash
   sudo apt install -y certbot
   sudo docker compose stop nginx
   sudo certbot certonly --standalone -d lms.yourdomain.com
   sudo mkdir -p deploy/certs
   sudo cp /etc/letsencrypt/live/lms.yourdomain.com/fullchain.pem deploy/certs/
   sudo cp /etc/letsencrypt/live/lms.yourdomain.com/privkey.pem deploy/certs/
   ```
3. Edit `deploy/nginx.conf` → aktifkan blok `server { listen 443 ssl … }` (uncomment) dan set `server_name`.
4. Update `.env`: ganti `REACT_APP_BACKEND_URL` & `FRONTEND_ORIGIN` ke `https://lms.yourdomain.com`.
5. Rebuild:
   ```bash
   docker compose up -d --build
   ```

Auto-renew (cron):
```bash
0 3 * * * certbot renew --pre-hook "docker compose -f /opt/lms/docker-compose.yml stop nginx" --post-hook "docker compose -f /opt/lms/docker-compose.yml start nginx"
```

---

## Backup MongoDB

```bash
# Dump ke folder host
docker exec lms-mongo mongodump --db lms_empowerment --out /data/db/backup-$(date +%F)
docker cp lms-mongo:/data/db/backup-$(date +%F) ./backups/

# Restore
docker cp ./backups/backup-2026-01-01 lms-mongo:/data/db/restore
docker exec lms-mongo mongorestore /data/db/restore
```

---

## Struktur API

Semua endpoint di-prefix `/api`. Autentikasi via `Authorization: Bearer <token>`.

### Auth
| Method | Path | Peran |
|---|---|---|
| POST | `/api/auth/register` | public (student/instructor/donor) |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | authenticated |

### Program (Admin CRUD, Donor read-only untuk program-nya sendiri)
| Method | Path |
|---|---|
| POST/PATCH/DELETE | `/api/programs` `/api/programs/{id}` (admin) |
| GET | `/api/programs` `/api/programs/{id}` |
| GET | `/api/programs/{id}/achievement` (KPI + per-course completion) |

### Course & Module (Admin & Instruktur)
- `POST/GET/PATCH/DELETE /api/courses`, `/api/courses/{id}`
- `POST/PATCH/DELETE /api/modules`, `/api/modules/{id}`

### Student Flow
- `POST /api/enrollments` — daftar course
- `GET /api/enrollments/my` — daftar course saya + progress + skor
- `POST /api/progress/mark` — tandai materi paham
- `DELETE /api/progress/{module_id}` — lepas tanda
- `POST /api/submissions` — submit tugas (drive link)
- `GET /api/progress/my/{course_id}` — progress & submission course

### Instruktur & Admin
- `GET /api/submissions/course/{course_id}`
- `POST /api/submissions/{id}/grade`
- `GET /api/instructor/overview`
- `GET /api/admin/stats` (admin only)

---

## Akun Demo (dari seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@lms.id | Admin123! |

Peran lain bisa dibuat via halaman **Daftar** (Register) atau otomatis via API.

---

## Troubleshooting

**Backend tidak start / error MongoDB connection**
```bash
docker compose logs backend
docker compose logs mongo
```

**CORS error di browser**
Pastikan `FRONTEND_ORIGIN` di `.env` sama persis dengan origin browser (protokol + host + port, tanpa trailing slash).

**Habis restart env tidak berubah**
```bash
docker compose down
docker compose up -d --build
```

**Reset semua data**
```bash
docker compose down -v   # -v juga hapus volume mongo_data
```

---

## Lisensi

MIT — silakan modifikasi untuk kebutuhan komunitas Anda.
