import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { useParams } from 'react-router-dom';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, FileText } from 'lucide-react';

export default function CourseManage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', content: '', order: 1, has_assignment: false,
    assignment_title: '', assignment_description: '', max_score: 100,
  });

  const load = () => api.get(`/courses/${id}`).then((r) => setCourse(r.data));
  useEffect(() => { load(); }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, course_id: id, order: Number(form.order), max_score: Number(form.max_score) };
      if (editing) await api.patch(`/modules/${editing}`, payload);
      else await api.post('/modules', payload);
      setShowForm(false); setEditing(null);
      setForm({ title: '', content: '', order: 1, has_assignment: false, assignment_title: '', assignment_description: '', max_score: 100 });
      toast.success('Tersimpan'); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const remove = async (mid) => {
    if (!window.confirm('Hapus materi?')) return;
    await api.delete(`/modules/${mid}`); toast.success('Terhapus'); load();
  };

  const startEdit = (m) => {
    setEditing(m.id);
    setForm({
      title: m.title, content: m.content || '', order: m.order || 1,
      has_assignment: !!m.has_assignment,
      assignment_title: m.assignment_title || '',
      assignment_description: m.assignment_description || '',
      max_score: m.max_score || 100,
    });
    setShowForm(true);
  };

  if (!course) return <Shell><div>Memuat…</div></Shell>;

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label">Kurikulum</p>
          <h2 className="text-3xl font-semibold">{course.title}</h2>
          <p className="text-[#666] mt-1">{course.description}</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ title: '', content: '', order: (course.modules?.length || 0) + 1, has_assignment: false, assignment_title: '', assignment_description: '', max_score: 100 }); }}
          className="btn btn-primary flex items-center gap-2" data-testid="new-module-btn">
          <Plus size={16} /> Materi Baru
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-6 mb-8 space-y-4" data-testid="module-form">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="label">Judul Materi</label>
              <input required className="input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="module-title" />
            </div>
            <div>
              <label className="label">Urutan</label>
              <input type="number" className="input mt-1" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Konten / Materi</label>
            <textarea rows={5} className="input mt-1" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Isi teks materi atau link video/PDF…" />
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-[#1A4D2E]" checked={form.has_assignment} onChange={(e) => setForm({ ...form, has_assignment: e.target.checked })} data-testid="module-has-assignment" />
            <span className="font-medium">Ada Tugas / Assignment</span>
          </label>

          {form.has_assignment && (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="label">Judul Tugas</label>
                <input className="input mt-1" value={form.assignment_title} onChange={(e) => setForm({ ...form, assignment_title: e.target.value })} />
              </div>
              <div>
                <label className="label">Skor Maksimum</label>
                <input type="number" className="input mt-1" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <label className="label">Deskripsi Tugas</label>
                <textarea rows={2} className="input mt-1" value={form.assignment_description} onChange={(e) => setForm({ ...form, assignment_description: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn btn-primary" data-testid="module-save">{editing ? 'Update' : 'Simpan'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn btn-outline">Batal</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {course.modules.map((m, i) => (
          <div key={m.id} className="card p-5 flex items-start gap-4" data-testid={`module-row-${m.id}`}>
            <div className="w-10 h-10 rounded-md bg-[#E9F1EC] text-[#1A4D2E] flex items-center justify-center font-bold">{m.order || i + 1}</div>
            <div className="flex-1">
              <h3 className="font-semibold">{m.title}</h3>
              {m.content && <p className="text-sm text-[#666] mt-1 line-clamp-2">{m.content}</p>}
              {m.has_assignment && (
                <div className="mt-2">
                  <span className="chip chip-accent"><FileText size={12} className="mr-1" /> Tugas: {m.assignment_title || '(tanpa judul)'} · max {m.max_score}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(m)} className="btn btn-outline text-sm p-2"><Edit3 size={14} /></button>
              <button onClick={() => remove(m.id)} className="btn btn-outline text-sm p-2"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {course.modules.length === 0 && <div className="card p-10 text-center text-[#666]">Belum ada materi.</div>}
      </div>
    </Shell>
  );
}
