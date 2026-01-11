import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, useSsoSync } from '@platform/shared-auth';
import { loginRequest, apiRequest, CATALOGUE_URL, APP_NAME } from './auth/config';
import { setTokenProvider } from './api/client';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CataloguePage from './pages/CataloguePage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import LaunchPage from './pages/LaunchPage';

function App() {
  // Log on mount for debugging
  useEffect(() => {
    console.log('[Catalogue App] Mounted with URL:', window.location.href);
    console.log('[Catalogue App] Query params:', window.location.search);
    console.log('[Catalogue App] localStorage msal keys:', Object.keys(localStorage).filter(k => k.startsWith('msal.')));
  }, []);

  const { isAuthenticated, isLoading, getAccessToken } = useAuth({
    loginRequest,
    apiRequest,
    catalogueUrl: CATALOGUE_URL,
    appName: APP_NAME,
    isCatalogue: true,
  });

  // Log auth state changes
  useEffect(() => {
    console.log('[Catalogue App] Auth state changed:', { isAuthenticated, isLoading });
  }, [isAuthenticated, isLoading]);

  // Sync SSO state - this is the catalogue, so isCatalogue=true
  useSsoSync({
    isAuthenticated,
    isLoading,
    loginRequest,
    catalogueUrl: CATALOGUE_URL,
    appName: APP_NAME,
    isCatalogue: true,
  });

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
    <Routes>
      <Route path="/launch/:id" element={<LaunchPage />} />
      <Route path="*" element={
        <Layout>
          <Routes>
            <Route path="/" element={<CataloguePage />} />
            <Route path="/app/:id" element={<ApplicationDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
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
