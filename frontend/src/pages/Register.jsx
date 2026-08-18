import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const ROLES = [
  { value: 'student', label: 'Student', desc: 'Ikuti kursus & kumpulkan tugas' },
  { value: 'instructor', label: 'Instruktur', desc: 'Susun kurikulum & nilai peserta' },
  { value: 'donor', label: 'Donor', desc: 'Pantau capaian program' },
];

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await register(form);
    setBusy(false);
    if (r.ok) {
      toast.success(`Akun ${r.user.role} berhasil dibuat`);
      nav('/dashboard');
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:block">
        <img
          src="https://images.pexels.com/photos/15119089/pexels-photo-15119089.jpeg"
          alt="Learning"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-white">
          <p className="text-sm uppercase tracking-widest opacity-80">Gabung Sekarang</p>
          <h1 className="text-4xl font-bold mt-3 max-w-md">Setiap peran punya dampak.</h1>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 md:p-12 bg-[#F5F5F0]">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="register-form">
          <p className="label">Daftar</p>
          <h2 className="text-3xl font-semibold mt-1 mb-6">Pilih peran Anda</h2>

          <div className="grid grid-cols-1 gap-2 mb-6">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                  form.role === r.value ? 'border-[#1A4D2E] bg-white' : 'border-[#E5E5E0] bg-white/60'
                }`}
                data-testid={`register-role-${r.value}`}
              >
                <input
                  type="radio"
                  name="role"
                  className="accent-[#1A4D2E]"
                  checked={form.role === r.value}
                  onChange={() => setForm({ ...form, role: r.value })}
                />
                <div>
                  <div className="font-semibold">{r.label}</div>
                  <div className="text-xs text-[#666]">{r.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <label className="label">Nama Lengkap</label>
          <input
            data-testid="register-name"
            className="input mt-1 mb-3"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <label className="label">Email</label>
          <input
            data-testid="register-email"
            type="email"
            className="input mt-1 mb-3"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <label className="label">Kata Sandi (min 6 karakter)</label>
          <input
            data-testid="register-password"
            type="password"
            className="input mt-1 mb-6"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <button data-testid="register-submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? 'Memproses…' : 'Buat Akun'}
          </button>

          <p className="text-sm mt-6 text-[#666]">
            Sudah punya akun?{' '}
            <Link to="/login" className="link" data-testid="register-to-login">
              Masuk
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
