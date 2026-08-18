import React, { useEffect, useState, useRef } from 'react';
import Shell from '../components/Shell';
import { api, formatApiError } from '../lib/api';
import { ROLE_LABEL } from '../lib/constants';
import { toast } from 'sonner';
import { Upload, Download, X, FileText } from 'lucide-react';

function ImportDialog({ onClose, onImported }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/courses').then((r) => setCourses(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Pilih file CSV terlebih dahulu'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (courseId) fd.append('course_id', courseId);
      const r = await api.post('/users/import-csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(r.data);
      toast.success(`${r.data.created_count} student berhasil diimport`);
      onImported();
    } catch (err) { toast.error(formatApiError(err)); }
    setLoading(false);
  };

  const downloadResults = () => {
    const rows = [['name', 'email', 'password', 'enrolled'],
      ...result.created.map((c) => [c.name, c.email, c.password || '(dari CSV)', c.enrolled ? 'ya' : 'tidak'])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'hasil-import-student.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csv = 'name,email,password\nBudi Santoso,budi@example.com,\nSiti Aminah,siti@example.com,rahasia123\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'template-import-student.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="import-csv-dialog">
      <div className="card p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Import Student via CSV</h3>
          <button onClick={onClose} className="text-[#666] hover:text-black" data-testid="close-import-dialog"><X size={20} /></button>
        </div>

        {!result ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="text-sm text-[#666] bg-[#F5F5F0] rounded-lg p-4">
              <p className="font-medium text-[#333] mb-1">Format CSV: kolom <code>name</code>, <code>email</code>, <code>password</code> (opsional)</p>
              <p>Jika password kosong, sistem akan generate otomatis dan menampilkannya setelah import.</p>
              <button type="button" onClick={downloadTemplate} className="text-[#1A4D2E] font-medium underline mt-2 flex items-center gap-1" data-testid="download-template-btn">
                <Download size={14} /> Download template CSV
              </button>
            </div>
            <div>
              <label className="label">File CSV</label>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="input mt-1"
                onChange={(e) => setFile(e.target.files[0])} data-testid="csv-file-input" />
            </div>
            <div>
              <label className="label">Langsung enroll ke course (opsional)</label>
              <select className="input mt-1" value={courseId} onChange={(e) => setCourseId(e.target.value)} data-testid="import-course-select">
                <option value="">— Tanpa enroll —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button disabled={loading} className="btn btn-primary flex items-center gap-2" data-testid="import-submit-btn">
                <Upload size={16} /> {loading ? 'Mengimport…' : 'Import'}
              </button>
              <button type="button" onClick={onClose} className="btn btn-outline">Batal</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4" data-testid="import-result">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#EAF3ED] rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-[#1A4D2E]" data-testid="import-created-count">{result.created_count}</p>
                <p className="text-sm text-[#666]">Berhasil dibuat</p>
              </div>
              <div className="bg-[#FDF0EA] rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-[#E86A33]" data-testid="import-skipped-count">{result.skipped_count}</p>
                <p className="text-sm text-[#666]">Dilewati</p>
              </div>
            </div>
            {result.enrolled_course && (
              <p className="text-sm text-[#666]">Semua student baru di-enroll ke: <strong>{result.enrolled_course}</strong></p>
            )}
            {result.created.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">Akun dibuat (simpan password sebelum menutup!)</p>
                  <button onClick={downloadResults} className="btn btn-outline text-sm flex items-center gap-1" data-testid="download-results-btn">
                    <Download size={14} /> Download hasil
                  </button>
                </div>
                <div className="overflow-x-auto border border-[#E5E5E0] rounded-lg">
                  <table className="table">
                    <thead><tr><th>Nama</th><th>Email</th><th>Password</th></tr></thead>
                    <tbody>
                      {result.created.map((c) => (
                        <tr key={c.email}>
                          <td>{c.name}</td>
                          <td>{c.email}</td>
                          <td className="font-mono text-sm">{c.password || <span className="text-[#999]">(dari CSV)</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {result.skipped.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2 text-[#E86A33]">Baris dilewati</p>
                <div className="overflow-x-auto border border-[#E5E5E0] rounded-lg">
                  <table className="table">
                    <thead><tr><th>Baris</th><th>Email</th><th>Alasan</th></tr></thead>
                    <tbody>
                      {result.skipped.map((s, i) => (
                        <tr key={i}><td>{s.row}</td><td>{s.email}</td><td>{s.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <button onClick={onClose} className="btn btn-primary" data-testid="close-result-btn">Selesai</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [showImport, setShowImport] = useState(false);

  const load = () => {
    const q = filter ? `?role=${filter}` : '';
    api.get(`/users${q}`).then((r) => setUsers(r.data));
  };
  useEffect(() => { load(); }, [filter]);

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-semibold">Pengguna</h2>
          <p className="text-[#666] mt-1">Semua akun terdaftar di platform.</p>
        </div>
        <button onClick={() => setShowImport(true)} className="btn btn-primary flex items-center gap-2" data-testid="import-csv-btn">
          <FileText size={16} /> Import CSV Student
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'admin', 'donor', 'instructor', 'student'].map((r) => (
          <button key={r || 'all'} onClick={() => setFilter(r)}
            className={`btn text-sm ${filter === r ? 'btn-primary' : 'btn-outline'}`}>
            {r ? ROLE_LABEL[r] : 'Semua'}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Tanggal Dibuat</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td><span className="chip chip-primary">{ROLE_LABEL[u.role]}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && <ImportDialog onClose={() => setShowImport(false)} onImported={load} />}
    </Shell>
  );
}
