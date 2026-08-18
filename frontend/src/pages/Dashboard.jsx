import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import Shell from '../components/Shell';
import { ROLE_LABEL } from '../lib/constants';
import { Users, Target, BookOpen, GraduationCap, ClipboardList, Award, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, LineChart, Line
} from 'recharts';

const Stat = ({ icon: Icon, label, value, accent }) => (
  <div className="card p-6 transition-transform duration-200 hover:-translate-y-0.5" data-testid={`stat-${label}`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent || 'bg-[#E9F1EC] text-[#1A4D2E]'}`}>
        <Icon size={20} />
      </div>
      <p className="label">{label}</p>
    </div>
    <p className="text-3xl font-bold mt-4">{value}</p>
  </div>
);

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [programs, setPrograms] = useState([]);
  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data));
    api.get('/programs').then((r) => setPrograms(r.data));
  }, []);

  const roleData = stats ? [
    { name: 'Donor', value: stats.users.donor },
    { name: 'Instruktur', value: stats.users.instructor },
    { name: 'Student', value: stats.users.student },
    { name: 'Admin', value: stats.users.admin },
  ] : [];
  const COLORS = ['#E86A33', '#4F6F52', '#1A4D2E', '#8AA88E'];

  return (
    <div>
      <h2 className="text-3xl font-semibold">Admin Overview</h2>
      <p className="text-[#666] mt-1 mb-8">Kelola program, course, dan pengguna dari satu tempat.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Target} label="Program" value={stats?.programs ?? '—'} />
        <Stat icon={BookOpen} label="Course" value={stats?.courses ?? '—'} accent="bg-[#FFF3EC] text-[#E86A33]" />
        <Stat icon={Users} label="Pengguna" value={stats?.users?.total ?? '—'} />
        <Stat icon={ClipboardList} label="Submissions" value={stats?.submissions ?? '—'} accent="bg-[#FFF3EC] text-[#E86A33]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="card p-6 md:col-span-2">
          <h3 className="text-xl font-semibold mb-4">Program & Beneficiary</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={programs.map((p) => ({ name: p.title, target: p.target_beneficiaries, enrolled: p.enrolled_students }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="target" fill="#4F6F52" name="Target" radius={[4,4,0,0]} />
              <Bar dataKey="enrolled" fill="#E86A33" name="Enrolled" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4">Distribusi Pengguna</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function DonorDashboard() {
  const [programs, setPrograms] = useState([]);
  const [details, setDetails] = useState({});
  useEffect(() => {
    api.get('/programs').then(async (r) => {
      setPrograms(r.data);
      const detailMap = {};
      await Promise.all(
        r.data.map((p) =>
          api.get(`/programs/${p.id}/achievement`).then((res) => (detailMap[p.id] = res.data))
        )
      );
      setDetails(detailMap);
    });
  }, []);

  const totalTarget = programs.reduce((a, p) => a + (p.target_beneficiaries || 0), 0);
  const totalEnrolled = programs.reduce((a, p) => a + (p.enrolled_students || 0), 0);
  const totalCourses = programs.reduce((a, p) => a + (p.course_count || 0), 0);
  const overall = programs.length
    ? Math.round(
        programs.reduce((a, p) => a + (details[p.id]?.kpi?.overall_completion || 0), 0) / programs.length
      )
    : 0;

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden mb-8 h-40">
        <img src="https://images.pexels.com/photos/15119089/pexels-photo-15119089.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 p-8 h-full flex flex-col justify-center text-white">
          <p className="text-xs uppercase tracking-widest opacity-80">Dampak Anda</p>
          <h2 className="text-3xl font-bold">Ringkasan capaian program</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={TrendingUp} label="Rata2 Completion" value={`${overall}%`} accent="bg-[#FFF3EC] text-[#E86A33]" />
        <Stat icon={Users} label="Target Sasaran" value={totalTarget} />
        <Stat icon={GraduationCap} label="Peserta Aktual" value={totalEnrolled} />
        <Stat icon={BookOpen} label="Course" value={totalCourses} />
      </div>

      <div className="mt-8 space-y-4">
        {programs.map((p) => {
          const d = details[p.id];
          return (
            <div key={p.id} className="card p-6" data-testid={`donor-program-${p.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">{p.title}</h3>
                  <p className="text-sm text-[#666] mt-1">{p.description}</p>
                </div>
                <span className="chip chip-primary">{p.status}</span>
              </div>
              {d && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                  <div><p className="label">Target</p><p className="font-semibold">{d.kpi.target_beneficiaries}</p></div>
                  <div><p className="label">Peserta</p><p className="font-semibold">{d.kpi.enrolled_students}</p></div>
                  <div><p className="label">Course</p><p className="font-semibold">{d.kpi.courses}</p></div>
                  <div><p className="label">Completion</p><p className="font-semibold">{d.kpi.overall_completion}%</p></div>
                  <div><p className="label">Avg Score</p><p className="font-semibold">{d.kpi.average_score}</p></div>
                </div>
              )}
              {d?.courses?.length > 0 && (
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={d.courses}>
                      <CartesianGrid stroke="#E5E5E0" strokeDasharray="3 3" />
                      <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="completion_rate" fill="#1A4D2E" name="Completion %" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
        {programs.length === 0 && (
          <div className="card p-10 text-center text-[#666]">
            Belum ada program yang di-assign untuk Anda. Hubungi admin.
          </div>
        )}
      </div>
    </div>
  );
}

function InstructorDashboard() {
  const [ov, setOv] = useState(null);
  useEffect(() => { api.get('/instructor/overview').then((r) => setOv(r.data)); }, []);
  if (!ov) return <div>Memuat…</div>;

  return (
    <div>
      <h2 className="text-3xl font-semibold">Ruang Instruktur</h2>
      <p className="text-[#666] mt-1 mb-8">Pantau kelas, kelola materi, dan nilai peserta.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={BookOpen} label="Course" value={ov.kpi.courses} />
        <Stat icon={Users} label="Peserta" value={ov.kpi.students} />
        <Stat icon={ClipboardList} label="Submissions" value={ov.kpi.submissions} accent="bg-[#FFF3EC] text-[#E86A33]" />
        <Stat icon={Award} label="Belum Dinilai" value={ov.kpi.pending_grading} accent="bg-[#FFF3EC] text-[#E86A33]" />
      </div>

      <div className="card p-6 mt-8">
        <h3 className="text-xl font-semibold mb-4">Progress Cohort</h3>
        {ov.cohorts.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={ov.cohorts}>
              <CartesianGrid stroke="#E5E5E0" strokeDasharray="3 3" />
              <XAxis dataKey="title" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="completion_rate" stroke="#1A4D2E" strokeWidth={3} dot={{ r: 5, fill: '#E86A33' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-[#666]">Belum ada course. Minta admin membuatkan course untuk Anda atau tanyakan penugasan.</p>}
      </div>
    </div>
  );
}

function StudentDashboard() {
  const [enrolls, setEnrolls] = useState([]);
  useEffect(() => { api.get('/enrollments/my').then((r) => setEnrolls(r.data)); }, []);

  const overallProgress = enrolls.length
    ? Math.round(enrolls.reduce((a, e) => a + e.progress_pct, 0) / enrolls.length)
    : 0;
  const avgScore = enrolls.length
    ? Math.round(enrolls.reduce((a, e) => a + e.average_score, 0) / enrolls.length)
    : 0;

  return (
    <div>
      <h2 className="text-3xl font-semibold">Ruang Belajar Saya</h2>
      <p className="text-[#666] mt-1 mb-8">Lanjutkan kursus dan lihat skor Anda.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat icon={GraduationCap} label="Kursus Diikuti" value={enrolls.length} />
        <Stat icon={TrendingUp} label="Progress Rata2" value={`${overallProgress}%`} accent="bg-[#FFF3EC] text-[#E86A33]" />
        <Stat icon={Award} label="Skor Rata2" value={avgScore} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {enrolls.map((e) => (
          <a key={e.id} href={`/course/${e.course_id}`} className="card p-6 hover:-translate-y-0.5 transition-transform duration-200 block" data-testid={`enroll-card-${e.course_id}`}>
            <h3 className="text-lg font-semibold">{e.course.title}</h3>
            <p className="text-sm text-[#666] mt-1 line-clamp-2">{e.course.description}</p>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1"><span>Progress</span><span>{e.progress_pct}%</span></div>
              <div className="h-2 bg-[#F5F5F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#1A4D2E]" style={{ width: `${e.progress_pct}%` }} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <span className="chip">{e.completed_modules}/{e.total_modules} materi</span>
              <span className="chip chip-accent">Skor: {e.average_score}</span>
            </div>
          </a>
        ))}
        {enrolls.length === 0 && (
          <div className="card p-8 text-center text-[#666] md:col-span-2">
            Anda belum mendaftar course apa pun. Kunjungi <a href="/browse" className="link">Katalog Course</a>.
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <Shell>
      {user?.role === 'admin' && <AdminDashboard />}
      {user?.role === 'donor' && <DonorDashboard />}
      {user?.role === 'instructor' && <InstructorDashboard />}
      {user?.role === 'student' && <StudentDashboard />}
    </Shell>
  );
}
