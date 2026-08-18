"""
LMS Pemberdayaan - Backend integration test suite (pytest)
Covers: auth (login/register/me), programs CRUD + RBAC, courses/modules RBAC,
enrollments idempotent, progress mark/unmark, submissions + grading, achievement KPI,
instructor overview, admin stats.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://skill-hub-300.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@lms.id", "password": "Admin123!"}
DONOR = {"email": "donor@lms.id", "password": "donor123"}
INSTR = {"email": "instr@lms.id", "password": "instr123"}
STUD = {"email": "student@lms.id", "password": "stud123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    return r


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Session-scoped tokens ----------
@pytest.fixture(scope="session")
def tokens():
    out = {}
    for k, creds in [("admin", ADMIN), ("donor", DONOR), ("instr", INSTR), ("stud", STUD)]:
        r = _login(creds)
        assert r.status_code == 200, f"Login failed for {k}: {r.status_code} {r.text}"
        out[k] = r.json()["token"]
        out[k + "_user"] = r.json()["user"]
    return out


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self):
        r = _login(ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["email"] == ADMIN["email"]
        assert data["user"]["role"] == "admin"

    def test_login_wrong_password(self):
        r = _login({"email": ADMIN["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_register_admin_forbidden(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": f"TEST_admin_{uuid.uuid4().hex[:6]}@ex.com",
            "password": "pw12345", "name": "TEST", "role": "admin",
        })
        assert r.status_code == 403

    def test_register_student_ok(self):
        email = f"TEST_stud_{uuid.uuid4().hex[:6]}@ex.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "pw12345", "name": "TEST Student", "role": "student",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == email.lower()
        assert d["user"]["role"] == "student"
        assert d["token"]

    def test_me_returns_current_user(self, tokens):
        r = requests.get(f"{API}/auth/me", headers=_auth_headers(tokens["admin"]))
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Programs ----------
class TestPrograms:
    created_id = None

    def test_admin_can_create_program(self, tokens):
        payload = {"title": "TEST_Program", "description": "d", "target_beneficiaries": 50,
                   "donor_id": tokens["donor_user"]["id"], "status": "active"}
        r = requests.post(f"{API}/programs", json=payload, headers=_auth_headers(tokens["admin"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == "TEST_Program"
        assert d["donor_id"] == tokens["donor_user"]["id"]
        assert "id" in d
        TestPrograms.created_id = d["id"]

    def test_non_admin_cannot_create(self, tokens):
        r = requests.post(f"{API}/programs", json={"title": "x"}, headers=_auth_headers(tokens["instr"]))
        assert r.status_code == 403

    def test_list_programs_admin_sees_all(self, tokens):
        r = requests.get(f"{API}/programs", headers=_auth_headers(tokens["admin"]))
        assert r.status_code == 200
        titles = [p["title"] for p in r.json()]
        assert any("Literasi Digital Desa" in t for t in titles), f"Seeded program missing: {titles}"

    def test_donor_only_sees_own(self, tokens):
        r = requests.get(f"{API}/programs", headers=_auth_headers(tokens["donor"]))
        assert r.status_code == 200
        for p in r.json():
            assert p.get("donor_id") == tokens["donor_user"]["id"]

    def test_update_program(self, tokens):
        assert TestPrograms.created_id
        r = requests.patch(f"{API}/programs/{TestPrograms.created_id}",
                           json={"description": "updated"}, headers=_auth_headers(tokens["admin"]))
        assert r.status_code == 200
        assert r.json()["description"] == "updated"
        # verify GET
        r2 = requests.get(f"{API}/programs/{TestPrograms.created_id}", headers=_auth_headers(tokens["admin"]))
        assert r2.status_code == 200 and r2.json()["description"] == "updated"

    def test_program_achievement(self, tokens):
        # find seeded literasi program
        r = requests.get(f"{API}/programs", headers=_auth_headers(tokens["admin"]))
        pid = next(p["id"] for p in r.json() if "Literasi Digital Desa" in p["title"])
        r2 = requests.get(f"{API}/programs/{pid}/achievement", headers=_auth_headers(tokens["donor"]))
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert "kpi" in d and "courses" in d
        assert "overall_completion" in d["kpi"]
        assert "target_beneficiaries" in d["kpi"]

    def test_delete_program(self, tokens):
        assert TestPrograms.created_id
        r = requests.delete(f"{API}/programs/{TestPrograms.created_id}", headers=_auth_headers(tokens["admin"]))
        assert r.status_code == 200
        r2 = requests.get(f"{API}/programs/{TestPrograms.created_id}", headers=_auth_headers(tokens["admin"]))
        assert r2.status_code == 404


# ---------- Courses / Modules ----------
class TestCoursesModules:
    def test_instructor_sees_only_own(self, tokens):
        r = requests.get(f"{API}/courses", headers=_auth_headers(tokens["instr"]))
        assert r.status_code == 200
        for c in r.json():
            assert c["instructor_id"] == tokens["instr_user"]["id"]

    def test_admin_creates_course_and_instructor_updates(self, tokens):
        # get a program
        r = requests.get(f"{API}/programs", headers=_auth_headers(tokens["admin"]))
        pid = r.json()[0]["id"]
        create = requests.post(f"{API}/courses", json={
            "program_id": pid, "title": "TEST_Course", "description": "x",
            "instructor_id": tokens["instr_user"]["id"],
        }, headers=_auth_headers(tokens["admin"]))
        assert create.status_code == 200, create.text
        cid = create.json()["id"]

        # instructor can update own
        upd = requests.patch(f"{API}/courses/{cid}", json={"description": "upd"},
                             headers=_auth_headers(tokens["instr"]))
        assert upd.status_code == 200
        assert upd.json()["description"] == "upd"

        # module create by instructor
        mod = requests.post(f"{API}/modules", json={
            "course_id": cid, "title": "M1", "content": "hi", "order": 1, "has_assignment": False,
        }, headers=_auth_headers(tokens["instr"]))
        assert mod.status_code == 200
        mid = mod.json()["id"]

        # unrelated instructor cannot edit (register another instr)
        email = f"TEST_instr_{uuid.uuid4().hex[:6]}@ex.com"
        reg = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "pw12345", "name": "OtherInstr", "role": "instructor"})
        other_tok = reg.json()["token"]
        forbidden = requests.patch(f"{API}/modules/{mid}", json={"title": "hack"},
                                   headers=_auth_headers(other_tok))
        assert forbidden.status_code == 403

        # cleanup
        requests.delete(f"{API}/modules/{mid}", headers=_auth_headers(tokens["instr"]))
        requests.delete(f"{API}/courses/{cid}", headers=_auth_headers(tokens["admin"]))


# ---------- Student flow ----------
class TestStudentFlow:
    def test_enroll_idempotent_and_progress(self, tokens):
        # find seeded course "Dasar Komputer"
        r = requests.get(f"{API}/courses", headers=_auth_headers(tokens["instr"]))
        courses = r.json()
        target = next((c for c in courses if "Dasar Komputer" in c["title"]), None)
        assert target, f"Seeded course missing: {[c['title'] for c in courses]}"
        cid = target["id"]

        # course detail with modules
        det = requests.get(f"{API}/courses/{cid}", headers=_auth_headers(tokens["stud"]))
        assert det.status_code == 200
        mods = det.json()["modules"]
        assert len(mods) == 3, f"Expected 3 modules got {len(mods)}"
        assignment_mod = next((m for m in mods if m.get("has_assignment")), None)
        assert assignment_mod is not None, "One module should have has_assignment=True"

        # enroll (idempotent)
        e1 = requests.post(f"{API}/enrollments", json={"course_id": cid},
                           headers=_auth_headers(tokens["stud"]))
        assert e1.status_code == 200
        e2 = requests.post(f"{API}/enrollments", json={"course_id": cid},
                           headers=_auth_headers(tokens["stud"]))
        assert e2.status_code == 200
        assert e1.json()["id"] == e2.json()["id"]

        # mark first module as done
        first_mod = mods[0]["id"]
        mk = requests.post(f"{API}/progress/mark", json={"module_id": first_mod},
                           headers=_auth_headers(tokens["stud"]))
        assert mk.status_code == 200

        # my enrollments has progress_pct > 0
        my = requests.get(f"{API}/enrollments/my", headers=_auth_headers(tokens["stud"]))
        assert my.status_code == 200
        row = next(x for x in my.json() if x["course_id"] == cid)
        assert row["progress_pct"] > 0
        assert row["completed_modules"] >= 1

        # unmark
        un = requests.delete(f"{API}/progress/{first_mod}", headers=_auth_headers(tokens["stud"]))
        assert un.status_code == 200

        # submit assignment
        sub = requests.post(f"{API}/submissions", json={
            "module_id": assignment_mod["id"],
            "drive_link": "https://drive.google.com/test-TEST",
            "notes": "TEST submission",
        }, headers=_auth_headers(tokens["stud"]))
        assert sub.status_code == 200, sub.text
        sub_id = sub.json()["id"]

        # cannot submit for non-assignment module
        non_assign = next(m for m in mods if not m.get("has_assignment"))
        bad = requests.post(f"{API}/submissions", json={
            "module_id": non_assign["id"], "drive_link": "x",
        }, headers=_auth_headers(tokens["stud"]))
        assert bad.status_code == 400

        # instructor sees submissions
        subs = requests.get(f"{API}/submissions/course/{cid}", headers=_auth_headers(tokens["instr"]))
        assert subs.status_code == 200
        assert any(s["id"] == sub_id for s in subs.json())

        # grade
        gr = requests.post(f"{API}/submissions/{sub_id}/grade",
                           json={"score": 85, "feedback": "good"},
                           headers=_auth_headers(tokens["instr"]))
        assert gr.status_code == 200
        assert gr.json()["score"] == 85

        # over-max fails
        over = requests.post(f"{API}/submissions/{sub_id}/grade",
                             json={"score": 9999, "feedback": ""},
                             headers=_auth_headers(tokens["instr"]))
        assert over.status_code == 400


# ---------- Overview / Stats ----------
class TestOverview:
    def test_instructor_overview(self, tokens):
        r = requests.get(f"{API}/instructor/overview", headers=_auth_headers(tokens["instr"]))
        assert r.status_code == 200
        d = r.json()
        assert "kpi" in d and "cohorts" in d
        assert "courses" in d["kpi"]

    def test_admin_stats(self, tokens):
        r = requests.get(f"{API}/admin/stats", headers=_auth_headers(tokens["admin"]))
        assert r.status_code == 200
        d = r.json()
        assert d["users"]["admin"] >= 1
        assert "programs" in d and "courses" in d

    def test_donor_forbidden_from_admin_stats(self, tokens):
        r = requests.get(f"{API}/admin/stats", headers=_auth_headers(tokens["donor"]))
        assert r.status_code == 403
