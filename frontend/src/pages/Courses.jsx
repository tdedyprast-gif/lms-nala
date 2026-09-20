import React, { useEffect, useState, useRef } from 'react';
import Shell from '../components/Shell';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit3, BookOpen, Upload, X } from 'lucide-react';

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi di sisi client
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5 MB');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload/thumbnail', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, thumbnail: res.data.url }));
      toast.success('Thumbnail berhasil diunggah');
    } catch (err) {
      toast.error(formatApiError(err));
    }
    setUploading(false);
    // Reset input agar bisa upload file yang sama lagi
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isCustomThumb = form.thumbnail && !THUMBS.includes(form.thumbnail);

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
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {THUMBS.map((t) => (
                <button type="button" key={t} onClick={() => setForm({ ...form, thumbnail: t })}
                  className={`w-24 h-16 rounded-md overflow-hidden border-2 transition-all ${form.thumbnail === t ? 'border-[#1A4D2E] ring-2 ring-[#1A4D2E]/30' : 'border-transparent hover:border-[#ccc]'}`}>
                  <img src={t} alt="" className="w-full h-full object-cover" />
                </button>
              ))}

              {/* Custom uploaded thumbnail preview */}
              {isCustomThumb && (
                <div className="relative">
                  <div className="w-24 h-16 rounded-md overflow-hidden border-2 border-[#1A4D2E] ring-2 ring-[#1A4D2E]/30">
                    <img src={form.thumbnail} alt="Custom" className="w-full h-full object-cover" />
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, thumbnail: THUMBS[0] })}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Hapus thumbnail custom">
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Upload button */}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className={`w-24 h-16 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all
                  ${uploading ? 'border-[#ccc] bg-gray-50 cursor-wait' : 'border-[#bbb] hover:border-[#1A4D2E] hover:bg-[#f0faf4] cursor-pointer'}`}
                title="Upload gambar custom">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-[#1A4D2E] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={16} className="text-[#888]" />
                    <span className="text-[10px] text-[#888] leading-tight">Upload</span>
                  </>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden" onChange={handleFileUpload} data-testid="thumbnail-upload" />
            </div>
            <p className="text-xs text-[#999] mt-1">Format: JPG, PNG, GIF, WebP. Maksimal 5 MB.</p>
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
