import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { Plus, Trash2, Edit3 } from 'lucide-react';

export default function Programs() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [donors, setDonors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', donor_id: '', target_beneficiaries: 0, status: 'active' });

  const load = async () => {
    const r = await api.get('/programs');
    setPrograms(r.data);
    if (user.role === 'admin') {
      const u = await api.get('/users?role=donor');
      setDonors(u.data);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, target_beneficiaries: Number(form.target_beneficiaries), donor_id: form.donor_id || null };
      if (editing) await api.patch(`/programs/${editing}`, payload);
      else await api.post('/programs', payload);
      setShowForm(false); setEditing(null);
      setForm({ title: '', description: '', donor_id: '', target_beneficiaries: 0, status: 'active' });
      toast.success('Tersimpan');
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const remove = async (id) => {
    if (!window.confirm('Hapus program?')) return;
    await api.delete(`/programs/${id}`);
    toast.success('Terhapus');
    load();
  };

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({
      title: p.title, description: p.description, donor_id: p.donor_id || '',
      target_beneficiaries: p.target_beneficiaries || 0, status: p.status,
    });
    setShowForm(true);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Shell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-semibold">Program {isAdmin ? '& Donor Mapping' : 'Saya'}</h2>
          <p className="text-[#666] mt-1">{isAdmin ? 'Pemetaan program donor → course.' : 'Pantau progres program yang Anda danai.'}</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ title: '', description: '', donor_id: '', target_beneficiaries: 0, status: 'active' }); }}
            className="btn btn-primary flex items-center gap-2" data-testid="new-program-btn">
            <Plus size={16} /> Program Baru
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-6 mb-8 space-y-4" data-testid="program-form">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nama Program</label>
              <input required className="input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="program-title" />
            </div>
            <div>
              <label className="label">Donor (opsional)</label>
              <select className="input mt-1" value={form.donor_id} onChange={(e) => setForm({ ...form, donor_id: e.target.value })} data-testid="program-donor">
                <option value="">— Tanpa Donor —</option>
                {donors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.email})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Deskripsi / Sasaran Kegiatan</label>
            <textarea rows={3} className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="program-description" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Target Beneficiary</label>
              <input type="number" className="input mt-1" value={form.target_beneficiaries} onChange={(e) => setForm({ ...form, target_beneficiaries: e.target.value })} data-testid="program-target" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="active">Aktif</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-primary" data-testid="program-save">{editing ? 'Update' : 'Simpan'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn btn-outline">Batal</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programs.map((p) => (
          <div key={p.id} className="card p-6" data-testid={`program-card-${p.id}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="text-sm text-[#666] mt-1">{p.description}</p>
              </div>
              <span className="chip chip-primary">{p.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div><p className="label">Target</p><p className="font-semibold">{p.target_beneficiaries}</p></div>
              <div><p className="label">Peserta</p><p className="font-semibold">{p.enrolled_students}</p></div>
              <div><p className="label">Course</p><p className="font-semibold">{p.course_count}</p></div>
            </div>
            {isAdmin && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-[#E5E5E0]">
                <button onClick={() => startEdit(p)} className="btn btn-outline text-sm flex items-center gap-1" data-testid={`edit-program-${p.id}`}><Edit3 size={14} /> Edit</button>
                <button onClick={() => remove(p.id)} className="btn btn-outline text-sm flex items-center gap-1" data-testid={`delete-program-${p.id}`}><Trash2 size={14} /> Hapus</button>
              </div>
            )}
          </div>
        ))}
        {programs.length === 0 && <div className="card p-10 text-center text-[#666] md:col-span-2">Belum ada program.</div>}
      </div>
    </Shell>
  );
}
