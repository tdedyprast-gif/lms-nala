import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BookOpen } from 'lucide-react';

const ALUR = [
  { icon: '📝', judul: 'Daftar Akun', teks: 'Buat akun Anda untuk mulai menggunakan LMS.' },
  { icon: '🔍', judul: 'Pilih Course', teks: 'Jelajahi berbagai materi kursus yang tersedia.' },
  { icon: '📚', judul: 'Mulai Belajar', teks: 'Akses materi, kerjakan tugas, dan kembangkan diri Anda.' },
  { icon: '🎓', judul: 'Capai Target', teks: 'Selesaikan kursus dan tingkatkan keahlian Anda.' },
];

const THUMBS = [
  'https://images.unsplash.com/photo-1758270705290-62b6294dd044',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f',
  'https://images.pexels.com/photos/5905486/pexels-photo-5905486.jpeg',
];

export default function Landing() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const c = await api.get('/courses');
      setCourses(c.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const aksesCourse = (id) => {
    if (user) {
      // sudah login → arahkan ke dashboard atau courses
      nav('/dashboard');
      return;
    }
    nav('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="landing-page">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A4D2E] rounded-full flex items-center justify-center text-white text-sm font-bold">C</div>
            <div>
              <div className="font-extrabold text-[#1A4D2E] leading-tight">Circlo</div>
              <div className="text-[11px] text-slate-500 leading-tight">LMS Platform</div>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <a href="#courses" className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-slate-600 hover:text-[#1A4D2E]">
              Materi Kursus
            </a>
            <a href="#alur" className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-slate-600 hover:text-[#1A4D2E]">
              Cara Belajar
            </a>
            {user ? (
              <Link to="/dashboard" className="btn btn-primary bg-[#1A4D2E] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#143B23] transition-colors" data-testid="landing-dashboard">
                Buka Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn px-4 py-2 text-sm text-[#1A4D2E] border border-[#1A4D2E] rounded-lg hover:bg-slate-50 transition-colors" data-testid="landing-daftar-top">
                  Daftar
                </Link>
                <Link to="/login" className="btn bg-[#1A4D2E] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#143B23] transition-colors" data-testid="landing-login">
                  Masuk
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#1A4D2E]/10 via-white to-slate-100 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <span className="px-3 py-1 rounded-full bg-[#1A4D2E]/10 text-[#1A4D2E] text-sm font-medium">Platform Edukasi</span>
          <h1 className="text-3xl md:text-5xl font-extrabold mt-4 text-slate-800">
            Mulai Perjalanan Belajarmu,<br className="hidden md:block" /> Bersama Kami
          </h1>
          <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
            Jelajahi berbagai materi kursus, kerjakan tugas, dan tingkatkan keahlian Anda
            melalui platform pembelajaran terpadu.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <a href="#courses" className="bg-[#1A4D2E] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#143B23] transition-colors" data-testid="hero-lihat-courses">
              Lihat Materi Kursus
            </a>
            {!user && (
              <Link to="/login" className="border border-[#1A4D2E] text-[#1A4D2E] px-6 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors" data-testid="hero-login">
                Mulai Belajar
              </Link>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-12">
            <div>
              <div className="text-2xl font-extrabold text-[#1A4D2E]">{courses.length}</div>
              <div className="text-xs text-slate-500 mt-1">Course Tersedia</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#1A4D2E]">
                {courses.reduce((s, c) => s + (c.module_count || 0), 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Modul Pembelajaran</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#1A4D2E]">100%</div>
              <div className="text-xs text-slate-500 mt-1">Akses Fleksibel</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Courses ── */}
      <section id="courses" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold">Materi Kursus</h2>
          <p className="text-slate-600 mt-2">Pilih kursus yang Anda minati, lalu klik akses untuk mulai belajar.</p>
        </div>

        {loading && <div className="text-center text-slate-500 py-12">Memuat course…</div>}

        {!loading && courses.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 text-center text-slate-500 py-12">
            Belum ada materi kursus yang tersedia.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow" data-testid={`course-card-${c.id}`}>
              <div className="h-44 bg-slate-100 overflow-hidden">
                <img src={c.thumbnail || THUMBS[0]} alt={c.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg leading-tight">{c.title}</h3>
                </div>
                {c.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{c.description}</p>}

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs flex items-center font-medium">
                    <BookOpen size={12} className="mr-1" /> {c.module_count || 0} materi
                  </span>
                  {c.instructor_name && (
                    <span className="bg-[#1A4D2E]/10 text-[#1A4D2E] px-2.5 py-1 rounded-full text-xs font-medium">
                      {c.instructor_name}
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-5">
                  <button
                    onClick={() => aksesCourse(c.id)}
                    data-testid={`course-akses-${c.id}`}
                    className="w-full py-2.5 rounded-xl justify-center bg-[#1A4D2E] text-white font-medium hover:bg-[#143B23] transition-colors"
                  >
                    Akses Course
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Alur ── */}
      <section id="alur" className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold">Cara Belajar</h2>
            <p className="text-slate-600 mt-2">Empat langkah mudah memulai perjalanan belajarmu.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ALUR.map((s, i) => (
              <div key={s.judul} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#1A4D2E]/10 grid place-items-center text-2xl mx-auto">
                  {s.icon}
                </div>
                <div className="text-xs font-bold text-[#1A4D2E] mt-3">LANGKAH {i + 1}</div>
                <div className="font-bold mt-1">{s.judul}</div>
                <p className="text-sm text-slate-500 mt-1">{s.teks}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-[#1A4D2E]/5 border border-[#1A4D2E]/20 rounded-2xl text-center py-12">
          <h2 className="text-xl md:text-2xl font-extrabold">Sudah siap belajar hari ini?</h2>
          <p className="text-slate-600 mt-2">Daftar sekarang, atau masuk jika Anda sudah punya akun.</p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Link to="/register" className="bg-[#1A4D2E] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#143B23] transition-colors" data-testid="cta-daftar">Daftar Sekarang</Link>
            <Link to="/login" className="border border-[#1A4D2E] text-[#1A4D2E] px-6 py-3 rounded-lg font-medium hover:bg-white transition-colors" data-testid="cta-login">Masuk</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} Circlo LMS Platform
          </div>
          <div className="flex gap-4 text-sm">
            <Link to="/register" className="text-slate-600 hover:text-[#1A4D2E]">Daftar</Link>
            <Link to="/login" className="text-slate-600 hover:text-[#1A4D2E]">Masuk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
