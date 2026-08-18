import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit3, BookOpen } from 'lucide-react';

const THUMBS = [
  'https://images.unsplash.com/photo-1758270705290-62b6294dd044',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f',
  'https://images.pexels.com/photos/5905486/pexels-photo-5905486.jpeg',
];

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', program_id: '', instructor_id: '', thumbnail: THUMBS[0] });

  const load = async () => {
    const [c, p] = await Promise.all([api.get('/courses'), api.get('/programs')]);
    setCourses(c.data); setPrograms(p.data);
    if (user.role === 'admin') {
      const u = await api.get('/users?role=instructor');
      setInstructors(u.data);
    }
  };
  useEffect(() => { load(); }, []);

  const canEdit = user?.role === 'admin' || user?.role === 'instructor';

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.patch(`/courses/${editing}`, {
        title: form.title, description: form.description,
        instructor_id: form.instructor_id || null, thumbnail: form.thumbnail,
      });
      else await api.post('/courses', form);
      setShowForm(false); setEditing(null);
      setForm({ title: '', description: '', program_id: '', instructor_id: '', thumbnail: THUMBS[0] });
      toast.success('Tersimpan'); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const remove = async (id) => {
    if (!window.confirm('Hapus course?')) return;
    await api.delete(`/courses/${id}`); toast.success('Terhapus'); load();
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setForm({
      title: c.title, description: c.description || '',
      program_id: c.program_id, instructor_id: c.instructor_id || '', thumbnail: c.thumbnail || THUMBS[0],
    });
    setShowForm(true);
  };

  return (
    <Shell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-semibold">{user.role === 'instructor' ? 'Course Saya' : 'Course'}</h2>
          <p className="text-[#666] mt-1">Kurikulum dan materi pembelajaran.</p>
        </div>
        {canEdit && (
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ title: '', description: '', program_id: programs[0]?.id || '', instructor_id: user.role === 'instructor' ? user.id : '', thumbnail: THUMBS[0] }); }}
            className="btn btn-primary flex items-center gap-2" data-testid="new-course-btn">
            <Plus size={16} /> Course Baru
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-6 mb-8 space-y-4" data-testid="course-form">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nama Course</label>
              <input required className="input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="course-title" />
            </div>
            <div>
              <label className="label">Program</label>
              <select required disabled={!!editing} className="input mt-1" value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })} data-testid="course-program">
                <option value="">— Pilih Program —</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>
          {user.role === 'admin' && (
            <div>
              <label className="label">Instruktur</label>
              <select className="input mt-1" value={form.instructor_id} onChange={(e) => setForm({ ...form, instructor_id: e.target.value })} data-testid="course-instructor">
                <option value="">— Tanpa Instruktur —</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.email})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Deskripsi</label>
            <textarea rows={3} className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Thumbnail</label>
            <div className="flex gap-3 mt-2">
              {THUMBS.map((t) => (
                <button type="button" key={t} onClick={() => setForm({ ...form, thumbnail: t })}
                  className={`w-24 h-16 rounded-md overflow-hidden border-2 ${form.thumbnail === t ? 'border-[#1A4D2E]' : 'border-transparent'}`}>
                  <img src={t} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-primary" data-testid="course-save">{editing ? 'Update' : 'Simpan'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn btn-outline">Batal</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((c) => (
          <div key={c.id} className="card overflow-hidden" data-testid={`course-card-${c.id}`}>
            <img src={c.thumbnail || THUMBS[0]} alt="" className="w-full h-40 object-cover" />
            <div className="p-5">
              <h3 className="text-lg font-semibold">{c.title}</h3>
              <p className="text-sm text-[#666] mt-1 line-clamp-2">{c.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="chip"><BookOpen size={12} className="mr-1" /> {c.module_count} materi</span>
                <span className="chip chip-primary">{c.student_count} peserta</span>
                {c.instructor_name && <span className="chip chip-accent">{c.instructor_name}</span>}
              </div>
              <div className="flex gap-2 mt-4">
                <Link to={`/course/${c.id}/manage`} className="btn btn-primary text-sm">Kelola Materi</Link>
                {canEdit && <>
                  <button onClick={() => startEdit(c)} className="btn btn-outline text-sm p-2" data-testid={`edit-course-${c.id}`}><Edit3 size={14} /></button>
                  <button onClick={() => remove(c.id)} className="btn btn-outline text-sm p-2" data-testid={`delete-course-${c.id}`}><Trash2 size={14} /></button>
                </>}
              </div>
            </div>
          </div>
        ))}
        {courses.length === 0 && <div className="card p-10 text-center text-[#666] md:col-span-3">Belum ada course.</div>}
      </div>
    </Shell>
  );
}
