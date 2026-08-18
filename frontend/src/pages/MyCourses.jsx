import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { BookOpen, TrendingUp, Award } from 'lucide-react';

export default function MyCourses() {
  const [enrolls, setEnrolls] = useState([]);
  useEffect(() => { api.get('/enrollments/my').then((r) => setEnrolls(r.data)); }, []);

  return (
    <Shell>
      <h2 className="text-3xl font-semibold">Kursus Saya</h2>
      <p className="text-[#666] mt-1 mb-6">Semua course yang sedang Anda ikuti.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrolls.map((e) => (
          <Link to={`/course/${e.course_id}`} key={e.id} className="card overflow-hidden hover:-translate-y-0.5 transition-transform duration-200 block" data-testid={`my-course-${e.course_id}`}>
            <img src={e.course.thumbnail || 'https://images.unsplash.com/photo-1758270705290-62b6294dd044'} alt="" className="w-full h-36 object-cover" />
            <div className="p-5">
              <h3 className="font-semibold">{e.course.title}</h3>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1"><span>Progress</span><span>{e.progress_pct}%</span></div>
                <div className="h-2 bg-[#F5F5F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1A4D2E]" style={{ width: `${e.progress_pct}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="chip"><BookOpen size={12} className="mr-1" /> {e.completed_modules}/{e.total_modules}</span>
                <span className="chip chip-primary"><TrendingUp size={12} className="mr-1" /> {e.progress_pct}%</span>
                <span className="chip chip-accent"><Award size={12} className="mr-1" /> {e.average_score}</span>
              </div>
            </div>
          </Link>
        ))}
        {enrolls.length === 0 && <div className="card p-10 text-center text-[#666] md:col-span-3">Belum mengikuti course. Jelajahi <Link to="/browse" className="link">Katalog</Link>.</div>}
      </div>
    </Shell>
  );
}
