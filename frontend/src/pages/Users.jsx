import React, { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { api } from '../lib/api';
import { ROLE_LABEL } from '../lib/constants';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    const q = filter ? `?role=${filter}` : '';
    api.get(`/users${q}`).then((r) => setUsers(r.data));
  }, [filter]);

  return (
    <Shell>
      <h2 className="text-3xl font-semibold">Pengguna</h2>
      <p className="text-[#666] mt-1 mb-6">Semua akun terdaftar di platform.</p>

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
    </Shell>
  );
}
