import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { useParams } from 'react-router-dom';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { CheckCircle2, Circle, FileText, ExternalLink } from 'lucide-react';

export default function CoursePlayer() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState({ completed_module_ids: [], submissions: [] });
  const [active, setActive] = useState(null);
  const [driveLink, setDriveLink] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    const [c, p] = await Promise.all([api.get(`/courses/${id}`), api.get(`/progress/my/${id}`)]);
    setCourse(c.data);
    setProgress(p.data);
    if (!active && c.data.modules.length > 0) setActive(c.data.modules[0]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (!active) return;
    const sub = progress.submissions.find((s) => s.module_id === active.id);
    setDriveLink(sub?.drive_link || '');
    setNotes(sub?.notes || '');
  }, [active, progress]);

  if (!course) return <Shell><div>Memuat…</div></Shell>;

  const doneIds = new Set(progress.completed_module_ids);
  const isDone = active && doneIds.has(active.id);
  const currentSub = progress.submissions.find((s) => s.module_id === active?.id);

  const mark = async () => {
    if (!active) return;
    try {
      if (isDone) await api.delete(`/progress/${active.id}`);
      else await api.post('/progress/mark', { module_id: active.id });
      toast.success(isDone ? 'Tanda dilepas' : 'Materi ditandai selesai');
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/submissions', { module_id: active.id, drive_link: driveLink, notes });
      toast.success('Tugas dikirim');
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const total = course.modules.length;
  const completed = progress.completed_module_ids.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <Shell>
      <div className="mb-6">
        <p className="label">Sedang belajar</p>
        <h2 className="text-3xl font-semibold">{course.title}</h2>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-white border border-[#E5E5E0] rounded-full overflow-hidden">
            <div className="h-full bg-[#1A4D2E]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-semibold">{pct}% ({completed}/{total})</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {active ? (
            <div className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label">Materi #{active.order}</p>
                  <h3 className="text-2xl font-semibold mt-1">{active.title}</h3>
                </div>
                <button onClick={mark} data-testid="mark-done-btn"
                  className={`btn ${isDone ? 'btn-secondary' : 'btn-accent'} text-sm flex items-center gap-2`}>
                  {isDone ? <><CheckCircle2 size={16} /> Selesai</> : <><Circle size={16} /> Tandai Sudah Paham</>}
                </button>
              </div>
              <div className="mt-6 whitespace-pre-wrap text-[#1A1A1A] leading-relaxed">
                {active.content || <span className="text-[#666]">Belum ada konten teks. Silakan cek link/video yang diberikan instruktur.</span>}
              </div>

              {active.has_assignment && (
                <div className="mt-8 p-5 border border-[#F6D6C4] bg-[#FFF3EC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#E86A33]" />
                    <p className="font-semibold">Tugas: {active.assignment_title || active.title}</p>
                    <span className="chip chip-accent ml-auto">Max {active.max_score}</span>
                  </div>
                  {active.assignment_description && (
                    <p className="text-sm text-[#666] mt-2">{active.assignment_description}</p>
                  )}

                  {currentSub?.score != null && (
                    <div className="mt-3 p-3 bg-white rounded-md border border-[#E5E5E0]">
                      <p className="label">Skor</p>
                      <p className="text-2xl font-bold text-[#1A4D2E]">{currentSub.score} / {active.max_score}</p>
                      {currentSub.feedback && <p className="text-sm text-[#666] mt-1"><strong>Feedback:</strong> {currentSub.feedback}</p>}
                    </div>
                  )}

                  <form onSubmit={submit} className="mt-4 space-y-3" data-testid="submit-form">
                    <div>
                      <label className="label">Link Google Drive Tugas</label>
                      <input required type="url" placeholder="https://drive.google.com/..."
                        className="input mt-1" value={driveLink} onChange={(e) => setDriveLink(e.target.value)}
                        data-testid="submit-drive-link" />
                    </div>
                    <div>
                      <label className="label">Catatan (opsional)</label>
                      <textarea rows={2} className="input mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-primary text-sm" data-testid="submit-assignment-btn">
                        {currentSub ? 'Update Kiriman' : 'Kirim Tugas'}
                      </button>
                      {currentSub && (
                        <a href={currentSub.drive_link} target="_blank" rel="noreferrer" className="btn btn-outline text-sm flex items-center gap-1">
                          <ExternalLink size={14} /> Buka Kiriman
                        </a>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-10 text-center text-[#666]">Pilih materi.</div>
          )}
        </div>

        <div className="card p-5 h-fit" data-testid="curriculum-list">
          <p className="label mb-3">Kurikulum</p>
          <div className="space-y-1">
            {course.modules.map((m) => {
              const d = doneIds.has(m.id);
              const isActive = active?.id === m.id;
              return (
                <button key={m.id} onClick={() => setActive(m)}
                  data-testid={`curriculum-item-${m.id}`}
                  className={`w-full text-left p-3 rounded-md transition-colors duration-200 flex items-start gap-3 ${isActive ? 'bg-[#E9F1EC]' : 'hover:bg-[#F5F5F0]'}`}>
                  {d ? <CheckCircle2 size={18} className="text-[#1A4D2E] mt-0.5" /> : <Circle size={18} className="text-[#666] mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.order}. {m.title}</p>
                    {m.has_assignment && <span className="chip chip-accent mt-1">Tugas</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
