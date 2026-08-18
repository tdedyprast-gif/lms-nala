import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ROLE_LABEL } from '../lib/constants';
import { toast } from 'sonner';

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await login(email, password);
    setBusy(false);
    if (r.ok) {
      toast.success(`Selamat datang, ${r.user.name}`);
      nav('/dashboard');
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:block" data-testid="login-hero">
        <img
          src="https://images.pexels.com/photos/35552523/pexels-photo-35552523.jpeg"
          alt="Community"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-white">
          <p className="text-sm uppercase tracking-widest opacity-80">LMS Pemberdayaan</p>
          <h1 className="text-4xl font-bold mt-3 max-w-md">Belajar, bertumbuh, memberdayakan.</h1>
          <p className="mt-4 max-w-md opacity-90">
            Platform pembelajaran berbasis program donor untuk sasaran komunitas nyata.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 md:p-12 bg-[#F5F5F0]">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="login-form">
          <p className="label">Masuk</p>
          <h2 className="text-3xl font-semibold mt-1 mb-8">Akses ruang belajar Anda</h2>

          <label className="label">Email</label>
          <input
            data-testid="login-email"
            type="email"
            className="input mt-1 mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="label">Kata Sandi</label>
          <input
            data-testid="login-password"
            type="password"
            className="input mt-1 mb-6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            data-testid="login-submit"
            type="submit"
            disabled={busy}
            className="btn btn-primary w-full"
          >
            {busy ? 'Memproses…' : 'Masuk'}
          </button>

          <p className="text-sm mt-6 text-[#666]">
            Belum punya akun?{' '}
            <Link to="/register" className="link" data-testid="login-to-register">
              Daftar sebagai {ROLE_LABEL.student}/{ROLE_LABEL.instructor}/{ROLE_LABEL.donor}
            </Link>
          </p>

          <div className="mt-8 p-4 rounded-lg border border-[#E5E5E0] bg-white text-xs text-[#666]">
            <p className="font-semibold text-[#1A1A1A] mb-1">Akun Demo Admin</p>
            <p>Email: <span className="font-mono">admin@lms.id</span></p>
            <p>Password: <span className="font-mono">Admin123!</span></p>
          </div>
        </form>
      </div>
    </div>
  );
}
