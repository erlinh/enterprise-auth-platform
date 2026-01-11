import { useEffect, useState } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { useAuth } from './auth/useAuth';
import { loginRequest } from './auth/msalConfig';
import './App.css';

interface Permission {
  permission: string;
  allowed: boolean;
}

interface AuthzResponse {
  permissions: Permission[];
}

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress } = useMsal();
  const { user, logout, getAccessToken } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ exp?: number; iat?: number; aud?: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated && inProgress === 'none') {
      instance.loginRedirect(loginRequest);
    }
  }, [isAuthenticated, inProgress, instance]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPermissions();
      fetchTokenInfo();
    }
  }, [isAuthenticated, user]);

  const fetchTokenInfo = async () => {
    const token = await getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTokenInfo({
          exp: payload.exp,
          iat: payload.iat,
          aud: payload.aud,
        });
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }
  };

  const fetchPermissions = async () => {
    if (!user) return;
    setLoadingPermissions(true);
    
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/authz/bulk-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          checks: [
            { resourceType: 'reporting_scope', resourceId: '*', permission: 'view', subjectType: 'user', subjectId: user.id },
            { resourceType: 'reporting_scope', resourceId: '*', permission: 'manage', subjectType: 'user', subjectId: user.id },
            { resourceType: 'reporting_endpoint', resourceId: '*', permission: 'call', subjectType: 'user', subjectId: user.id },
            { resourceType: 'reporting_endpoint', resourceId: '*', permission: 'manage', subjectType: 'user', subjectId: user.id },
          ],
        }),
      });
      
      if (response.ok) {
        const data: AuthzResponse = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  if (inProgress !== 'none') {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Authenticating via SSO...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">📡</span>
            <span className="logo-text">Reporting API</span>
          </div>
          <span className="badge">Developer</span>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn-logout" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="main">
        <div className="hero">
          <h1>Welcome to Reporting API</h1>
          <p>RESTful APIs for enterprise data reporting and integration</p>
        </div>

        <div className="cards-grid">
          {/* SSO Info Card */}
          <div className="card sso-card">
            <div className="card-header">
              <span className="card-icon">🔐</span>
              <h2>SSO Authentication</h2>
            </div>
            <div className="card-body">
              <div className="info-row">
                <span className="label">Status</span>
                <span className="value success">
                  <span className="dot"></span>
                  Authenticated
                </span>
              </div>
              <div className="info-row">
                <span className="label">Provider</span>
                <span className="value">Microsoft Entra ID</span>
              </div>
              <div className="info-row">
                <span className="label">Session Started</span>
                <span className="value">{formatTime(tokenInfo?.iat)}</span>
              </div>
              <div className="info-row">
                <span className="label">Session Expires</span>
                <span className="value">{formatTime(tokenInfo?.exp)}</span>
              </div>
            </div>
          </div>

          {/* User Info Card */}
          <div className="card user-card">
            <div className="card-header">
              <span className="card-icon">👤</span>
              <h2>User Identity</h2>
            </div>
            <div className="card-body">
              <div className="info-row">
                <span className="label">Name</span>
                <span className="value">{user?.name}</span>
              </div>
              <div className="info-row">
                <span className="label">Email</span>
                <span className="value">{user?.email}</span>
              </div>
              <div className="info-row">
                <span className="label">Object ID</span>
                <span className="value mono">{user?.id}</span>
              </div>
              <div className="info-row">
                <span className="label">Tenant ID</span>
                <span className="value mono">{user?.tenantId}</span>
              </div>
            </div>
          </div>

          {/* Permissions Card */}
          <div className="card permissions-card">
            <div className="card-header">
              <span className="card-icon">🛡️</span>
              <h2>SpiceDB Permissions</h2>
              <button className="btn-refresh" onClick={fetchPermissions} disabled={loadingPermissions}>
                {loadingPermissions ? '⏳' : '🔄'}
              </button>
            </div>
            <div className="card-body">
              {loadingPermissions ? (
                <div className="loading-mini">Loading permissions...</div>
              ) : permissions.length > 0 ? (
                <div className="permissions-list">
                  {permissions.map((p, i) => (
                    <div key={i} className={`permission-item ${p.allowed ? 'allowed' : 'denied'}`}>
                      <span className="permission-icon">{p.allowed ? '✅' : '❌'}</span>
                      <span className="permission-name">{p.permission}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-permissions">
                  <p>No specific permissions found.</p>
                  <p className="hint">Permissions are managed via SpiceDB relationships.</p>
                </div>
              )}
            </div>
          </div>

          {/* API Endpoints */}
          <div className="card api-card">
            <div className="card-header">
              <span className="card-icon">🔌</span>
              <h2>Available Endpoints</h2>
            </div>
            <div className="card-body">
              <div className="endpoint-list">
                <div className="endpoint-item">
                  <span className="method get">GET</span>
                  <code>/api/reports</code>
                  <span className="endpoint-desc">List all reports</span>
                </div>
                <div className="endpoint-item">
                  <span className="method post">POST</span>
                  <code>/api/reports</code>
                  <span className="endpoint-desc">Create new report</span>
                </div>
                <div className="endpoint-item">
                  <span className="method get">GET</span>
                  <code>/api/reports/:id</code>
                  <span className="endpoint-desc">Get report by ID</span>
                </div>
                <div className="endpoint-item">
                  <span className="method delete">DELETE</span>
                  <code>/api/reports/:id</code>
                  <span className="endpoint-desc">Delete a report</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Catalogue */}
        <div className="back-section">
          <a href="http://localhost:3000" className="btn-back">
            ← Back to Product Catalogue
          </a>
        </div>
      </main>

      <footer className="footer">
        <p>Reporting API v1.0 | Enterprise Auth Platform Demo</p>
      </footer>
    </div>
  );
}

export default App;
