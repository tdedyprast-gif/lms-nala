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
      <div className="relative hidden md:block">
        <video
          src="/circlo.mp4"
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-white">
          <p className="text-sm uppercase tracking-widest opacity-80">Gabung Sekarang</p>
          <h1 className="text-4xl font-bold mt-3 max-w-md">Setiap peran punya dampak.</h1>
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
              Daftar
            </Link>
          </p>

        </form>
      </div>
    </div>
  );
}
