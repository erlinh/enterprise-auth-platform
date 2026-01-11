import { useState } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from './authConfig';

const APP_NAME = '⚙️ SETTINGS';

function App() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true,
  });
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');

  console.log(`${APP_NAME}: Render - isAuthenticated:`, isAuthenticated, 'accounts:', accounts.length, 'inProgress:', inProgress);

  const handleLogin = () => {
    console.log(`${APP_NAME}: Login clicked`);
    instance.loginRedirect({
      ...loginRequest,
      prompt: 'none',
    }).catch((error) => {
      console.log(`${APP_NAME}: Silent login failed, trying interactive:`, error.errorCode);
      if (error.errorCode === 'login_required' || error.errorCode === 'interaction_required') {
        instance.loginRedirect(loginRequest);
      }
    });
  };

  const handleLogout = async () => {
    console.log(`${APP_NAME}: Logout clicked`);
    sessionStorage.removeItem('sso-tried');
    await instance.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:3003',
    });
  };

  const user = accounts[0];

  if (inProgress === InteractionStatus.Login || inProgress === InteractionStatus.Logout) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Processing authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-card">
          <span className="app-icon">⚙️</span>
          <h1>Settings</h1>
          <p>Sign in to manage your preferences</p>
          <button onClick={handleLogin} className="btn btn-login">
            Sign In with Microsoft
          </button>
          <a href="http://localhost:3000" className="back-link">← Back to Catalogue</a>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚙️</span>
            <h1>Settings</h1>
          </div>
          <nav className="nav">
            <a href="http://localhost:3000" className="nav-link">Catalogue</a>
            <a href="http://localhost:3001" className="nav-link">Dashboard</a>
            <a href="http://localhost:3002" className="nav-link">Reports</a>
          </nav>
          <div className="auth-section">
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0) || user?.username?.charAt(0) || '?'}
              </div>
              <span className="user-name">{user?.name || 'User'}</span>
              <button onClick={handleLogout} className="btn btn-logout">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="page-header">
          <h2>Account Settings</h2>
          <p>Manage your preferences and account details</p>
        </section>

        <div className="settings-grid">
          <section className="settings-card">
            <h3>Profile Information</h3>
            <div className="profile-info">
              <div className="profile-avatar">
                {user?.name?.charAt(0) || '?'}
              </div>
              <div className="profile-details">
                <div className="form-group">
                  <label>Display Name</label>
                  <input type="text" value={user?.name || ''} readOnly />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={user?.username || ''} readOnly />
                </div>
                <p className="info-text">Profile information is managed by your organization through Microsoft Entra ID</p>
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h3>Notifications</h3>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Email Notifications</span>
                  <span className="setting-desc">Receive updates via email</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Push Notifications</span>
                  <span className="setting-desc">Browser push notifications</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Weekly Digest</span>
                  <span className="setting-desc">Weekly summary email</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notifications.weekly}
                    onChange={(e) => setNotifications({ ...notifications, weekly: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h3>Preferences</h3>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Theme</span>
                  <span className="setting-desc">Choose your preferred theme</span>
                </div>
                <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Language</span>
                  <span className="setting-desc">Select display language</span>
                </div>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </section>

          <section className="settings-card">
            <h3>Security</h3>
            <div className="security-info">
              <div className="security-item">
                <span className="security-icon">🔐</span>
                <div>
                  <span className="setting-label">Single Sign-On</span>
                  <span className="setting-desc">Authenticated via Microsoft Entra ID</span>
                </div>
                <span className="status-badge active">Active</span>
              </div>
              <div className="security-item">
                <span className="security-icon">🛡️</span>
                <div>
                  <span className="setting-label">Session Status</span>
                  <span className="setting-desc">Current session is valid across all apps</span>
                </div>
                <span className="status-badge active">Valid</span>
              </div>
            </div>
          </section>
        </div>

        <div className="sso-badge">
          <span>🔐</span> SSO Active — Signed in across all enterprise apps
        </div>
      </main>
    </div>
  );
}

export default App;
