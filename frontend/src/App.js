import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/auth';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Programs from './pages/Programs';
import Courses from './pages/Courses';
import CourseManage from './pages/CourseManage';
import BrowseCourses from './pages/BrowseCourses';
import CoursePlayer from './pages/CoursePlayer';
import Grading from './pages/Grading';
import Cohort from './pages/Cohort';
import Users from './pages/Users';
import MyCourses from './pages/MyCourses';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] text-[#666]">Memuat sesi…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />

            {/* Admin & Donor */}
            <Route path="/programs" element={<Protected roles={['admin', 'donor']}><Programs /></Protected>} />
            <Route path="/users" element={<Protected roles={['admin']}><Users /></Protected>} />

            {/* Admin & Instructor */}
            <Route path="/courses" element={<Protected roles={['admin', 'instructor']}><Courses /></Protected>} />
            <Route path="/course/:id/manage" element={<Protected roles={['admin', 'instructor']}><CourseManage /></Protected>} />
            <Route path="/grading" element={<Protected roles={['admin', 'instructor']}><Grading /></Protected>} />
            <Route path="/cohort" element={<Protected roles={['admin', 'instructor']}><Cohort /></Protected>} />

            {/* Student */}
            <Route path="/browse" element={<Protected roles={['student']}><BrowseCourses /></Protected>} />
            <Route path="/my-courses" element={<Protected roles={['student']}><MyCourses /></Protected>} />
            <Route path="/course/:id" element={<Protected roles={['student']}><CoursePlayer /></Protected>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
