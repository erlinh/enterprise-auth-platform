import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { setTokenProvider } from './api/client';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RelationshipsPage from './pages/RelationshipsPage';
import PermissionCheckerPage from './pages/PermissionCheckerPage';

function App() {
  const { isAuthenticated, isLoading, getAccessToken } = useAuth();

  useEffect(() => {
    setTokenProvider(getAccessToken);
  }, [getAccessToken]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/relationships" element={<RelationshipsPage />} />
        <Route path="/permissions" element={<PermissionCheckerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    </div>
  );
}

export default App;

