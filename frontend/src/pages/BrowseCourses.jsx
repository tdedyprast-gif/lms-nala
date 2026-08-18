import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, BookOpen } from 'lucide-react';

export default function BrowseCourses() {
  const [courses, setCourses] = useState([]);
  const [enrolls, setEnrolls] = useState([]);

  const load = async () => {
    const [c, e] = await Promise.all([api.get('/courses'), api.get('/enrollments/my')]);
    setCourses(c.data); setEnrolls(e.data);
  };
  useEffect(() => { load(); }, []);

  const enrolledIds = new Set(enrolls.map((e) => e.course_id));

  const enroll = async (courseId) => {
    try {
      await api.post('/enrollments', { course_id: courseId });
      toast.success('Berhasil mendaftar');
      load();
    } catch (e) { toast.error('Gagal mendaftar'); }
  };

  return (
    <Shell>
      <h2 className="text-3xl font-semibold">Katalog Course</h2>
      <p className="text-[#666] mt-1 mb-8">Pilih course dan mulai belajar.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((c) => {
          const enrolled = enrolledIds.has(c.id);
          return (
            <div key={c.id} className="card overflow-hidden" data-testid={`browse-course-${c.id}`}>
              <img src={c.thumbnail || 'https://images.unsplash.com/photo-1758270705290-62b6294dd044'} alt="" className="w-full h-40 object-cover" />
              <div className="p-5">
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <p className="text-sm text-[#666] mt-1 line-clamp-2">{c.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="chip"><BookOpen size={12} className="mr-1" /> {c.module_count} materi</span>
                  {c.instructor_name && <span className="chip chip-primary">{c.instructor_name}</span>}
                </div>
                <div className="mt-4">
                  {enrolled ? (
                    <Link to={`/course/${c.id}`} className="btn btn-secondary text-sm flex items-center justify-center gap-1">
                      <CheckCircle2 size={16} /> Lanjutkan
                    </Link>
                  ) : (
                    <button onClick={() => enroll(c.id)} className="btn btn-primary w-full text-sm" data-testid={`enroll-btn-${c.id}`}>Daftar Course</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {courses.length === 0 && <div className="card p-10 text-center text-[#666] md:col-span-3">Belum ada course tersedia.</div>}
      </div>
    </Shell>
  );
}
