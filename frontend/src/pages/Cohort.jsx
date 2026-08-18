import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { api } from '../lib/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';

export default function Cohort() {
  const [ov, setOv] = useState(null);
  useEffect(() => { api.get('/instructor/overview').then((r) => setOv(r.data)); }, []);
  if (!ov) return <Shell><div>Memuat…</div></Shell>;

  return (
    <Shell>
      <h2 className="text-3xl font-semibold">Ketercapaian Cohort</h2>
      <p className="text-[#666] mt-1 mb-6">Ringkasan seluruh course yang Anda pegang.</p>

      <div className="card p-6 mb-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={ov.cohorts}>
            <CartesianGrid stroke="#E5E5E0" strokeDasharray="3 3" />
            <XAxis dataKey="title" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip /><Legend />
            <Bar dataKey="students" fill="#4F6F52" name="Peserta" radius={[4,4,0,0]} />
            <Bar dataKey="modules" fill="#1A4D2E" name="Materi" radius={[4,4,0,0]} />
            <Bar dataKey="pending_grading" fill="#E86A33" name="Menunggu Nilai" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Course</th><th>Peserta</th><th>Materi</th><th>Completion</th><th>Menunggu Nilai</th></tr></thead>
          <tbody>
            {ov.cohorts.map((c) => (
              <tr key={c.course_id}>
                <td className="font-medium">{c.title}</td>
                <td>{c.students}</td>
                <td>{c.modules}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 bg-[#F5F5F0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A4D2E]" style={{ width: `${c.completion_rate}%` }} />
                    </div>
                    <span className="text-sm">{c.completion_rate}%</span>
                  </div>
                </td>
                <td>{c.pending_grading > 0 ? <span className="chip chip-accent">{c.pending_grading}</span> : <span className="chip">0</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
