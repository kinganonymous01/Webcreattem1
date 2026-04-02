import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useWebSocket } from './context/WebSocketContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import TestPage from './pages/TestPage';
import * as authApi from './api/authApi';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const { initWS, closeWS } = useWebSocket();

  async function handleLoginSuccess() {
    setIsAuthenticated(true);
    initWS();
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    closeWS();
    setIsAuthenticated(false);
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to="/dashboard" replace />
            : <AuthPage onSuccess={handleLoginSuccess} />
        }
      />
      <Route
        path="/dashboard"
        element={
          isAuthenticated
            ? <DashboardPage onLogout={handleLogout} />
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/project/:id"
        element={
          isAuthenticated
            ? <ProjectPage />
            : <Navigate to="/" replace />
        }
      />
      <Route path="/test" element={<TestPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
