from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import csv
import re
import asyncio
import secrets
import string
import random
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import resend
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ---------- App / DB Setup ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day for LMS convenience

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LMS Pemberdayaan API")
api = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("lms")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


async def send_email(to: str, subject: str, html: str):
    if not RESEND_API_KEY:
        logger.info(f"[EMAIL SKIPPED — RESEND_API_KEY belum diset] to={to} subject={subject}")
        return
    params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: id={result.get('id')}")
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")


def grade_email_html(student_name: str, module_title: str, course_title: str, score: int, max_score: int, feedback: str, grader_name: str) -> str:
    feedback_row = (
        f'<tr><td style="padding:8px 0;color:#666;font-size:14px;">Feedback</td>'
        f'<td style="padding:8px 0;font-size:14px;">{feedback}</td></tr>'
    ) if feedback else ""
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="background:#1A4D2E;padding:24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#ffffff;margin:0;font-size:20px;">Tugas Anda Sudah Dinilai ✅</h2>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #E5E5E0;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#333;">Halo <strong>{student_name}</strong>,</p>
        <p style="font-size:14px;color:#333;">Instruktur telah menilai tugas Anda. Berikut detailnya:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          <tr><td style="padding:8px 0;color:#666;font-size:14px;width:120px;">Course</td><td style="padding:8px 0;font-size:14px;"><strong>{course_title}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:14px;">Modul</td><td style="padding:8px 0;font-size:14px;">{module_title}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:14px;">Nilai</td><td style="padding:8px 0;"><span style="background:#E86A33;color:#fff;padding:4px 12px;border-radius:20px;font-size:16px;font-weight:bold;">{score} / {max_score}</span></td></tr>
          {feedback_row}
          <tr><td style="padding:8px 0;color:#666;font-size:14px;">Dinilai oleh</td><td style="padding:8px 0;font-size:14px;">{grader_name}</td></tr>
        </table>
        <p style="font-size:13px;color:#999;margin-top:24px;">Login ke platform LMS untuk melihat detail lengkap.</p>
      </td></tr>
    </table>
    """


# ---------- Utilities ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": now_utc() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now_utc(),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ---------- Models ----------
Role = Literal["admin", "donor", "instructor", "student"]


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: Role
    created_at: datetime


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: Role


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1)
    role: Role
    password: Optional[str] = None
    course_id: Optional[str] = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user: UserPublic
    token: str


class ProgramCreate(BaseModel):
    title: str
    description: str = ""
    donor_id: Optional[str] = None
    target_beneficiaries: int = 0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Literal["draft", "active", "completed"] = "active"


class ProgramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    donor_id: Optional[str] = None
    target_beneficiaries: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[Literal["draft", "active", "completed"]] = None


class CourseCreate(BaseModel):
    program_id: str
    title: str
    description: str = ""
    instructor_id: Optional[str] = None
    thumbnail: Optional[str] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructor_id: Optional[str] = None
    thumbnail: Optional[str] = None


class ModuleCreate(BaseModel):
    course_id: str
    title: str
    content: str = ""
    order: int = 0
    has_assignment: bool = False
    assignment_title: Optional[str] = None
    assignment_description: Optional[str] = None
    max_score: int = 100


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None
    has_assignment: Optional[bool] = None
    assignment_title: Optional[str] = None
    assignment_description: Optional[str] = None
    max_score: Optional[int] = None


class EnrollBody(BaseModel):
    course_id: str


class ProgressBody(BaseModel):
    module_id: str


class SubmissionBody(BaseModel):
    module_id: str
    drive_link: str
    notes: str = ""


class GradeBody(BaseModel):
    score: int
    feedback: str = ""


# ---------- Auth Dependency ----------
async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    token: Optional[str] = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_roles(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail=f"Role {user['role']} not permitted")
        return user

    return _dep


# ---------- Auth Endpoints ----------
@api.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterBody):
    email = body.email.lower().strip()
    # Only allow self-register as student/instructor/donor. Admin created via seed only.
    if body.role == "admin":
        raise HTTPException(status_code=403, detail="Admin registration disabled")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "id": new_id(),
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name.strip(),
        "role": body.role,
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["id"], email, body.role)
    public = {k: v for k, v in user_doc.items() if k != "password_hash"}
    public["created_at"] = datetime.fromisoformat(public["created_at"])
    return {"user": public, "token": token}


@api.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    public = {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"],
              "created_at": datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"]}
    return {"user": public, "token": token}


@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    user["created_at"] = datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"]
    return user


# ---------- Users (Admin) ----------
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def generate_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@api.post("/users/import-csv")
async def import_students_csv(
    file: UploadFile = File(...),
    course_id: Optional[str] = Form(None),
    user: dict = Depends(require_roles("admin")),
):
    course = None
    if course_id:
        course = await db.courses.find_one({"id": course_id})
        if not course:
            raise HTTPException(404, "Course not found")
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    sample = text[:2048]
    delimiter = ";" if sample.count(";") > sample.count(",") else ","
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        raise HTTPException(400, "File CSV kosong atau tidak valid")
    fields = {f.strip().lower(): f for f in reader.fieldnames}
    if "name" not in fields or "email" not in fields:
        raise HTTPException(400, "CSV harus punya kolom 'name' dan 'email' (kolom 'password' opsional)")
    created, skipped = [], []
    seen_emails = set()
    for i, row in enumerate(reader, start=2):
        name = (row.get(fields["name"]) or "").strip()
        email = (row.get(fields["email"]) or "").strip().lower()
        password = (row.get(fields.get("password", ""), "") or "").strip() if "password" in fields else ""
        if not name and not email:
            continue
        if not name or not email:
            skipped.append({"row": i, "email": email or "-", "reason": "Nama atau email kosong"})
            continue
        if not EMAIL_RE.match(email):
            skipped.append({"row": i, "email": email, "reason": "Format email tidak valid"})
            continue
        if email in seen_emails:
            skipped.append({"row": i, "email": email, "reason": "Duplikat di dalam file"})
            continue
        seen_emails.add(email)
        if await db.users.find_one({"email": email}):
            skipped.append({"row": i, "email": email, "reason": "Email sudah terdaftar"})
            continue
        if password and len(password) < 6:
            skipped.append({"row": i, "email": email, "reason": "Password minimal 6 karakter"})
            continue
        generated = False
        if not password:
            password = generate_password()
            generated = True
        user_doc = {
            "id": new_id(),
            "email": email,
            "password_hash": hash_password(password),
            "name": name,
            "role": "student",
            "created_at": now_utc().isoformat(),
        }
        await db.users.insert_one(user_doc)
        enrolled = False
        if course:
            await db.enrollments.insert_one({
                "id": new_id(),
                "student_id": user_doc["id"],
                "course_id": course["id"],
                "program_id": course["program_id"],
                "enrolled_at": now_utc().isoformat(),
            })
            enrolled = True
        created.append({
            "name": name,
            "email": email,
            "password": password if generated else None,
            "enrolled": enrolled,
        })
    return {
        "created": created,
        "skipped": skipped,
        "created_count": len(created),
        "skipped_count": len(skipped),
        "enrolled_course": course.get("title") if course else None,
    }


@api.post("/users")
async def create_user(body: UserCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat membuat user")

    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    generated = False
    password = body.password
    if not password:
        password = "".join(random.choices(string.ascii_letters + string.digits, k=8))
        generated = True

    user_doc = {
        "id": new_id(),
        "email": email,
        "password_hash": hash_password(password),
        "name": body.name.strip(),
        "role": body.role.value,
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(user_doc)

    enrolled_course = None
    if body.course_id and body.role in (Role.student, Role.instructor):
        course = await db.courses.find_one({"id": body.course_id})
        if course:
            await db.enrollments.insert_one({
                "id": new_id(),
                "user_id": user_doc["id"],
                "course_id": course["id"],
                "program_id": course["program_id"],
                "enrolled_at": now_utc().isoformat(),
            })
            enrolled_course = course["title"]

    return {
        "id": user_doc["id"],
        "email": email,
        "name": user_doc["name"],
        "role": user_doc["role"],
        "password": password if generated else None,
        "enrolled_course": enrolled_course
    }


@api.get("/users")
async def list_users(role: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if role:
        q["role"] = role
    # instructors and admins can view users; donors/students cannot list all
    if user["role"] not in ("admin", "instructor", "donor"):
        raise HTTPException(status_code=403, detail="Forbidden")
    docs = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(1000)
    return docs


# ---------- Programs (Admin manages, Donor read own) ----------
@api.post("/programs")
async def create_program(body: ProgramCreate, user: dict = Depends(require_roles("admin"))):
    doc = {
        "id": new_id(),
        "title": body.title,
        "description": body.description,
        "donor_id": body.donor_id,
        "target_beneficiaries": body.target_beneficiaries,
        "start_date": body.start_date.isoformat() if body.start_date else None,
        "end_date": body.end_date.isoformat() if body.end_date else None,
        "status": body.status,
        "created_at": now_utc().isoformat(),
        "created_by": user["id"],
    }
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/programs")
async def list_programs(user: dict = Depends(get_current_user)):
    q = {}
    if user["role"] == "donor":
        q = {"donor_id": user["id"]}
    programs = await db.programs.find(q, {"_id": 0}).to_list(500)
    # attach basic stats
    for p in programs:
        courses = await db.courses.find({"program_id": p["id"]}, {"_id": 0}).to_list(500)
        p["course_count"] = len(courses)
        # count unique students enrolled in any of these courses
        course_ids = [c["id"] for c in courses]
        if course_ids:
            enrolled = await db.enrollments.distinct("student_id", {"course_id": {"$in": course_ids}})
            p["enrolled_students"] = len(enrolled)
        else:
            p["enrolled_students"] = 0
    return programs


@api.get("/programs/{program_id}")
async def get_program(program_id: str, user: dict = Depends(get_current_user)):
    p = await db.programs.find_one({"id": program_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Program not found")
    if user["role"] == "donor" and p.get("donor_id") != user["id"]:
        raise HTTPException(403, "Forbidden")
    return p


@api.patch("/programs/{program_id}")
async def update_program(program_id: str, body: ProgramUpdate, user: dict = Depends(require_roles("admin"))):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    for k in ("start_date", "end_date"):
        if updates.get(k) is not None and isinstance(updates[k], datetime):
            updates[k] = updates[k].isoformat()
    if not updates:
        raise HTTPException(400, "No fields to update")
    r = await db.programs.update_one({"id": program_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(404, "Program not found")
    return await db.programs.find_one({"id": program_id}, {"_id": 0})


@api.delete("/programs/{program_id}")
async def delete_program(program_id: str, user: dict = Depends(require_roles("admin"))):
    await db.programs.delete_one({"id": program_id})
    return {"ok": True}


# ---------- Program Achievement (Donor view) ----------
@api.get("/programs/{program_id}/achievement")
async def program_achievement(program_id: str, user: dict = Depends(get_current_user)):
    p = await db.programs.find_one({"id": program_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Program not found")
    if user["role"] == "donor" and p.get("donor_id") != user["id"]:
        raise HTTPException(403, "Forbidden")

    courses = await db.courses.find({"program_id": program_id}, {"_id": 0}).to_list(500)
    course_ids = [c["id"] for c in courses]
    modules = await db.modules.find({"course_id": {"$in": course_ids}}, {"_id": 0}).to_list(2000) if course_ids else []
    module_ids = [m["id"] for m in modules]
    enrollments = await db.enrollments.find({"course_id": {"$in": course_ids}}, {"_id": 0}).to_list(5000) if course_ids else []
    unique_students = list({e["student_id"] for e in enrollments})

    total_module_datapoints = len(unique_students) * len(modules) if modules else 0
    completed_progress = await db.progress.count_documents({"module_id": {"$in": module_ids}}) if module_ids else 0
    completion_rate = round((completed_progress / total_module_datapoints) * 100, 1) if total_module_datapoints else 0

    # Assignment stats
    submissions = await db.submissions.find({"module_id": {"$in": module_ids}}, {"_id": 0}).to_list(5000) if module_ids else []
    graded = [s for s in submissions if s.get("score") is not None]
    avg_score = round(sum(s["score"] for s in graded) / len(graded), 1) if graded else 0

    # Per course progress
    course_stats = []
    for c in courses:
        c_mods = [m for m in modules if m["course_id"] == c["id"]]
        c_enrolls = [e for e in enrollments if e["course_id"] == c["id"]]
        c_students = list({e["student_id"] for e in c_enrolls})
        total = len(c_students) * len(c_mods)
        c_mod_ids = [m["id"] for m in c_mods]
        done = await db.progress.count_documents({"module_id": {"$in": c_mod_ids}}) if c_mod_ids else 0
        course_stats.append({
            "course_id": c["id"],
            "title": c["title"],
            "students": len(c_students),
            "modules": len(c_mods),
            "completion_rate": round((done / total) * 100, 1) if total else 0,
        })

    return {
        "program": p,
        "kpi": {
            "target_beneficiaries": p.get("target_beneficiaries", 0),
            "enrolled_students": len(unique_students),
            "courses": len(courses),
            "modules": len(modules),
            "overall_completion": completion_rate,
            "submissions": len(submissions),
            "graded_submissions": len(graded),
            "average_score": avg_score,
        },
        "courses": course_stats,
    }


# ---------- Courses ----------
@api.post("/courses")
async def create_course(body: CourseCreate, user: dict = Depends(require_roles("admin", "instructor"))):
    if not await db.programs.find_one({"id": body.program_id}):
        raise HTTPException(400, "Program not found")
    instructor_id = body.instructor_id or (user["id"] if user["role"] == "instructor" else None)
    doc = {
        "id": new_id(),
        "program_id": body.program_id,
        "title": body.title,
        "description": body.description,
        "instructor_id": instructor_id,
        "thumbnail": body.thumbnail,
        "created_at": now_utc().isoformat(),
    }
    await db.courses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/courses")
async def list_courses(program_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if program_id:
        q["program_id"] = program_id
    if user["role"] == "instructor":
        q["instructor_id"] = user["id"]
    courses = await db.courses.find(q, {"_id": 0}).to_list(500)
    # enrich
    for c in courses:
        c["module_count"] = await db.modules.count_documents({"course_id": c["id"]})
        c["student_count"] = await db.enrollments.count_documents({"course_id": c["id"]})
        if c.get("instructor_id"):
            inst = await db.users.find_one({"id": c["instructor_id"]}, {"_id": 0, "name": 1})
            c["instructor_name"] = inst["name"] if inst else None
    return courses


@api.get("/courses/{course_id}")
async def get_course(course_id: str, user: dict = Depends(get_current_user)):
    c = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Course not found")
    mods = await db.modules.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    c["modules"] = mods
    if c.get("instructor_id"):
        inst = await db.users.find_one({"id": c["instructor_id"]}, {"_id": 0, "name": 1, "email": 1})
        c["instructor"] = inst
    return c


@api.patch("/courses/{course_id}")
async def update_course(course_id: str, body: CourseUpdate, user: dict = Depends(require_roles("admin", "instructor"))):
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(404, "Course not found")
    if user["role"] == "instructor" and course.get("instructor_id") != user["id"]:
        raise HTTPException(403, "Not your course")
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if not updates:
        raise HTTPException(400, "No updates")
    await db.courses.update_one({"id": course_id}, {"$set": updates})
    return await db.courses.find_one({"id": course_id}, {"_id": 0})


@api.delete("/courses/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(require_roles("admin", "instructor"))):
    await db.courses.delete_one({"id": course_id})
    await db.modules.delete_many({"course_id": course_id})
    return {"ok": True}


# ---------- Modules ----------
@api.post("/modules")
async def create_module(body: ModuleCreate, user: dict = Depends(require_roles("admin", "instructor"))):
    course = await db.courses.find_one({"id": body.course_id})
    if not course:
        raise HTTPException(404, "Course not found")
    if user["role"] == "instructor" and course.get("instructor_id") != user["id"]:
        raise HTTPException(403, "Not your course")
    doc = {
        "id": new_id(),
        **body.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    await db.modules.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/modules/{module_id}")
async def update_module(module_id: str, body: ModuleUpdate, user: dict = Depends(require_roles("admin", "instructor"))):
    m = await db.modules.find_one({"id": module_id})
    if not m:
        raise HTTPException(404, "Module not found")
    course = await db.courses.find_one({"id": m["course_id"]})
    if user["role"] == "instructor" and course.get("instructor_id") != user["id"]:
        raise HTTPException(403, "Not your course")
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if updates:
        await db.modules.update_one({"id": module_id}, {"$set": updates})
    return await db.modules.find_one({"id": module_id}, {"_id": 0})


@api.delete("/modules/{module_id}")
async def delete_module(module_id: str, user: dict = Depends(require_roles("admin", "instructor"))):
    await db.modules.delete_one({"id": module_id})
    return {"ok": True}


# ---------- Enrollment (Student) ----------
@api.post("/enrollments")
async def enroll(body: EnrollBody, user: dict = Depends(require_roles("student"))):
    c = await db.courses.find_one({"id": body.course_id})
    if not c:
        raise HTTPException(404, "Course not found")
    existing = await db.enrollments.find_one({"course_id": body.course_id, "student_id": user["id"]})
    if existing:
        return {k: v for k, v in existing.items() if k != "_id"}
    doc = {
        "id": new_id(),
        "student_id": user["id"],
        "course_id": body.course_id,
        "program_id": c["program_id"],
        "enrolled_at": now_utc().isoformat(),
    }
    await db.enrollments.insert_one(doc)
    doc.pop("_id", None)
    return doc




@api.get("/enrollments/my")
async def my_enrollments(user: dict = Depends(require_roles("student"))):
    enrolls = await db.enrollments.find({"student_id": user["id"]}, {"_id": 0}).to_list(500)
    result = []
    for e in enrolls:
        c = await db.courses.find_one({"id": e["course_id"]}, {"_id": 0})
        if not c:
            continue
        modules = await db.modules.find({"course_id": c["id"]}, {"_id": 0}).to_list(500)
        done_mod_ids = await db.progress.distinct("module_id", {"enrollment_id": e["id"]})
        submissions = await db.submissions.find({"enrollment_id": e["id"]}, {"_id": 0}).to_list(500)
        graded = [s for s in submissions if s.get("score") is not None]
        avg = round(sum(s["score"] for s in graded) / len(graded), 1) if graded else 0
        result.append({
            **e,
            "course": c,
            "total_modules": len(modules),
            "completed_modules": len(done_mod_ids),
            "progress_pct": round((len(done_mod_ids) / len(modules)) * 100, 1) if modules else 0,
            "average_score": avg,
            "submissions_count": len(submissions),
        })
    return result


# ---------- Progress: mark material understood ----------
@api.post("/progress/mark")
async def mark_progress(body: ProgressBody, user: dict = Depends(require_roles("student"))):
    m = await db.modules.find_one({"id": body.module_id})
    if not m:
        raise HTTPException(404, "Module not found")
    e = await db.enrollments.find_one({"course_id": m["course_id"], "student_id": user["id"]})
    if not e:
        raise HTTPException(400, "Not enrolled in this course")
    existing = await db.progress.find_one({"enrollment_id": e["id"], "module_id": body.module_id})
    if existing:
        return {"ok": True, "already": True}
    await db.progress.insert_one({
        "id": new_id(),
        "enrollment_id": e["id"],
        "student_id": user["id"],
        "module_id": body.module_id,
        "course_id": m["course_id"],
        "marked_at": now_utc().isoformat(),
    })
    return {"ok": True}


@api.delete("/progress/{module_id}")
async def unmark_progress(module_id: str, user: dict = Depends(require_roles("student"))):
    await db.progress.delete_many({"module_id": module_id, "student_id": user["id"]})
    return {"ok": True}


@api.get("/progress/my/{course_id}")
async def my_progress(course_id: str, user: dict = Depends(require_roles("student"))):
    e = await db.enrollments.find_one({"course_id": course_id, "student_id": user["id"]})
    if not e:
        return {"completed_module_ids": [], "submissions": []}
    done = await db.progress.distinct("module_id", {"enrollment_id": e["id"]})
    subs = await db.submissions.find({"enrollment_id": e["id"]}, {"_id": 0}).to_list(500)
    return {"completed_module_ids": done, "submissions": subs}


# ---------- Submissions ----------
@api.post("/submissions")
async def submit_assignment(body: SubmissionBody, user: dict = Depends(require_roles("student"))):
    m = await db.modules.find_one({"id": body.module_id})
    if not m:
        raise HTTPException(404, "Module not found")
    if not m.get("has_assignment"):
        raise HTTPException(400, "Module has no assignment")
    e = await db.enrollments.find_one({"course_id": m["course_id"], "student_id": user["id"]})
    if not e:
        raise HTTPException(400, "Not enrolled")
    existing = await db.submissions.find_one({"module_id": body.module_id, "student_id": user["id"]})
    if existing:
        await db.submissions.update_one(
            {"id": existing["id"]},
            {"$set": {"drive_link": body.drive_link, "notes": body.notes, "submitted_at": now_utc().isoformat(),
                      "score": None, "feedback": None, "graded_at": None}},
        )
        return await db.submissions.find_one({"id": existing["id"]}, {"_id": 0})
    doc = {
        "id": new_id(),
        "enrollment_id": e["id"],
        "student_id": user["id"],
        "module_id": body.module_id,
        "course_id": m["course_id"],
        "drive_link": body.drive_link,
        "notes": body.notes,
        "submitted_at": now_utc().isoformat(),
        "score": None,
        "feedback": None,
        "graded_at": None,
        "max_score": m.get("max_score", 100),
    }
    await db.submissions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/submissions/course/{course_id}")
async def submissions_for_course(course_id: str, user: dict = Depends(require_roles("admin", "instructor"))):
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(404, "Course not found")
    if user["role"] == "instructor" and course.get("instructor_id") != user["id"]:
        raise HTTPException(403, "Not your course")
    subs = await db.submissions.find({"course_id": course_id}, {"_id": 0}).to_list(1000)
    # enrich with student name + module title
    for s in subs:
        st = await db.users.find_one({"id": s["student_id"]}, {"_id": 0, "name": 1, "email": 1})
        s["student"] = st
        m = await db.modules.find_one({"id": s["module_id"]}, {"_id": 0, "title": 1, "max_score": 1})
        s["module"] = m
    return subs


@api.post("/submissions/{submission_id}/grade")
async def grade_submission(submission_id: str, body: GradeBody, user: dict = Depends(require_roles("admin", "instructor"))):
    s = await db.submissions.find_one({"id": submission_id})
    if not s:
        raise HTTPException(404, "Submission not found")
    course = await db.courses.find_one({"id": s["course_id"]})
    if user["role"] == "instructor" and course.get("instructor_id") != user["id"]:
        raise HTTPException(403, "Not your course")
    max_score = s.get("max_score", 100)
    if body.score < 0 or body.score > max_score:
        raise HTTPException(400, f"Score must be 0..{max_score}")
    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {"score": body.score, "feedback": body.feedback, "graded_at": now_utc().isoformat(),
                  "graded_by": user["id"]}},
    )
    student = await db.users.find_one({"id": s["student_id"]}, {"_id": 0, "name": 1, "email": 1})
    module = await db.modules.find_one({"id": s["module_id"]}, {"_id": 0, "title": 1})
    if student and student.get("email"):
        html = grade_email_html(
            student_name=student["name"],
            module_title=(module or {}).get("title", "Tugas"),
            course_title=course.get("title", ""),
            score=body.score,
            max_score=max_score,
            feedback=body.feedback or "",
            grader_name=user["name"],
        )
        asyncio.create_task(send_email(student["email"], f"Nilai tugas kamu sudah keluar — {course.get('title', 'LMS')}", html))
    return await db.submissions.find_one({"id": submission_id}, {"_id": 0})


# ---------- Instructor Cohort Overview ----------
@api.get("/instructor/overview")
async def instructor_overview(user: dict = Depends(require_roles("instructor", "admin"))):
    q = {} if user["role"] == "admin" else {"instructor_id": user["id"]}
    courses = await db.courses.find(q, {"_id": 0}).to_list(500)
    total_students = 0
    total_submissions = 0
    total_graded = 0
    cohort_rows = []
    for c in courses:
        enrolls = await db.enrollments.find({"course_id": c["id"]}, {"_id": 0}).to_list(2000)
        mods = await db.modules.find({"course_id": c["id"]}, {"_id": 0}).to_list(500)
        mod_ids = [m["id"] for m in mods]
        submissions = await db.submissions.find({"course_id": c["id"]}, {"_id": 0}).to_list(2000)
        graded = [s for s in submissions if s.get("score") is not None]
        total_students += len(enrolls)
        total_submissions += len(submissions)
        total_graded += len(graded)
        total = len(enrolls) * len(mods)
        done = await db.progress.count_documents({"module_id": {"$in": mod_ids}}) if mod_ids else 0
        cohort_rows.append({
            "course_id": c["id"],
            "title": c["title"],
            "students": len(enrolls),
            "modules": len(mods),
            "completion_rate": round((done / total) * 100, 1) if total else 0,
            "pending_grading": len(submissions) - len(graded),
        })
    return {
        "kpi": {
            "courses": len(courses),
            "students": total_students,
            "submissions": total_submissions,
            "pending_grading": total_submissions - total_graded,
        },
        "cohorts": cohort_rows,
    }


# ---------- Admin Stats ----------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_roles("admin"))):
    return {
        "users": {
            "total": await db.users.count_documents({}),
            "admin": await db.users.count_documents({"role": "admin"}),
            "donor": await db.users.count_documents({"role": "donor"}),
            "instructor": await db.users.count_documents({"role": "instructor"}),
            "student": await db.users.count_documents({"role": "student"}),
        },
        "programs": await db.programs.count_documents({}),
        "courses": await db.courses.count_documents({}),
        "modules": await db.modules.count_documents({}),
        "enrollments": await db.enrollments.count_documents({}),
        "submissions": await db.submissions.count_documents({}),
    }


# ---------- Health ----------
@api.get("/")
async def root():
    return {"service": "LMS Pemberdayaan", "status": "ok", "time": now_utc().isoformat()}


# ---------- App Wire-up ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.programs.create_index("donor_id")
    await db.courses.create_index("program_id")
    await db.courses.create_index("instructor_id")
    await db.modules.create_index("course_id")
    await db.enrollments.create_index([("course_id", 1), ("student_id", 1)], unique=True)
    await db.progress.create_index([("enrollment_id", 1), ("module_id", 1)], unique=True)
    await db.submissions.create_index([("module_id", 1), ("student_id", 1)], unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@lms.id").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Super Admin",
            "role": "admin",
            "created_at": now_utc().isoformat(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Updated admin password: {admin_email}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
