import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { ExternalLink, Award } from 'lucide-react';

export default function Grading() {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [grading, setGrading] = useState({});

  useEffect(() => {
    api.get('/courses').then((r) => {
      setCourses(r.data);
      if (r.data.length > 0) setSelected(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/submissions/course/${selected}`).then((r) => setSubmissions(r.data));
  }, [selected]);

  const grade = async (subId, maxScore) => {
    const state = grading[subId] || {};
    const score = Number(state.score);
    if (isNaN(score) || score < 0 || score > maxScore) {
      toast.error(`Skor 0-${maxScore}`); return;
    }
    try {
      await api.post(`/submissions/${subId}/grade`, { score, feedback: state.feedback || '' });
      toast.success('Nilai tersimpan');
      const r = await api.get(`/submissions/course/${selected}`);
      setSubmissions(r.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <Shell>
      <h2 className="text-3xl font-semibold">Penilaian Tugas</h2>
      <p className="text-[#666] mt-1 mb-6">Berikan skor & feedback untuk peserta.</p>

      <div className="card p-4 mb-6 flex flex-wrap gap-2">
        {courses.map((c) => (
          <button key={c.id} onClick={() => setSelected(c.id)}
            className={`btn text-sm ${selected === c.id ? 'btn-primary' : 'btn-outline'}`} data-testid={`grading-course-${c.id}`}>
            {c.title}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="table" data-testid="grading-table">
          <thead>
            <tr>
              <th>Peserta</th><th>Materi/Tugas</th><th>Kiriman</th><th>Skor</th><th>Feedback</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => {
              const state = grading[s.id] || { score: s.score ?? '', feedback: s.feedback ?? '' };
              return (
                <tr key={s.id} data-testid={`submission-row-${s.id}`}>
                  <td>
                    <p className="font-medium">{s.student?.name}</p>
                    <p className="text-xs text-[#666]">{s.student?.email}</p>
                  </td>
                  <td>{s.module?.title}<br /><span className="text-xs text-[#666]">Max {s.module?.max_score}</span></td>
                  <td><a href={s.drive_link} target="_blank" rel="noreferrer" className="link text-sm flex items-center gap-1"><ExternalLink size={12} /> Drive</a></td>
                  <td className="w-24">
                    <input type="number" min={0} max={s.module?.max_score || 100} className="input" value={state.score}
                      onChange={(e) => setGrading({ ...grading, [s.id]: { ...state, score: e.target.value } })}
                      data-testid={`grade-score-${s.id}`} />
                  </td>
                  <td className="w-64">
                    <input className="input" placeholder="Catatan…" value={state.feedback}
                      onChange={(e) => setGrading({ ...grading, [s.id]: { ...state, feedback: e.target.value } })}
                      data-testid={`grade-feedback-${s.id}`} />
                  </td>
                  <td>
                    <button onClick={() => grade(s.id, s.module?.max_score || 100)}
                      className="btn btn-primary text-sm flex items-center gap-1" data-testid={`grade-submit-${s.id}`}>
                      <Award size={14} /> Simpan
                    </button>
                  </td>
                </tr>
              );
            })}
            {submissions.length === 0 && (
              <tr><td colSpan={6} className="text-center text-[#666] p-10">Belum ada kiriman.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
