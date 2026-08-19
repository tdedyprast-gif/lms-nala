import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ROLE_LABEL } from '../lib/constants';
import {
  LayoutDashboard, GraduationCap, BookOpen, ClipboardCheck,
  Users, Target, LogOut, HeartHandshake, BarChart3
} from 'lucide-react';

const NAV = {
  admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/programs', icon: Target, label: 'Program & Donor' },
    { to: '/courses', icon: BookOpen, label: 'Course' },
    { to: '/users', icon: Users, label: 'Pengguna' },
  ],
  donor: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/programs', icon: HeartHandshake, label: 'Program Saya' },
  ],
  instructor: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'Course Saya' },
    { to: '/grading', icon: ClipboardCheck, label: 'Penilaian' },
    { to: '/cohort', icon: BarChart3, label: 'Cohort' },
  ],
  student: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/browse', icon: BookOpen, label: 'Katalog Course' },
    { to: '/my-courses', icon: GraduationCap, label: 'Kursus Saya' },
  ],
};

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = NAV[user?.role] || [];

  return (
    <div className="min-h-screen flex bg-[#F5F5F0]">
      <aside className="hidden md:flex md:flex-col w-64 border-r border-[#E5E5E0] bg-white p-6" data-testid="sidebar">
        <div className="mb-10">
          <p className="label text-[#4F6F52]">Circlo</p>
          <h1 className="text-xl font-bold mt-1">EmpowerLearn</h1>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                data-testid={`nav-${it.to.replace('/', '') || 'dashboard'}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${isActive ? 'bg-[#E9F1EC] text-[#1A4D2E]' : 'text-[#1A1A1A] hover:bg-[#F5F5F0]'
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} />
                {it.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-[#E5E5E0]">
          <div className="mb-3">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-[#666] truncate">{user?.email}</p>
            <span className="chip chip-primary mt-2 inline-flex">{ROLE_LABEL[user?.role]}</span>
          </div>
          <button
            data-testid="logout-btn"
            onClick={() => { logout(); nav('/login'); }}
            className="btn btn-outline w-full flex items-center justify-center gap-2 text-sm"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#E5E5E0]">
          <h1 className="font-bold">EmpowerLearn</h1>
          <button onClick={() => { logout(); nav('/login'); }} className="chip">Keluar</button>
        </div>
        <div className="p-6 md:p-10">{children}</div>
      </main>
    </div>
  );
}
