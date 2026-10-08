import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BookOpen } from 'lucide-react';

export default function Landing() {
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const nav = useNavigate();
  const { user } = useAuth();

  const load = async () => {
    try {
      const [c, p] = await Promise.all([api.get('/courses'), api.get('/programs')]);
      setCourses(c.data); setPrograms(p.data);
      if (user?.role === 'admin') {
        const u = await api.get('/users?role=instructor');
        setInstructors(u.data);
      }
    } catch (e) {
      console.error(e);
      setCourses([
          { id: 1, title: "Pengenalan LMS", description: "Pelajari cara menggunakan LMS untuk proses belajar mengajar.", module_count: 5, instructor_name: "Admin" },
          { id: 2, title: "Dasar Pemrograman", description: "Materi pengenalan logika dasar dan bahasa pemrograman.", module_count: 12, instructor_name: "Instruktur" }
      ]);
    }
  };
  useEffect(() => { load(); }, [user]);

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <header className="bg-white border-b border-[#E5E5E0] py-4 px-8 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-[#1A4D2E] flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A4D2E] rounded-full flex items-center justify-center text-white text-sm">C</div>
            Circlo
        </h1>
        <div className="flex gap-4">
          <Link to="/login" className="btn bg-transparent text-[#1A4D2E] hover:bg-gray-100 px-4 py-2 rounded-lg font-medium">Masuk</Link>
          <Link to="/register" className="btn bg-[#1A4D2E] text-white hover:bg-[#143B23] px-4 py-2 rounded-lg font-medium">Daftar</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-20">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-5xl font-extrabold text-[#111] mb-6 leading-tight">Mulai Perjalanan <span className="text-[#1A4D2E]">Belajarmu</span> Bersama Kami</h2>
          <p className="text-xl text-[#666] leading-relaxed">Platform pembelajaran terpadu untuk meningkatkan keahlian dan mencapai potensi terbaikmu.</p>
        </div>

        <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-[#111]">Materi Kursus Tersedia</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map(c => (
            <div key={c.id} className="card overflow-hidden bg-white shadow-sm border border-[#E5E5E0] rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col h-full">
              <img src={c.thumbnail || 'https://images.unsplash.com/photo-1758270705290-62b6294dd044'} alt="" className="w-full h-48 object-cover" />
              <div className="p-6 flex flex-col flex-1">
                <h4 className="text-xl font-bold text-[#111] leading-snug">{c.title}</h4>
                <p className="text-sm text-[#666] mt-3 line-clamp-2 flex-1">{c.description}</p>
                <div className="flex flex-wrap gap-2 mt-5">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs flex items-center font-medium"><BookOpen size={14} className="mr-1.5" /> {c.module_count} materi</span>
                  {c.instructor_name && <span className="bg-[#1A4D2E]/10 text-[#1A4D2E] px-3 py-1 rounded-full text-xs font-medium">{c.instructor_name}</span>}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <button onClick={() => nav('/login')} className="w-full bg-[#1A4D2E] text-white hover:bg-[#143B23] py-3 rounded-xl font-semibold transition-colors flex items-center justify-center">Akses Course</button>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full bg-white border border-[#E5E5E0] rounded-2xl p-12 text-center text-[#666]">
              Memuat course...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
