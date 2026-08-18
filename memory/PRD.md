# PRD — LMS Pemberdayaan (EmpowerLearn)

## Original Problem Statement
Membangun aplikasi LMS course untuk pemberdayaan komunitas dengan Backend NestJS (diubah jadi FastAPI atas persetujuan user) dan Frontend ReactJS, JWT auth per level user. 4 peran: Admin (kuasa penuh, mapping program donor → course), Donor (pantau capaian program), Instruktur (kurikulum, materi, tugas, cohort), Student (enrol, tandai materi, submit tugas, lihat skor). Siap deploy VPS.

## Tech Stack (final)
- Backend: FastAPI (Python 3.11) + Motor (async MongoDB) + PyJWT + bcrypt
- Frontend: React 19 + Tailwind + Sonner + Recharts + Lucide + react-router v7
- Database: MongoDB 7
- Deployment: Docker Compose + Nginx reverse proxy (siap SSL Let's Encrypt)

## User Personas
- **Admin**: staf yayasan yang mengatur seluruh program & user
- **Donor**: institusi/perusahaan penyandang dana yang butuh transparansi impact
- **Instruktur**: fasilitator lokal / pengajar yang menyusun kurikulum & menilai
- **Student**: penerima manfaat program (peserta pemberdayaan)

## Core Requirements (Static)
1. JWT auth + RBAC 4 role
2. CRUD Program (admin) dengan assignment ke donor
3. CRUD Course terikat ke program, dengan instruktur
4. CRUD Modul (materi + optional assignment dengan max_score)
5. Student self-enroll, mark-as-done materi
6. Student submit tugas via **link Google Drive** (bukan upload file)
7. Instruktur grade submission dengan feedback
8. Donor dashboard capaian per program (KPI + chart)
9. Deployable ke VPS via Docker Compose

## Implemented (2026-01)
- Backend server (`/app/backend/server.py`): 30+ endpoints, seed admin startup, indexes unique email + composite enrollment/progress/submission
- Frontend 12 halaman utama: Login, Register (role selector), Dashboard (per role), Programs, Courses, CourseManage (kurikulum builder), BrowseCourses, CoursePlayer (dengan Google Drive submit), Grading, Cohort, Users, MyCourses
- Design: palette hijau (#1A4D2E) + terracotta (#E86A33), fonts Outfit + Manrope
- Deployment files: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` (multi-stage build + nginx serve), `deploy/nginx.conf` (reverse proxy /api + / dengan blok HTTPS opsional), `.env.example`, `README.md` lengkap (arsitektur + step-by-step deploy VPS + Let's Encrypt + backup mongo)
- Seeded demo data: 1 program, 1 course (3 modul, 1 assignment), 4 akun test
- Testing agent: 19/19 backend tests pass, all 4 role frontend flows verified

## Implemented (2026-06)
- **Email notifikasi nilai (Resend)**: saat instruktur grade submission, backend kirim email HTML ke student (non-blocking via `asyncio.create_task` + `asyncio.to_thread`). Jika `RESEND_API_KEY` kosong → email di-skip dengan log, tanpa error. Konfig: `RESEND_API_KEY` + `SENDER_EMAIL` di backend/.env, .env.example, dan docker-compose.yml. **KEY BELUM DIISI USER** — fitur aktif otomatis begitu key diisi.
- **Import Student CSV (Admin)**: `POST /api/users/import-csv` (multipart, admin only). Kolom `name,email,password` (password opsional → generate otomatis 10 char). Support delimiter `,`/`;`, BOM, validasi email, dedup dalam file & DB, opsi auto-enroll ke course. Frontend: dialog di halaman Pengguna dengan download template, tabel hasil (password yang digenerate), download hasil CSV, daftar baris dilewati. Tested E2E via curl (login akun hasil import → submit → grade → email pipeline trigger).

## Prioritized Backlog (P0 → P2)
- **P1**: Upload sertifikat completion PDF ketika 100% modul selesai + skor ≥ passing
- **P2**: Chat/diskusi per module (Q&A)
- **P2**: Export laporan capaian program ke PDF/Excel untuk donor
- **P2**: Multi-bahasa (id/en) toggle
- **P2**: Split `server.py` ke routers/ modular

## Deployment Ready?
✅ Ya — jalankan `docker compose up -d --build` di VPS setelah copy `.env.example` → `.env` dan set `JWT_SECRET`, `REACT_APP_BACKEND_URL`, `FRONTEND_ORIGIN`.
